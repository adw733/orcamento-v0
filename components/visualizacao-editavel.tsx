"use client"

import type { Orcamento, DadosEmpresa, ItemOrcamento, Cliente, Produto } from "@/types/types"
import React, { useState, useRef, useEffect, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, Trash2, Upload, Search, Calendar as CalendarIcon, Check, Eye, Edit3, FileDown, Save, AlertCircle, Copy, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { pdf } from '@react-pdf/renderer'
import { PDFOrcamento } from './pdf-orcamento'
import { PDFTodasFichasTecnicas } from './pdf-ficha-tecnica'
import { supabase } from "@/lib/supabase"
import { type TipoTamanho, tipoTamanhoService } from "@/lib/services-materiais"

// Opções predefinidas para artes
const POSICOES_ARTE = [
  "PEITO",
  "PEITO ESQUERDO",
  "PEITO DIREITO",
  "MANGA ESQUERDA",
  "MANGA DIREITA",
  "COSTAS",
  "BOLSO ESQUERDO",
  "BOLSO DIREITO"
] as const

const TIPOS_ARTE = [
  "SILK",
  "DTF",
  "BORDADO",
  "TRANSFER",
  "SUBLIMAÇÃO"
] as const

interface VisualizacaoEditavelProps {
  orcamento: Orcamento
  setOrcamento: (orcamento: Orcamento) => void
  dadosEmpresa?: DadosEmpresa
  setDadosEmpresa?: (dados: DadosEmpresa) => void
  calcularTotal: () => number
  modoExportacao?: "orcamento" | "ficha" | "completo"
  clientes: Cliente[]
  produtos: Produto[]
  onSave: () => void
  onCopy?: () => void
  exportarOrcamento?: (id: string, tipo: "orcamento" | "ficha") => Promise<void>
  temAlteracoes?: boolean
  mostrarBarraBotoes?: boolean
  modoEdicaoExterno?: boolean
}

// Componentes de input FORA do componente principal para evitar recriação
const InputTransparente = memo(({ className, onChange, value, type, ...props }: React.ComponentProps<typeof Input>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Transformar para maiúsculas apenas em campos de texto (não em números)
    if (type !== 'number' && type !== 'date' && onChange) {
      const newValue = e.target.value.toUpperCase()
      e.target.value = newValue
    }
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <Input
      className={cn(
        "bg-transparent border-transparent shadow-none hover:bg-white/20 focus:bg-white/50 focus:border-primary/30 px-1 h-auto py-0 rounded-sm transition-colors uppercase",
        className
      )}
      type={type}
      value={value}
      onChange={handleChange}
      {...props}
    />
  )
})
InputTransparente.displayName = "InputTransparente"

const TextareaTransparente = memo(({ className, onChange, value, ...props }: React.ComponentProps<typeof Textarea>) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resizeTimeoutRef = useRef<number | null>(null)

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    // Ajustar altura inicial e quando o valor muda externamente
    adjustHeight()
  }, [value, adjustHeight])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Transformar para maiúsculas
    const newValue = e.target.value.toUpperCase()
    e.target.value = newValue
    
    // Ajustar altura com requestAnimationFrame para melhor performance
    if (resizeTimeoutRef.current !== null) {
      cancelAnimationFrame(resizeTimeoutRef.current)
    }
    resizeTimeoutRef.current = requestAnimationFrame(() => {
      adjustHeight()
    })
    
    // Chamar onChange original
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <Textarea
      ref={textareaRef}
      className={cn(
        "bg-transparent border-transparent shadow-none hover:bg-white/20 focus:bg-white/50 focus:border-primary/30 px-1 py-0 min-h-[1.5em] resize-none rounded-sm transition-colors overflow-hidden uppercase",
        className
      )}
      value={value}
      onChange={handleChange}
      {...props}
    />
  )
})
TextareaTransparente.displayName = "TextareaTransparente"

export default function VisualizacaoEditavel({
  orcamento,
  setOrcamento,
  dadosEmpresa,
  setDadosEmpresa,
  calcularTotal,
  modoExportacao = "completo",
  clientes,
  produtos,
  onSave,
  onCopy,
  exportarOrcamento,
  temAlteracoes = false,
  mostrarBarraBotoes = true,
  modoEdicaoExterno
}: VisualizacaoEditavelProps) {
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [progressoPDF, setProgressoPDF] = useState(0)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  
  // Refs para manter referências estáveis
  const orcamentoRef = useRef(orcamento)
  const produtosRef = useRef(produtos)
  const setOrcamentoRef = useRef(setOrcamento)
  
  useEffect(() => {
    orcamentoRef.current = orcamento
  }, [orcamento])
  
  useEffect(() => {
    produtosRef.current = produtos
  }, [produtos])
  
  useEffect(() => {
    setOrcamentoRef.current = setOrcamento
  }, [setOrcamento])

  // Estado para controlar modo edição/visualização
  const [modoEdicaoInterno, setModoEdicaoInterno] = useState(true)
  const modoEdicao = modoEdicaoExterno !== undefined ? modoEdicaoExterno : modoEdicaoInterno

  // Estados para selects/autocompletes
  const [openCliente, setOpenCliente] = useState(false)
  const [openProduto, setOpenProduto] = useState<string | null>(null) // ID do item sendo editado
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  
  // Estados para tipos de tamanho
  const [tiposTamanho, setTiposTamanho] = useState<TipoTamanho[]>([])
  
  // Carregar tipos de tamanho ao montar o componente
  useEffect(() => {
    const carregarTiposTamanho = async () => {
      try {
        const tiposData = await tipoTamanhoService.listarTodos()
        setTiposTamanho(tiposData)
      } catch (error) {
        console.error("Erro ao carregar tipos de tamanho:", error)
      }
    }
    carregarTiposTamanho()
  }, [])

  // Funções de atualização - memoizadas com useCallback SEM dependências que mudam
  const updateOrcamentoField = useCallback((field: keyof Orcamento, value: any) => {
    setOrcamentoRef.current({ ...orcamentoRef.current, [field]: value })
  }, [])

  const updateClienteField = useCallback((field: keyof Cliente, value: any) => {
    if (!orcamentoRef.current.cliente) return
    const novoCliente = { ...orcamentoRef.current.cliente, [field]: value }
    setOrcamentoRef.current({ ...orcamentoRef.current, cliente: novoCliente })
  }, [])

  const updateItem = useCallback((itemId: string, field: keyof ItemOrcamento, value: any) => {
    const novosItens = orcamentoRef.current.itens.map(item => {
      if (item.id !== itemId) return item

      // Lógica especial para produto
      if (field === 'produtoId') {
        const produto = produtosRef.current.find(p => p.id === value)
        if (produto) {
          return {
            ...item,
            produtoId: value,
            produto: produto,
            valorUnitario: produto.valorBase,
            // Resetar ou manter outros campos?
            tecidoSelecionado: produto.tecidos[0],
            corSelecionada: produto.cores[0],
            tamanhos: produto.tamanhosDisponiveis.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})
          }
        }
      }

      return { ...item, [field]: value }
    })
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
  }, [])

  const updateTamanho = useCallback((itemId: string, tamanho: string, qtd: number) => {
    const item = orcamentoRef.current.itens.find(i => i.id === itemId)
    if (!item) return
    const novosTamanhos = { ...item.tamanhos, [tamanho]: qtd }
    // Recalcular quantidade total
    const novaQuantidade = Object.values(novosTamanhos).reduce((a, b) => (a as number) + (b as number), 0)

    const novosItens = orcamentoRef.current.itens.map(i => i.id === itemId ? { ...i, tamanhos: novosTamanhos, quantidade: novaQuantidade } : i)
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
  }, [])

  const addItem = useCallback(() => {
    const novoItem: ItemOrcamento = {
      id: crypto.randomUUID(),
      produtoId: "",
      quantidade: 0,
      valorUnitario: 0,
      tamanhos: {},
      estampas: [],
      observacaoComercial: "",
      observacaoTecnica: ""
    }
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: [...orcamentoRef.current.itens, novoItem] })
  }, [])

  const removeItem = useCallback((id: string) => {
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: orcamentoRef.current.itens.filter(i => i.id !== id) })
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          updateItem(itemId, 'imagem', ev.target.result as string)
        }
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const handleImagePaste = (e: React.ClipboardEvent, itemId: string) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Verificar se é uma imagem
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            if (ev.target?.result) {
              updateItem(itemId, 'imagem', ev.target.result as string)
            }
          }
          reader.readAsDataURL(blob)
        }
        break
      }
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && setDadosEmpresa && dadosEmpresa) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setDadosEmpresa({ ...dadosEmpresa, logo_url: ev.target.result as string })
        }
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  // Funções de reordenação dos itens
  const moverItemParaCima = useCallback((index: number) => {
    if (index === 0) return // Já está no topo
    const novosItens = [...orcamentoRef.current.itens]
    const temp = novosItens[index]
    novosItens[index] = novosItens[index - 1]
    novosItens[index - 1] = temp
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
  }, [])

  const moverItemParaBaixo = useCallback((index: number) => {
    if (index === orcamentoRef.current.itens.length - 1) return // Já está no final
    const novosItens = [...orcamentoRef.current.itens]
    const temp = novosItens[index]
    novosItens[index] = novosItens[index + 1]
    novosItens[index + 1] = temp
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
  }, [])

  const moverItemParaPosicao = useCallback((itemId: string, novaPosicao: number) => {
    const indexAtual = orcamentoRef.current.itens.findIndex(i => i.id === itemId)
    if (indexAtual === -1) return

    // Ajustar para índice baseado em 0 (usuário digita 1, 2, 3...)
    const novoIndex = novaPosicao - 1

    if (novoIndex < 0 || novoIndex >= orcamentoRef.current.itens.length || novoIndex === indexAtual) return

    const novosItens = [...orcamentoRef.current.itens]
    const [itemMovido] = novosItens.splice(indexAtual, 1)
    novosItens.splice(novoIndex, 0, itemMovido)
    setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
  }, [])

  // Função para gerar PDF do Orçamento
  const gerarPDFOrcamento = async () => {
    console.log('🎯 INICIANDO GERAÇÃO DE PDF DO ORÇAMENTO')
    setExportandoPDF(true)
    setProgressoPDF(30)
    try {
      console.log('📄 Criando documento PDF...', { orcamento, dadosEmpresa })
      const doc = <PDFOrcamento orcamento={orcamento} dadosEmpresa={dadosEmpresa} calcularTotal={calcularTotal} />
      setProgressoPDF(60)
      
      console.log('🔄 Convertendo para PDF...')
      const asPdf = pdf(doc)
      setProgressoPDF(80)
      
      console.log('💾 Gerando blob...')
      const blob = await asPdf.toBlob()
      console.log('✅ Blob gerado:', blob.size, 'bytes')
      setProgressoPDF(90)
      
      // Criar link de download e forçar download do arquivo
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `orcamento-${orcamento.numero.replace(/\s+/g, '-')}.pdf`
      link.download = fileName
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      console.log('📥 Iniciando download:', fileName)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setProgressoPDF(100)
      console.log('✅ PDF GERADO COM SUCESSO!')
      
      // Feedback de sucesso
      setTimeout(() => {
        alert('✅ PDF do orçamento gerado com sucesso! Verifique sua pasta de Downloads.')
      }, 300)
    } catch (err) {
      console.error('❌ ERRO ao gerar PDF do orçamento:', err)
      console.error('Stack:', (err as Error).stack)
      alert("❌ Erro ao gerar PDF: " + (err as Error).message + "\n\nVerifique o console para mais detalhes.")
    } finally {
      setTimeout(() => {
        setExportandoPDF(false)
        setProgressoPDF(0)
      }, 500)
    }
  }

  // Função para gerar PDF das Fichas Técnicas
  const gerarPDFFichasTecnicas = async () => {
    console.log('🎯 INICIANDO GERAÇÃO DE PDF DAS FICHAS TÉCNICAS')
    setExportandoPDF(true)
    setProgressoPDF(30)
    try {
      console.log('📄 Criando documento PDF das fichas...', { orcamento, dadosEmpresa })
      const doc = <PDFTodasFichasTecnicas orcamento={orcamento} dadosEmpresa={dadosEmpresa} />
      setProgressoPDF(60)
      
      console.log('🔄 Convertendo para PDF...')
      const asPdf = pdf(doc)
      setProgressoPDF(80)
      
      console.log('💾 Gerando blob...')
      const blob = await asPdf.toBlob()
      console.log('✅ Blob gerado:', blob.size, 'bytes')
      setProgressoPDF(90)
      
      // Criar link de download e forçar download do arquivo
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `fichas-tecnicas-${orcamento.numero.replace(/\s+/g, '-')}.pdf`
      link.download = fileName
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      console.log('📥 Iniciando download:', fileName)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setProgressoPDF(100)
      console.log('✅ PDF DAS FICHAS GERADO COM SUCESSO!')
      
      // Feedback de sucesso
      setTimeout(() => {
        alert('✅ PDF das fichas técnicas gerado com sucesso! Verifique sua pasta de Downloads.')
      }, 300)
    } catch (err) {
      console.error('❌ ERRO ao gerar PDF das fichas:', err)
      console.error('Stack:', (err as Error).stack)
      alert("❌ Erro ao gerar PDF: " + (err as Error).message + "\n\nVerifique o console para mais detalhes.")
    } finally {
      setTimeout(() => {
        setExportandoPDF(false)
        setProgressoPDF(0)
      }, 500)
    }
  }

  // Styles do PDF (Idêntico ao original)
  const pdfStyles = `
  @media print {
    @page { size: A4; margin: 8mm; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .pdf-table { font-size: 0.7rem !important; line-height: 1.2 !important; }
    .pdf-table th, .pdf-table td { padding: 0.2rem 0.25rem !important; border: 1px solid #e5e7eb !important; }
    .bg-gradient-to-r { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  `

  return (
    <>
      <style>{pdfStyles}</style>

      {/* Alerta de Edição Ativa - Fixo no topo sem scroll */}
      {modoEdicao && temAlteracoes && (
        <div className="sticky top-0 z-50 bg-yellow-50 border-b border-yellow-200 p-3 flex items-center justify-between print:hidden shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 font-medium">
              Edição ativa - Há alterações não salvas
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            onClick={onSave}
          >
            <Save className="h-3 w-3 mr-1" />
            Salvar
          </Button>
        </div>
      )}

      {/* Barra de Botões - Fixo no topo, abaixo do alerta */}
      {mostrarBarraBotoes && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 p-3 flex flex-wrap gap-2 print:hidden shadow-sm" style={{ top: modoEdicao && temAlteracoes ? '52px' : '0' }}>
          <Button
            onClick={onCopy}
            className="flex items-center gap-1.5 bg-secondary hover:bg-secondary-dark text-white transition-all shadow-sm text-xs px-3 py-2 h-8"
          >
            <Copy className="h-4 w-4" />
            Copiar
          </Button>

          <Button
            onClick={onSave}
            className="flex items-center gap-1.5 bg-success hover:bg-success/80 text-white transition-all shadow-sm text-xs px-3 py-2 h-8"
          >
            <Save className="h-4 w-4" />
            Atualizar
          </Button>

          <Button
            onClick={gerarPDFOrcamento}
            disabled={!orcamento.cliente || orcamento.itens.length === 0 || exportandoPDF}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
          >
            <FileDown className="h-4 w-4" />
            {exportandoPDF && progressoPDF > 0 && progressoPDF < 50 ? 'Gerando...' : 'PDF Orçamento'}
          </Button>

          <Button
            onClick={gerarPDFFichasTecnicas}
            disabled={!orcamento.cliente || orcamento.itens.length === 0 || exportandoPDF}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
          >
            <FileDown className="h-4 w-4" />
            {exportandoPDF && progressoPDF >= 50 ? 'Gerando...' : 'PDF Ficha'}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-8 p-4 font-sans text-gray-800 bg-white max-w-[210mm] mx-auto shadow-2xl my-8 min-h-screen" ref={pdfContainerRef}>

        {/* 1. ORÇAMENTO PRINCIPAL */}
        {(modoExportacao === "completo" || modoExportacao === "orcamento") && (
          <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm orcamento-principal bg-white pdf-section">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-4 pdf-header w-full">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-md shadow-md flex items-center justify-center" style={{ width: '50px', height: '50px' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L4 5v14.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V5l-8-3z" fill="#0f4c81" stroke="#0f4c81" strokeWidth="1.5"/>
                      <path d="M12 6.5c-1.93 0-3.5 1.57-3.5 3.5v1.5h7v-1.5c0-1.93-1.57-3.5-3.5-3.5z" fill="white" stroke="white" strokeWidth="0.5"/>
                      <path d="M12 14.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" fill="white" stroke="white" strokeWidth="0.5"/>
                    </svg>
                  </div>
                  <div>
                    <div>
                      <h1 className="text-xl font-bold text-white font-sans tracking-tight uppercase">
                        ORÇAMENTO - {orcamento.numero.split(" - ")[0]}
                      </h1>
                      <p className="text-white/90 text-sm uppercase">
                        {orcamento.cliente?.nome || "CLIENTE"} - {orcamento.nomeContato || "CONTATO"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dados Empresa (Direita) */}
                <div className="text-right bg-white/10 p-2 rounded-md backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white font-sans tracking-tight">{dadosEmpresa?.nome || "OneBase Uniformes"}</h2>
                  <p className="text-white/80 text-xs">CNPJ: {dadosEmpresa?.cnpj || "57.855.073/0001-82"}</p>
                  <p className="text-white/80 text-xs">{dadosEmpresa?.email || "onebase.store@gmail.com"}</p>
                  <p className="text-white/80 text-xs">{dadosEmpresa?.telefone || "(11) 99541-6072"}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Dados Cliente */}
              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-primary text-base">DADOS DO CLIENTE</h3>
                  {modoEdicao && (
                    <Popover open={openCliente} onOpenChange={setOpenCliente}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-primary"><Search className="w-3 h-3 mr-1" /> Buscar Cliente</Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clientes.map(cliente => (
                                <CommandItem key={cliente.id} onSelect={() => {
                                  setOrcamentoRef.current({ ...orcamentoRef.current, cliente: cliente, nomeContato: cliente.contato || "", telefoneContato: cliente.telefone || "" })
                                  setOpenCliente(false)
                                }}>
                                  {cliente.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {modoEdicao ? (
                  <div className="bg-accent p-2 rounded-md text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <span className="font-medium whitespace-nowrap">Nome:</span>
                      <InputTransparente value={orcamento.cliente?.nome || ""} onChange={e => updateClienteField('nome', e.target.value)} className="font-bold w-full" />
                    </div>
                    <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <span className="font-medium whitespace-nowrap">CNPJ:</span>
                      <InputTransparente value={orcamento.cliente?.cnpj || ""} onChange={e => updateClienteField('cnpj', e.target.value)} className="w-full" />
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <span className="font-medium whitespace-nowrap">Endereço:</span>
                      <InputTransparente value={orcamento.cliente?.endereco || ""} onChange={e => updateClienteField('endereco', e.target.value)} className="w-full" />
                    </div>
                    <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <span className="font-medium whitespace-nowrap">Email:</span>
                      <InputTransparente value={orcamento.cliente?.email || ""} onChange={e => updateClienteField('email', e.target.value)} className="w-full" />
                    </div>
                    <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <span className="font-medium whitespace-nowrap">Telefone:</span>
                      <InputTransparente value={orcamento.cliente?.telefone || ""} onChange={e => updateClienteField('telefone', e.target.value)} className="w-full" />
                    </div>
                    <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <span className="font-medium whitespace-nowrap">Contato:</span>
                      <InputTransparente value={orcamento.nomeContato || ""} onChange={e => updateOrcamentoField('nomeContato', e.target.value)} className="w-full" />
                    </div>
                    <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                      <span className="font-medium whitespace-nowrap">Tel. Contato:</span>
                      <InputTransparente value={orcamento.telefoneContato || ""} onChange={e => updateOrcamentoField('telefoneContato', e.target.value)} className="w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-accent p-2 rounded-md text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                    <p className="col-span-2 md:col-span-1">
                      <span className="font-medium">Nome:</span> {orcamento.cliente?.nome || ""}
                    </p>
                    <p className="col-span-2 md:col-span-1">
                      <span className="font-medium">CNPJ:</span> {orcamento.cliente?.cnpj || ""}
                    </p>
                    <p className="col-span-2">
                      <span className="font-medium">Endereço:</span> {orcamento.cliente?.endereco || ""}
                    </p>
                    <p className="col-span-2 md:col-span-1">
                      <span className="font-medium">Email:</span> {orcamento.cliente?.email || ""}
                    </p>
                    <p className="col-span-2 md:col-span-1">
                      <span className="font-medium">Telefone:</span> {orcamento.cliente?.telefone || ""}
                    </p>
                    <p className="col-span-2 md:col-span-1">
                      <span className="font-medium">Contato:</span> {orcamento.nomeContato || ""}
                    </p>
                    <p className="col-span-2 md:col-span-1">
                      <span className="font-medium">Tel. Contato:</span> {orcamento.telefoneContato || ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Itens */}
              <div className="mb-2">
                <div className="flex justify-between mb-2 items-end">
                  <h3 className="font-bold text-base text-primary">ITENS DO ORÇAMENTO</h3>
                  {modoEdicao ? (
                    <div className="text-xs bg-accent px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      Data: <input type="date" value={orcamento.data} onChange={e => updateOrcamentoField('data', e.target.value)} className="bg-transparent border-none p-0 text-xs w-24" />
                    </div>
                  ) : (
                    <p className="text-xs bg-accent px-2 py-1 rounded-full font-medium">
                      Data: {new Date(orcamento.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>

                <table className="w-full pdf-table text-xs border-collapse">
                  <thead className="bg-primary text-white">
                    <tr>
                      {modoEdicao && <th className="p-2 text-center rounded-tl-md w-[40px] print:hidden"></th>}
                      <th className={cn("p-2 text-center w-[8%]", !modoEdicao && "rounded-tl-md")}>#</th>
                      <th className="p-2 text-left w-[27%]">Produto</th>
                      <th className="p-2 text-left w-[25%]">Tamanhos</th>
                      <th className="p-2 text-center w-[10%]">Qtd.</th>
                      <th className="p-2 text-right w-[13%]">Valor Unit.</th>
                      <th className="p-2 text-right rounded-tr-md w-[17%]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orcamento.itens.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        {modoEdicao && dragOverItemId === item.id && (
                          <tr className="border-t">
                            <td colSpan={7} className="p-0">
                              <div className="h-1 bg-primary animate-pulse rounded-full mx-2"></div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={cn(
                            "border-b",
                            modoEdicao && "hover:bg-gray-50 group relative cursor-move",
                            modoEdicao && dragOverItemId === item.id && "bg-primary/5"
                          )}
                          draggable={modoEdicao}
                          onDragStart={(e) => {
                            if (!modoEdicao) return
                            e.dataTransfer.setData("text/plain", item.id)
                            e.currentTarget.classList.add("opacity-50")
                          }}
                          onDragEnd={(e) => {
                            if (!modoEdicao) return
                            e.currentTarget.classList.remove("opacity-50")
                            setDragOverItemId(null)
                          }}
                          onDragOver={(e) => {
                            if (!modoEdicao) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = "move"
                            if (dragOverItemId !== item.id) {
                              setDragOverItemId(item.id)
                            }
                          }}
                          onDragLeave={(e) => {
                            if (!modoEdicao) return
                            const relatedTarget = e.relatedTarget as Node
                            if (!e.currentTarget.contains(relatedTarget)) {
                              setDragOverItemId(null)
                            }
                          }}
                          onDrop={(e) => {
                            if (!modoEdicao) return
                            e.preventDefault()
                            setDragOverItemId(null)
                            const draggedItemId = e.dataTransfer.getData("text/plain")
                            const draggedIndex = orcamentoRef.current.itens.findIndex((i) => i.id === draggedItemId)
                            const targetIndex = idx

                            if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                              const novosItens = [...orcamentoRef.current.itens]
                              const [itemRemovido] = novosItens.splice(draggedIndex, 1)
                              novosItens.splice(targetIndex, 0, itemRemovido)
                              setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
                            }
                          }}
                        >
                          {modoEdicao && (
                            <td className="p-2 align-middle text-center print:hidden">
                              <div className="flex flex-col items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moverItemParaCima(idx)}
                                  disabled={idx === 0}
                                  className="h-5 w-5 rounded-full hover:bg-primary/10"
                                  title="Mover para cima"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moverItemParaBaixo(idx)}
                                  disabled={idx >= orcamento.itens.length - 1}
                                  className="h-5 w-5 rounded-full hover:bg-primary/10"
                                  title="Mover para baixo"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          )}
                          <td className="p-2 align-middle text-center font-semibold text-gray-600">
                            {idx + 1}
                          </td>
                          <td className="p-2 align-top">
                            {modoEdicao ? (
                              <div className="relative">
                                <Popover open={openProduto === item.id} onOpenChange={o => setOpenProduto(o ? item.id : null)}>
                                  <PopoverTrigger asChild>
                                    <div className="font-bold cursor-pointer hover:text-primary hover:underline">
                                      {item.produto?.nome || "Selecione um produto..."}
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-0 w-[300px]" align="start">
                                    <Command>
                                      <CommandInput placeholder="Buscar produto..." />
                                      <CommandList>
                                        <CommandGroup>
                                          {produtos.map(p => (
                                            <CommandItem key={p.id} onSelect={() => {
                                              updateItem(item.id, 'produtoId', p.id)
                                              setOpenProduto(null)
                                            }}>
                                              {p.nome}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <TextareaTransparente
                                  key={`obs-comercial-${item.id}`}
                                  value={item.observacaoComercial || ""}
                                  onChange={e => updateItem(item.id, 'observacaoComercial', e.target.value)}
                                  placeholder="Obs. Comercial"
                                  className="text-[10px] text-gray-500 italic w-full mt-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -left-8 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-xs leading-tight mb-1">{item.produto?.nome}</p>
                                {item.observacaoComercial && (
                                  <div className="text-gray-600 italic text-[10px] leading-relaxed">{item.observacaoComercial}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 align-top">
                            <div className="flex flex-wrap gap-1">
                              {ordenarTamanhos(item.tamanhos || {}).map(([tamanho, quantidade]) => (
                                <span
                                  key={tamanho}
                                  className="text-[10px] text-sky-700 font-medium whitespace-nowrap"
                                  title={`${tamanho}: ${quantidade} unidades`}
                                >
                                  {tamanho}-{quantidade}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 text-center align-middle font-bold">
                            {item.quantidade}
                          </td>
                          <td className="p-2 text-right align-middle">
                            {modoEdicao ? (
                              <InputTransparente
                                type="number"
                                step="0.01"
                                value={item.valorUnitario}
                                onChange={e => updateItem(item.id, 'valorUnitario', Number(e.target.value))}
                                className="text-right w-full"
                              />
                            ) : (
                              <span>R$ {item.valorUnitario.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="p-2 text-right align-middle font-bold text-primary">
                            R$ {(item.quantidade * item.valorUnitario).toFixed(2)}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-accent font-medium text-xs">
                    {modoEdicao && (
                      <tr>
                        <td colSpan={7} className="p-0 text-center">
                          <Button variant="ghost" className="w-full h-8 text-xs text-primary hover:bg-primary/10" onClick={addItem}>
                            <Plus className="w-3 h-3 mr-1" /> Adicionar Item
                          </Button>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={modoEdicao ? 6 : 5} className="p-2 text-right border-t border-primary">Valor dos Produtos:</td>
                      <td className="p-2 text-right border-t border-primary">R$ {calcularTotal().toFixed(2)}</td>
                    </tr>
                    {(modoEdicao || (orcamento.valorFrete !== undefined && orcamento.valorFrete > 0)) && (
                      <tr>
                        <td colSpan={modoEdicao ? 6 : 5} className="p-2 text-right">
                          {modoEdicao ? (
                            <div className="flex justify-end items-center gap-2">
                              Frete: R$ <InputTransparente type="number" value={orcamento.valorFrete || 0} onChange={e => updateOrcamentoField('valorFrete', Number(e.target.value))} className="w-16 text-right" />
                            </div>
                          ) : (
                            <span>Valor do Frete:</span>
                          )}
                        </td>
                        <td className="p-2 text-right">R$ {(orcamento.valorFrete || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="font-bold text-primary">
                      <td colSpan={modoEdicao ? 6 : 5} className="p-2 text-right border-t-2 border-primary">TOTAL:</td>
                      <td className="p-2 text-right border-t-2 border-primary">R$ {(calcularTotal() + (orcamento.valorFrete || 0)).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Observações Footer */}
              <div className="space-y-2 mt-4">
                <div>
                  <h3 className="font-bold mb-1 text-primary text-sm">OBSERVAÇÕES</h3>
                  {modoEdicao ? (
                    <TextareaTransparente
                      key={`obs-orcamento-${orcamento.id || 'new'}`}
                      value={orcamento.observacoes || ""}
                      onChange={e => updateOrcamentoField('observacoes', e.target.value)}
                      className="text-xs bg-accent p-2 rounded-md w-full min-h-[40px]"
                      placeholder="Observações gerais do orçamento..."
                    />
                  ) : (
                    <p className="text-xs bg-accent p-2 rounded-md" style={{ minHeight: "24px" }}>
                      {orcamento.observacoes || "Nenhuma observação."}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-accent p-2 rounded-md">
                    <h4 className="font-bold text-primary mb-1 text-xs">Condições de Pagamento</h4>
                    {modoEdicao ? (
                      <InputTransparente value={orcamento.condicoesPagamento} onChange={e => updateOrcamentoField('condicoesPagamento', e.target.value)} className="w-full text-xs" />
                    ) : (
                      <p className="text-xs leading-tight">{orcamento.condicoesPagamento}</p>
                    )}
                  </div>
                  <div className="bg-accent p-2 rounded-md">
                    <h4 className="font-bold text-primary mb-1 text-xs">Prazo de Entrega</h4>
                    {modoEdicao ? (
                      <InputTransparente value={orcamento.prazoEntrega} onChange={e => updateOrcamentoField('prazoEntrega', e.target.value)} className="w-full text-xs" />
                    ) : (
                      <p className="text-xs leading-tight">{orcamento.prazoEntrega}</p>
                    )}
                  </div>
                  <div className="bg-accent p-2 rounded-md">
                    <h4 className="font-bold text-primary mb-1 text-xs">Validade do Orçamento</h4>
                    {modoEdicao ? (
                      <InputTransparente value={orcamento.validadeOrcamento} onChange={e => updateOrcamentoField('validadeOrcamento', e.target.value)} className="w-full text-xs" />
                    ) : (
                      <p className="text-xs leading-tight">{orcamento.validadeOrcamento}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. FICHA TÉCNICA */}
        {(modoExportacao === "completo" || modoExportacao === "ficha") && orcamento.itens.map((item, idx) => (
          <div key={item.id} className="border border-gray-300 rounded-md overflow-hidden shadow-sm ficha-tecnica bg-white page-break-before pdf-section mt-8">
            {/* Header Ficha */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-4 pdf-header w-full">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-md shadow-md flex items-center justify-center w-[50px] h-[50px] overflow-hidden">
                    <img src={dadosEmpresa?.logo_url || "/placeholder.svg"} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div>
                    <div>
                      <h1 className="text-xl font-bold text-white font-sans tracking-tight uppercase">
                        FICHA TÉCNICA - {orcamento.numero.split(" - ")[0]}
                      </h1>
                      <p className="text-white/90 text-sm uppercase">
                        {orcamento.cliente?.nome || "EMPRESA"} - {orcamento.nomeContato || orcamento.cliente?.contato || "CONTATO"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right bg-white/10 p-2 rounded-md backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white font-sans tracking-tight">{dadosEmpresa?.nome}</h2>
                  <p className="text-white/80 text-xs">CNPJ: {dadosEmpresa?.cnpj}</p>
                  <p className="text-white/80 text-xs">{dadosEmpresa?.email}</p>
                  <p className="text-white/80 text-xs">{dadosEmpresa?.telefone}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <h3 className="font-bold text-base mb-2 text-primary border-b border-primary pb-1 flex justify-between">
                {item.produto?.nome}
                <span className="text-xs font-normal text-gray-500">Item {idx + 1}</span>
              </h3>

              <div className="space-y-3">
                {/* Imagem Upload */}
                <div 
                  className={cn("text-center border-2 border-dashed border-gray-200 rounded-lg p-2 relative", modoEdicao && "hover:bg-gray-50 transition-colors group")}
                  tabIndex={modoEdicao ? 0 : -1}
                  onPaste={modoEdicao ? (e) => handleImagePaste(e, item.id) : undefined}
                  title={modoEdicao ? "Clique para selecionar ou cole uma imagem (Ctrl+V)" : undefined}
                >
                  <img
                    src={item.imagem || "/placeholder.svg"}
                    className="max-h-[280px] max-w-[65%] mx-auto object-contain"
                  />
                  {modoEdicao && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 transition-opacity cursor-pointer">
                      <div className="bg-white p-2 rounded shadow text-sm font-bold flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Alterar Imagem (ou Ctrl+V)
                      </div>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, item.id)} />
                    </div>
                  )}
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Tecido + Cor */}
                  <div className="bg-accent/30 rounded-lg border border-primary/10 spec-card col-span-1">
                    <div className="bg-primary/10 p-1.5 border-b border-primary/10 font-medium text-primary text-xs flex justify-between items-center">
                      <span>Tecido / Cor</span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {/* Tecido */}
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5">Tecido</p>
                        {modoEdicao ? (
                          <>
                            <Select value={item.tecidoSelecionado?.nome} onValueChange={val => {
                              const t = item.produto?.tecidos.find(x => x.nome === val)
                              if (t) updateItem(item.id, 'tecidoSelecionado', t)
                            }}>
                              <SelectTrigger className="h-7 text-[10px] bg-transparent border-none p-0 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{item.produto?.tecidos.map((t, tIdx) => <SelectItem key={`${item.id}-tecido-${tIdx}`} value={t.nome}>{t.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <p className="text-[10px] text-gray-500 mt-0.5">{item.tecidoSelecionado?.composicao || "Composição..."}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-[10px]">{item.tecidoSelecionado?.nome || "Não selecionado"}</p>
                            <p className="text-[10px] text-gray-500">{item.tecidoSelecionado?.composicao || "Composição não especificada"}</p>
                          </>
                        )}
                      </div>
                      {/* Cor */}
                      <div className="pt-1 border-t border-primary/5">
                        <p className="text-[10px] text-gray-600 mb-0.5">Cor</p>
                        {modoEdicao ? (
                          <div className="flex items-center gap-2">
                            <Select value={item.corSelecionada} onValueChange={val => updateItem(item.id, 'corSelecionada', val)}>
                              <SelectTrigger className="h-7 text-[10px] bg-transparent border-none p-0 font-bold min-w-[80px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{item.produto?.cores.map((c, cIdx) => <SelectItem key={`${item.id}-cor-${cIdx}`} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: getCorHex(item.corSelecionada) }} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[10px]">{item.corSelecionada || "Não selecionada"}</p>
                            <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: getCorHex(item.corSelecionada) }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Artes - ocupa duas colunas, com mais largura */}
                  <div className="bg-accent/30 rounded-lg border border-primary/10 spec-card col-span-2">
                    <div className="bg-primary/10 p-1.5 border-b border-primary/10 font-medium text-primary flex justify-between items-center">
                      <span className="text-xs">Artes</span>
                      {modoEdicao && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                          const novasEstampas = [...(item.estampas || []), { id: crypto.randomUUID(), tipo: TIPOS_ARTE[0], posicao: POSICOES_ARTE[0], largura: 10, comprimento: 10 }]
                          updateItem(item.id, 'estampas', novasEstampas)
                        }}><Plus className="h-3 w-3" /></Button>
                      )}
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {item.estampas?.map((est, i) => (
                        <div key={est.id} className={cn("text-[10px]", modoEdicao && "relative group pr-5")}> 
                          <div className="flex items-center gap-1">
                            <span className="bg-primary/10 text-primary rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] flex-shrink-0">{i + 1}</span>
                            {modoEdicao ? (
                              <>
                                <Select value={est.posicao} onValueChange={val => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, posicao: val } : x)
                                  updateItem(item.id, 'estampas', news)
                                }}>
                                  <SelectTrigger className="h-5 text-[9px] bg-transparent border-none p-0 font-bold w-[110px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {POSICOES_ARTE.map(pos => (
                                      <SelectItem key={pos} value={pos} className="text-[10px]">{pos}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={est.tipo} onValueChange={val => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, tipo: val } : x)
                                  updateItem(item.id, 'estampas', news)
                                }}>
                                  <SelectTrigger className="h-5 text-[9px] bg-transparent border-none p-0 w-[70px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIPOS_ARTE.map(tipo => (
                                      <SelectItem key={tipo} value={tipo} className="text-[10px]">{tipo}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span>-</span>
                                <InputTransparente type="number" value={est.largura} onChange={e => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, largura: Number(e.target.value) } : x)
                                  updateItem(item.id, 'estampas', news)
                                }} className="w-12 p-0 h-5 text-center text-[9px]" />
                                <span className="text-[9px]">x</span>
                                <InputTransparente type="number" value={est.comprimento} onChange={e => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, comprimento: Number(e.target.value) } : x)
                                  updateItem(item.id, 'estampas', news)
                                }} className="w-12 p-0 h-5 text-center text-[9px]" />
                                <span className="text-[9px] font-semibold">CM</span>
                              </>
                            ) : (
                              <span className="ml-1">{est.posicao} • {est.tipo} • {est.largura}x{est.comprimento} cm</span>
                            )}
                          </div>
                          {modoEdicao && (
                            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-4 w-4 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => {
                              updateItem(item.id, 'estampas', item.estampas!.filter(x => x.id !== est.id))
                            }}><Trash2 className="w-2.5 h-2.5" /></Button>
                          )}
                        </div>
                      ))}
                      {(!item.estampas || item.estampas.length === 0) && <p className="text-gray-400 italic text-[10px]">Sem artes.</p>}
                    </div>
                  </div>
                </div>

                {/* Tabela Tamanhos Item */}
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-primary text-sm">Tabela de Tamanhos</h4>
                    {modoEdicao && tiposTamanho.length > 0 && (
                      <Select
                        value={item.tipoTamanhoSelecionado || ""}
                        onValueChange={(value) => {
                          const tipoSelecionado = tiposTamanho.find(t => t.id === value)
                          if (tipoSelecionado) {
                            // Criar novo objeto de tamanhos com os tamanhos do tipo selecionado
                            const novosTamanhos: Record<string, number> = {}
                            tipoSelecionado.tamanhos?.forEach(tamanho => {
                              novosTamanhos[tamanho] = item.tamanhos[tamanho] || 0
                            })
                            // Atualizar ambos os campos em uma única operação
                            const novosItens = orcamentoRef.current.itens.map(i => 
                              i.id === item.id 
                                ? { ...i, tipoTamanhoSelecionado: value, tamanhos: novosTamanhos }
                                : i
                            )
                            setOrcamentoRef.current({ ...orcamentoRef.current, itens: novosItens })
                          }
                        }}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Selecione o tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposTamanho.map(tipo => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                    {(() => {
                      // Determinar quais tamanhos mostrar
                      let tamanhosParaMostrar: string[] = []
                      
                      if (item.tipoTamanhoSelecionado) {
                        const tipoSelecionado = tiposTamanho.find(t => t.id === item.tipoTamanhoSelecionado)
                        tamanhosParaMostrar = tipoSelecionado?.tamanhos || []
                      } else if (item.produto?.tamanhosDisponiveis && item.produto.tamanhosDisponiveis.length > 0) {
                        tamanhosParaMostrar = item.produto.tamanhosDisponiveis
                      } else if (item.tamanhos && Object.keys(item.tamanhos).length > 0) {
                        tamanhosParaMostrar = Object.keys(item.tamanhos)
                      }

                      // Garantir ordem consistente dos tamanhos
                      if (tamanhosParaMostrar.length > 0) {
                        tamanhosParaMostrar = ordenarLabelsTamanhos(tamanhosParaMostrar)
                      }
                      
                      return tamanhosParaMostrar.length > 0 ? (
                        <table className="w-full border-collapse" style={{ fontSize: "0.9rem", tableLayout: "fixed" }}>
                          <tbody>
                            <tr>
                              <th className="p-2 text-left bg-gray-100 border border-gray-200 font-semibold text-primary" style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}>
                                Tam.
                              </th>
                              {tamanhosParaMostrar.map(t => (
                                <th key={`header-${t}`} className="p-2 text-center bg-gray-100 border border-gray-200 font-medium text-primary" style={{ minWidth: "50px", width: `${100 / (tamanhosParaMostrar.length + 2)}%` }}>
                                  {t}
                                </th>
                              ))}
                              <th className="p-2 text-center bg-gray-100 border border-gray-200 font-bold text-sky-700" style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}>
                                TOTAL
                              </th>
                            </tr>
                            <tr>
                              <td className="p-2 text-left bg-gray-100 border border-gray-200 font-semibold text-primary" style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}>
                                Qtd.
                              </td>
                              {tamanhosParaMostrar.map(t => (
                                <td key={`qty-${t}`} className="p-1 text-center border border-gray-200">
                                  {modoEdicao ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.tamanhos[t] || 0}
                                      onChange={e => updateTamanho(item.id, t, Number(e.target.value))}
                                      className="w-full text-center bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-primary/30 rounded font-medium"
                                      style={{ fontSize: "0.85rem", padding: "2px 0" }}
                                    />
                                  ) : (
                                    <span className="font-medium">{item.tamanhos[t] || 0}</span>
                                  )}
                                </td>
                              ))}
                              <td className="p-2 text-center bg-gray-100 border border-gray-200 font-bold text-sky-700" style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}>
                                {item.quantidade}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <div className="py-3 px-3 text-center text-gray-500 italic">
                          {modoEdicao ? "Selecione um tipo de tamanho acima para começar" : "Nenhum tamanho especificado"}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Obs Tecnica */}
                <div>
                  <h4 className="font-bold mb-0.5 text-primary text-xs">Observações Técnicas</h4>
                  {modoEdicao ? (
                    <TextareaTransparente
                      key={`obs-tecnica-${item.id}`}
                      value={item.observacaoTecnica || ""}
                      onChange={e => updateItem(item.id, 'observacaoTecnica', e.target.value)}
                      className="text-[10px] bg-accent p-2 rounded-md w-full min-h-[40px]"
                      placeholder="Detalhes técnicos de produção..."
                    />
                  ) : (
                    <p className="text-[10px] bg-accent p-2 rounded-md" style={{ whiteSpace: "pre-wrap" }}>
                      {item.observacaoTecnica || "Nenhuma observação técnica."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

      </div>
    </>
  )
}

// Função para ordenar os tamanhos (usada em relatórios, etc.)
const ordenarTamanhos = (tamanhos: Record<string, number>) => {
  const ordemLetras = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]
  const tamanhosLetras: [string, number][] = []
  const tamanhosNumericos: [string, number][] = []
  const tamanhosInfantis: [string, number][] = []

  Object.entries(tamanhos)
    .filter(([_, quantidade]) => quantidade > 0)
    .forEach(([tamanho, quantidade]) => {
      if (ordemLetras.includes(tamanho)) {
        tamanhosLetras.push([tamanho, quantidade])
      } else if (/^(3[6-9]|[4-5][0-9]|6[0-2])$/.test(tamanho)) {
        tamanhosNumericos.push([tamanho, quantidade])
      } else if (/^([0-9]|1[0-3])$/.test(tamanho)) {
        tamanhosInfantis.push([tamanho, quantidade])
      } else {
        tamanhosLetras.push([tamanho, quantidade])
      }
    })

  tamanhosLetras.sort((a, b) => ordemLetras.indexOf(a[0]) - ordemLetras.indexOf(b[0]))
  tamanhosNumericos.sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
  tamanhosInfantis.sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))

  return [...tamanhosLetras, ...tamanhosNumericos, ...tamanhosInfantis]
}

// Helper para ordenar apenas os rótulos de tamanhos usados na tabela da ficha técnica
const ordenarLabelsTamanhos = (labels: string[]): string[] => {
  const ordemLetras = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]

  const letras: string[] = []
  const numerosAdulto: string[] = []
  const numerosInfantil: string[] = []
  const outros: string[] = []

  labels.forEach((tamanho) => {
    if (ordemLetras.includes(tamanho)) {
      letras.push(tamanho)
    } else if (/^(3[6-9]|[4-5][0-9]|6[0-2])$/.test(tamanho)) {
      numerosAdulto.push(tamanho)
    } else if (/^([0-9]|1[0-3])$/.test(tamanho)) {
      numerosInfantil.push(tamanho)
    } else {
      outros.push(tamanho)
    }
  })

  letras.sort((a, b) => ordemLetras.indexOf(a) - ordemLetras.indexOf(b))
  numerosAdulto.sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
  numerosInfantil.sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
  outros.sort()

  return [...letras, ...numerosInfantil, ...numerosAdulto, ...outros]
}

// Helper Cor
function getCorHex(nome?: string) {
  if (!nome) return "#ccc"
  const n = nome.toLowerCase()
  if (n.includes("azul")) return "#1e40af"
  if (n.includes("verde")) return "#15803d"
  if (n.includes("vermelho")) return "#b91c1c"
  if (n.includes("amarelo")) return "#eab308"
  if (n.includes("preto")) return "#171717"
  if (n.includes("branco")) return "#ffffff"
  if (n.includes("cinza")) return "#6b7280"
  return "#9ca3af"
}

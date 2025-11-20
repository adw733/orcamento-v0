"use client"

import type { Orcamento, DadosEmpresa, ItemOrcamento, Cliente, Produto } from "@/types/types"
import React, { useState, useRef, useEffect } from "react"
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
import { supabase } from "@/lib/supabase"
import { type TipoTamanho, tipoTamanhoService } from "@/lib/services-materiais"

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

  // Helper para inputs transparentes
  const InputTransparente = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
    <Input
      className={cn(
        "bg-transparent border-transparent shadow-none hover:bg-white/20 focus:bg-white/50 focus:border-primary/30 px-1 h-auto py-0 rounded-sm transition-colors",
        className
      )}
      {...props}
    />
  )

  const TextareaTransparente = ({ className, ...props }: React.ComponentProps<typeof Textarea>) => (
    <Textarea
      className={cn(
        "bg-transparent border-transparent shadow-none hover:bg-white/20 focus:bg-white/50 focus:border-primary/30 px-1 py-0 min-h-[1.5em] resize-none rounded-sm transition-colors overflow-hidden",
        className
      )}
      {...props}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement
        target.style.height = "auto"
        target.style.height = `${target.scrollHeight}px`
      }}
    />
  )

  // Funções de atualização
  const updateOrcamentoField = (field: keyof Orcamento, value: any) => {
    setOrcamento({ ...orcamento, [field]: value })
  }

  const updateClienteField = (field: keyof Cliente, value: any) => {
    if (!orcamento.cliente) return
    const novoCliente = { ...orcamento.cliente, [field]: value }
    setOrcamento({ ...orcamento, cliente: novoCliente })
  }

  const updateItem = (itemId: string, field: keyof ItemOrcamento, value: any) => {
    const novosItens = orcamento.itens.map(item => {
      if (item.id !== itemId) return item

      // Lógica especial para produto
      if (field === 'produtoId') {
        const produto = produtos.find(p => p.id === value)
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
    setOrcamento({ ...orcamento, itens: novosItens })
  }

  const updateTamanho = (itemId: string, tamanho: string, qtd: number) => {
    const item = orcamento.itens.find(i => i.id === itemId)
    if (!item) return
    const novosTamanhos = { ...item.tamanhos, [tamanho]: qtd }
    // Recalcular quantidade total
    const novaQuantidade = Object.values(novosTamanhos).reduce((a, b) => a + b, 0)

    const novosItens = orcamento.itens.map(i => i.id === itemId ? { ...i, tamanhos: novosTamanhos, quantidade: novaQuantidade } : i)
    setOrcamento({ ...orcamento, itens: novosItens })
  }

  const addItem = () => {
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
    setOrcamento({ ...orcamento, itens: [...orcamento.itens, novoItem] })
  }

  const removeItem = (id: string) => {
    setOrcamento({ ...orcamento, itens: orcamento.itens.filter(i => i.id !== id) })
  }

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
  const moverItemParaCima = (index: number) => {
    if (index === 0) return // Já está no topo
    const novosItens = [...orcamento.itens]
    const temp = novosItens[index]
    novosItens[index] = novosItens[index - 1]
    novosItens[index - 1] = temp
    setOrcamento({ ...orcamento, itens: novosItens })
  }

  const moverItemParaBaixo = (index: number) => {
    if (index === orcamento.itens.length - 1) return // Já está no final
    const novosItens = [...orcamento.itens]
    const temp = novosItens[index]
    novosItens[index] = novosItens[index + 1]
    novosItens[index + 1] = temp
    setOrcamento({ ...orcamento, itens: novosItens })
  }

  const moverItemParaPosicao = (itemId: string, novaPosicao: number) => {
    const indexAtual = orcamento.itens.findIndex(i => i.id === itemId)
    if (indexAtual === -1) return

    // Ajustar para índice baseado em 0 (usuário digita 1, 2, 3...)
    const novoIndex = novaPosicao - 1

    if (novoIndex < 0 || novoIndex >= orcamento.itens.length || novoIndex === indexAtual) return

    const novosItens = [...orcamento.itens]
    const [itemMovido] = novosItens.splice(indexAtual, 1)
    novosItens.splice(novoIndex, 0, itemMovido)
    setOrcamento({ ...orcamento, itens: novosItens })
  }

  // PDF Generator (Mesma lógica do original, ajustada)
  const gerarPDFPro = async () => {
    if (!pdfContainerRef.current) return
    setExportandoPDF(true)
    try {
      const container = pdfContainerRef.current
      await new Promise(resolve => setTimeout(resolve, 500))

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const margin = 10
      const contentWidth = pageWidth - (margin * 2)

      const captureSection = async (element: HTMLElement) => {
        // Temporariamente remover bordas de input e backgrounds de foco para o print
        const inputs = element.querySelectorAll('input, textarea')
        inputs.forEach((input: any) => {
          input.style.backgroundColor = 'transparent'
          input.style.border = 'none'
        })

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: element.scrollWidth,
          height: element.scrollHeight
        })
        return canvas
      }

      const sections = container.querySelectorAll('.orcamento-principal, .ficha-tecnica')

      for (let i = 0; i < sections.length; i++) {
        setProgressoPDF(((i + 1) / sections.length) * 100)
        const section = sections[i] as HTMLElement
        const canvas = await captureSection(section)

        const imgHeight = (canvas.height * contentWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0

        if (i > 0) pdf.addPage()

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin + position, contentWidth, imgHeight)
        heightLeft -= (pageHeight - (margin * 2))

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin + position, contentWidth, imgHeight)
          heightLeft -= (pageHeight - (margin * 2))
        }
      }

      pdf.save(`orcamento-${orcamento.numero}.pdf`)
    } catch (err) {
      console.error(err)
      alert("Erro ao gerar PDF")
    } finally {
      setExportandoPDF(false)
      setProgressoPDF(0)
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
            onClick={async () => {
              if (orcamento.id && exportarOrcamento) {
                await exportarOrcamento(orcamento.id, "orcamento")
              }
            }}
            disabled={!orcamento.cliente || orcamento.itens.length === 0}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white transition-all shadow-sm text-xs px-3 py-2 h-8"
          >
            <FileDown className="h-4 w-4" />
            PDF Orçamento
          </Button>

          <Button
            onClick={async () => {
              if (orcamento.id && exportarOrcamento) {
                await exportarOrcamento(orcamento.id, "ficha")
              }
            }}
            disabled={!orcamento.cliente || orcamento.itens.length === 0}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white transition-all shadow-sm text-xs px-3 py-2 h-8"
          >
            <FileDown className="h-4 w-4" />
            PDF Ficha Técnica
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
                                  setOrcamento({ ...orcamento, cliente: cliente, nomeContato: cliente.contato || "", telefoneContato: cliente.telefone || "" })
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
                            const draggedIndex = orcamento.itens.findIndex((i) => i.id === draggedItemId)
                            const targetIndex = idx

                            if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
                              const novosItens = [...orcamento.itens]
                              const [itemRemovido] = novosItens.splice(draggedIndex, 1)
                              novosItens.splice(targetIndex, 0, itemRemovido)
                              setOrcamento({ ...orcamento, itens: novosItens })
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
                                  disabled={idx === orcamento.itens.length - 1}
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
                                  value={item.observacaoComercial}
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
                      value={orcamento.observacoes}
                      onChange={e => updateOrcamentoField('observacoes', e.target.value)}
                      className="text-xs bg-accent p-2 rounded-md w-full min-h-[40px]"
                      placeholder="Adicione observações gerais..."
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

            <div className="p-6 space-y-6">
              <h3 className="font-bold text-lg mb-4 text-primary border-b-2 border-primary pb-2 flex justify-between">
                {item.produto?.nome}
                <span className="text-sm font-normal text-gray-500">Item {idx + 1}</span>
              </h3>

              <div className="space-y-4">
                {/* Imagem Upload */}
                <div className={cn("text-center border-2 border-dashed border-gray-200 rounded-lg p-4 relative", modoEdicao && "hover:bg-gray-50 transition-colors group")}>
                  <img
                    src={item.imagem || "/placeholder.svg"}
                    className="max-h-[400px] max-w-[70%] mx-auto object-contain"
                  />
                  {modoEdicao && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 transition-opacity cursor-pointer">
                      <div className="bg-white p-2 rounded shadow text-sm font-bold flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Alterar Imagem
                      </div>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, item.id)} />
                    </div>
                  )}
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Tecido */}
                  <div className="bg-accent/30 rounded-lg border border-primary/10 spec-card">
                    <div className="bg-primary/10 p-2 border-b border-primary/10 font-medium text-primary">Tecido</div>
                    <div className="p-3 space-y-2">
                      {modoEdicao ? (
                        <>
                          <Select value={item.tecidoSelecionado?.nome} onValueChange={val => {
                            const t = item.produto?.tecidos.find(x => x.nome === val)
                            if (t) updateItem(item.id, 'tecidoSelecionado', t)
                          }}>
                            <SelectTrigger className="h-8 text-xs bg-transparent border-none p-0 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>{item.produto?.tecidos.map(t => <SelectItem key={t.nome} value={t.nome}>{t.nome}</SelectItem>)}</SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">{item.tecidoSelecionado?.composicao || "Composição..."}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-xs">{item.tecidoSelecionado?.nome || "Não selecionado"}</p>
                          <p className="text-xs text-gray-500">{item.tecidoSelecionado?.composicao || "Composição não especificada"}</p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Cor */}
                  <div className="bg-accent/30 rounded-lg border border-primary/10 spec-card">
                    <div className="bg-primary/10 p-2 border-b border-primary/10 font-medium text-primary">Cor</div>
                    <div className="p-3">
                      {modoEdicao ? (
                        <>
                          <Select value={item.corSelecionada} onValueChange={val => updateItem(item.id, 'corSelecionada', val)}>
                            <SelectTrigger className="h-8 text-xs bg-transparent border-none p-0 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>{item.produto?.cores.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                          <div className="w-6 h-6 rounded-full border mt-2" style={{ backgroundColor: getCorHex(item.corSelecionada) }} />
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-xs mb-2">{item.corSelecionada || "Não selecionada"}</p>
                          <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: getCorHex(item.corSelecionada) }} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Artes - Simplificado para Textarea por enquanto ou lista editavel */}
                  <div className="bg-accent/30 rounded-lg border border-primary/10 spec-card">
                    <div className="bg-primary/10 p-2 border-b border-primary/10 font-medium text-primary flex justify-between items-center">
                      Artes
                      {modoEdicao && (
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => {
                          const novasEstampas = [...(item.estampas || []), { id: crypto.randomUUID(), tipo: "Silk", posicao: "Frente", largura: 10, comprimento: 10 }]
                          updateItem(item.id, 'estampas', novasEstampas)
                        }}><Plus className="h-3 w-3" /></Button>
                      )}
                    </div>
                    <div className="p-3 space-y-2 max-h-[150px] overflow-y-auto">
                      {item.estampas?.map((est, i) => (
                        <div key={est.id} className={cn("text-xs border-b pb-1 mb-1", modoEdicao && "relative group")}>
                          <div className="font-bold flex gap-1">
                            <span className="bg-primary/10 text-primary rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{i + 1}</span>
                            {modoEdicao ? (
                              <InputTransparente value={est.posicao} onChange={e => {
                                const news = item.estampas!.map(x => x.id === est.id ? { ...x, posicao: e.target.value } : x)
                                updateItem(item.id, 'estampas', news)
                              }} className="font-bold w-full p-0 h-auto" />
                            ) : (
                              <span className="font-bold">{est.posicao}</span>
                            )}
                          </div>
                          <div className="flex gap-1 text-[10px] text-gray-500">
                            {modoEdicao ? (
                              <>
                                <InputTransparente value={est.tipo} onChange={e => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, tipo: e.target.value } : x)
                                  updateItem(item.id, 'estampas', news)
                                }} className="w-12 p-0 h-auto" /> -
                                <InputTransparente type="number" value={est.largura} onChange={e => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, largura: Number(e.target.value) } : x)
                                  updateItem(item.id, 'estampas', news)
                                }} className="w-8 p-0 h-auto text-center" />x
                                <InputTransparente type="number" value={est.comprimento} onChange={e => {
                                  const news = item.estampas!.map(x => x.id === est.id ? { ...x, comprimento: Number(e.target.value) } : x)
                                  updateItem(item.id, 'estampas', news)
                                }} className="w-8 p-0 h-auto text-center" /> cm
                              </>
                            ) : (
                              <span>{est.tipo} - {est.largura}x{est.comprimento} cm</span>
                            )}
                          </div>
                          {modoEdicao && (
                            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-4 w-4 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => {
                              updateItem(item.id, 'estampas', item.estampas!.filter(x => x.id !== est.id))
                            }}><Trash2 className="w-3 h-3" /></Button>
                          )}
                        </div>
                      ))}
                      {(!item.estampas || item.estampas.length === 0) && <p className="text-gray-400 italic text-xs">Sem artes.</p>}
                    </div>
                  </div>
                </div>

                {/* Tabela Tamanhos Item */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-primary">Tabela de Tamanhos</h4>
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
                            updateItem(item.id, 'tipoTamanhoSelecionado', value)
                            updateItem(item.id, 'tamanhos', novosTamanhos)
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
                      
                      return tamanhosParaMostrar.length > 0 ? (
                        <table className="w-full border-collapse" style={{ fontSize: "0.9rem" }}>
                          <tbody>
                            <tr>
                              <th className="p-2 text-left bg-gray-100 border border-gray-200 font-semibold text-primary" style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}>
                                Tam.
                              </th>
                              {tamanhosParaMostrar.map(t => (
                                <th key={`header-${t}`} className="p-2 text-center bg-gray-100 border border-gray-200 font-medium text-primary">
                                  {t}
                                </th>
                              ))}
                              <th className="p-2 text-center bg-gray-100 border border-gray-200 font-bold text-sky-700" style={{ width: "80px", minWidth: "80px", maxWidth: "80px" }}>
                                TOTAL
                              </th>
                            </tr>
                            <tr>
                              <td className="p-2 text-left bg-gray-100 border border-gray-200 font-semibold text-primary" style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}>
                                Qtd.
                              </td>
                              {tamanhosParaMostrar.map(t => (
                                <td key={`qty-${t}`} className="p-2 text-center border border-gray-200">
                                  {modoEdicao ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.tamanhos[t] || 0}
                                      onChange={e => updateTamanho(item.id, t, Number(e.target.value))}
                                      className="w-full text-center bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-primary/30 rounded px-1 font-medium"
                                      style={{ fontSize: "0.9rem" }}
                                    />
                                  ) : (
                                    <span className="font-medium">{item.tamanhos[t] || 0}</span>
                                  )}
                                </td>
                              ))}
                              <td className="p-2 text-center bg-gray-100 border border-gray-200 font-bold text-sky-700" style={{ width: "80px", minWidth: "80px", maxWidth: "80px" }}>
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
                  <h4 className="font-bold mb-1 text-primary text-sm">Observações Técnicas</h4>
                  {modoEdicao ? (
                    <TextareaTransparente
                      value={item.observacaoTecnica}
                      onChange={e => updateItem(item.id, 'observacaoTecnica', e.target.value)}
                      className="text-xs bg-accent p-3 rounded-md w-full min-h-[60px]"
                      placeholder="Detalhes técnicos de produção..."
                    />
                  ) : (
                    <p className="text-xs bg-accent p-3 rounded-md" style={{ whiteSpace: "pre-wrap" }}>
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

// Função para ordenar os tamanhos
const ordenarTamanhos = (tamanhos: Record<string, number>) => {
  // Separar os tamanhos por categoria
  const tamanhosLetras: [string, number][] = []
  const tamanhosNumericos: [string, number][] = []
  const tamanhosInfantis: [string, number][] = []

  // Ordem específica para tamanhos de letras
  const ordemLetras = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]

  Object.entries(tamanhos)
    .filter(([_, quantidade]) => quantidade > 0)
    .forEach(([tamanho, quantidade]) => {
      // Verificar se é um tamanho de letra (PP, P, M, G, GG, G1-G7)
      if (ordemLetras.includes(tamanho)) {
        tamanhosLetras.push([tamanho, quantidade])
      }
      // Verificar se é um tamanho numérico adulto (36-62)
      else if (/^(3[6-9]|[4-5][0-9]|6[0-2])$/.test(tamanho)) {
        tamanhosNumericos.push([tamanho, quantidade])
      }
      // Verificar se é um tamanho infantil (0-13)
      else if (/^([0-9]|1[0-3])$/.test(tamanho)) {
        tamanhosInfantis.push([tamanho, quantidade])
      }
      // Outros tamanhos não categorizados
      else {
        tamanhosLetras.push([tamanho, quantidade])
      }
    })

  // Ordenar cada categoria
  tamanhosLetras.sort((a, b) => ordemLetras.indexOf(a[0]) - ordemLetras.indexOf(b[0]))
  tamanhosNumericos.sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
  tamanhosInfantis.sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))

  // Retornar todos os tamanhos ordenados
  return [...tamanhosLetras, ...tamanhosNumericos, ...tamanhosInfantis]
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

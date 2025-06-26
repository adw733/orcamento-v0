"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit, Check, X, ImageIcon, DollarSign, Loader2, ChevronUp, ChevronDown, User, Building2, FileText, CreditCard, Calendar, Hash, Palette, Shirt, Ruler, Save } from "lucide-react"
import type { Cliente, Produto, Orcamento, ItemOrcamento, Estampa } from "@/types/types"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Importar serviços de materiais
import { type TipoTamanho, tipoTamanhoService } from "@/lib/services-materiais"

// Helper function to generate UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface FormularioOrcamentoProps {
  orcamento: Orcamento
  clientes: Cliente[]
  produtos: Produto[]
  atualizarOrcamento: (orcamento: Partial<Orcamento>) => void
  adicionarItem: (item: ItemOrcamento) => void
  removerItem: (id: string) => void
  atualizarItem: (id: string, item: Partial<ItemOrcamento>) => void
  calcularTotal: () => number
  handleClienteChange: (clienteId: string) => void
  salvarNovoOrcamento?: () => Promise<void>
  atualizarOrcamentoExistente?: () => Promise<void>
  orcamentoSalvo?: string | null
  isLoading?: boolean
  temAlteracoes?: boolean
}

// Update the tamanhosPadrao object to include all possible sizes
const tamanhosPadrao = {
  // Padrão (PP ao G7)
  PP: 0,
  P: 0,
  M: 0,
  G: 0,
  GG: 0,
  G1: 0,
  G2: 0,
  G3: 0,
  G4: 0,
  G5: 0,
  G6: 0,
  G7: 0,
  // Numérico (36 ao 62) - apenas tamanhos pares
  "36": 0,
  "38": 0,
  "40": 0,
  "42": 0,
  "44": 0,
  "46": 0,
  "48": 0,
  "50": 0,
  "52": 0,
  "54": 0,
  "56": 0,
  "58": 0,
  "60": 0,
  "62": 0,
  // Infantil (0 ao 13)
  "0": 0,
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
  "6": 0,
  "7": 0,
  "8": 0,
  "9": 0,
  "10": 0,
  "11": 0,
  "12": 0,
  "13": 0,
}

// Função para converter imagem para base64
const converterImagemParaBase64 = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader()
  reader.onloadend = () => {
    const base64String = reader.result as string
    callback(base64String)
  }
  reader.readAsDataURL(file)
}

// Componente EstampaInput otimizado e mais compacto
const EstampaInput = ({
  estampas = [],
  onChange,
}: {
  estampas?: Estampa[]
  onChange: (estampas: Estampa[]) => void
}) => {
  // Função para gerar um UUID válido em vez de um ID personalizado
  const generateId = () => {
    return generateUUID()
  }

  // Adicionar uma nova estampa
  const adicionarEstampa = () => {
    const novaEstampa: Estampa = {
      id: generateId(),
      posicao: undefined,
      tipo: undefined,
      largura: undefined,
    }
    onChange([...estampas, novaEstampa])
  }

  // Remover uma estampa
  const removerEstampa = (id: string) => {
    onChange(estampas.filter((estampa) => estampa.id !== id))
  }

  // Atualizar uma estampa específica
  const atualizarEstampa = (id: string, campo: string, valor: string | number) => {
    onChange(estampas.map((estampa) => (estampa.id === id ? { ...estampa, [campo]: valor } : estampa)))
  }

  const posicoes = [
    "Peito esquerdo",
    "Peito direito", 
    "Costas",
    "Bolso esquerdo",
    "Bolso direito",
    "Manga esquerda",
    "Manga direita",
  ]
  const tipos = ["Bordado", "Silk", "DTF", "Sublimação"]

  return (
    <div className="space-y-1.5">
      {estampas.map((estampa, index) => (
        <div key={estampa.id} className="border rounded-md p-2 bg-white relative text-xs shadow-sm">
          <button
            type="button"
            onClick={() => removerEstampa(estampa.id!)}
            className="absolute top-1 right-1 text-gray-400 hover:text-red-500 bg-white rounded-full p-0.5 shadow-sm transition-colors z-10"
          >
            <X className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-1 mb-1.5">
            <Palette className="h-3 w-3 text-primary" />
            <span className="font-medium text-primary text-xs">Arte {index + 1}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <Select
                value={estampa.posicao || ""}
                onValueChange={(value) => atualizarEstampa(estampa.id!, "posicao", value)}
              >
                <SelectTrigger className="h-6 text-xs border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Posição" />
                </SelectTrigger>
                <SelectContent>
                  {posicoes.map((posicao) => (
                    <SelectItem key={posicao} value={posicao} className="text-xs">
                      {posicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={estampa.tipo || ""}
                onValueChange={(value) => atualizarEstampa(estampa.id!, "tipo", value)}
              >
                <SelectTrigger className="h-6 text-xs border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo} className="text-xs">
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="number"
                value={estampa.largura || ""}
                onChange={(e) => atualizarEstampa(estampa.id!, "largura", Number(e.target.value))}
                className="h-6 text-xs border-gray-300 focus:border-primary"
                placeholder="Largura (cm)"
                min="0"
                step="0.5"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        onClick={adicionarEstampa}
        variant="outline"
        size="sm"
        className="w-full h-6 text-xs border-dashed border-2 hover:bg-accent/20 flex items-center justify-center gap-1"
      >
        <Plus className="h-3 w-3" />
        Adicionar Arte
      </Button>
    </div>
  )
}

// Modifique a função renderTabelaTamanhos para usar tipos de tamanho
const renderTabelaTamanhos = (
  tamanhos: Record<string, number>,
  quantidade: number,
  isEditing: boolean,
  onChange: (tamanho: string, valor: number) => void,
  tipoTamanho?: TipoTamanho,
) => {
  // Criar um objeto que mantém apenas os tamanhos do tipo selecionado
  const tamanhosFiltrados: Record<string, number> = {}

  if (tipoTamanho && tipoTamanho.tamanhos) {
    // Usar os tamanhos do tipo selecionado
    tipoTamanho.tamanhos.forEach((tamanho) => {
      tamanhosFiltrados[tamanho] = tamanhos[tamanho] || 0
    })
  } else {
    // Se não houver tipo selecionado, usar todos os tamanhos do padrão
    Object.keys(tamanhosPadrao).forEach((tamanho) => {
      tamanhosFiltrados[tamanho] = tamanhos[tamanho] || 0
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />
        <h4 className="font-medium text-primary">Tamanhos</h4>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-primary/10 to-primary/5">
              <th className="border-b p-2 text-center font-medium text-sm text-primary w-[60px]">TAM.</th>
              {Object.keys(tamanhosFiltrados).map((tamanho) => (
                <th
                  key={`header-${tamanho}`}
                  className="border-b p-2 text-center font-medium text-sm text-primary min-w-[50px]"
                >
                  {tamanho}
                </th>
              ))}
              <th className="border-b p-2 text-center font-medium text-sm text-primary w-[60px] bg-primary/20">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b p-2 text-center font-medium text-sm bg-gradient-to-r from-primary/10 to-primary/5">QTD.</td>
              {Object.entries(tamanhosFiltrados).map(([tamanho, valor]) => (
                <td key={`cell-${tamanho}`} className="border-b p-2 text-center">
                  <div className="flex justify-center">
                    <input
                      type="number"
                      min="0"
                      value={valor}
                      onChange={(e) => onChange(tamanho, Number.parseInt(e.target.value) || 0)}
                      className="w-12 h-8 text-center text-sm border border-gray-300 rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </div>
                </td>
              ))}
              <th className="border-b p-2 text-center font-bold text-lg bg-primary/20 text-primary">{quantidade}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente para gerenciar imagem (upload, prévia, remoção)
const GerenciadorImagem = ({
  imagem,
  onChange,
  inputRef,
  isEditing = true,
}: {
  imagem?: string
  onChange: (novaImagem: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  isEditing?: boolean
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Adicionar event listener para o evento de colar
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isEditing) return

      // Verificar se o container está em foco ou se algum elemento dentro dele está em foco
      const activeElement = document.activeElement
      const isContainerOrChild =
        containerRef.current &&
        (containerRef.current === activeElement || containerRef.current.contains(activeElement as Node))

      // Se o container ou um filho dele não estiver em foco, verificar se o documento está em foco
      if (!isContainerOrChild && activeElement !== document.body) return

      // Verificar se há itens na área de transferência
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items

        // Procurar por uma imagem nos itens colados
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            // Encontrou uma imagem, obter o arquivo
            const file = items[i].getAsFile()
            if (file) {
              e.preventDefault() // Prevenir o comportamento padrão

              // Converter para base64 e atualizar o estado
              converterImagemParaBase64(file, (base64) => {
                onChange(base64)
                toast({
                  title: "Imagem colada com sucesso!",
                  description: "A imagem da área de transferência foi adicionada.",
                })
              })
              break
            }
          }
        }
      }
    }

    // Adicionar o event listener ao documento
    document.addEventListener("paste", handlePaste)

    // Remover o event listener quando o componente for desmontado
    return () => {
      document.removeEventListener("paste", handlePaste)
    }
  }, [isEditing, onChange])

  // Também modifique o retorno do componente para adicionar um tabIndex ao containerRef:

  if (!isEditing) return null

  return (
    <div className="space-y-3" ref={containerRef} tabIndex={0} onClick={() => containerRef.current?.focus()}>
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary" />
        <Label className="text-primary font-medium">Imagem para Ficha Técnica</Label>
      </div>
      
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="w-full h-12 border-dashed border-2 hover:bg-primary/5 hover:border-primary transition-all duration-200"
          >
            <ImageIcon className="h-5 w-5 mr-2" />
            {imagem ? "Trocar Imagem" : "Adicionar Imagem"}
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Clique para selecionar ou use Ctrl+V para colar
          </p>
        </div>
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              converterImagemParaBase64(file, (base64) => {
                onChange(base64)
              })
            }
          }}
          className="hidden"
        />
        
        {imagem && (
          <div className="relative group">
            <img
              src={imagem || "/placeholder.svg"}
              alt="Prévia da imagem"
              className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 shadow-md transition-all duration-200 group-hover:shadow-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
              onClick={() => onChange("")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FormularioOrcamento({
  orcamento,
  clientes,
  produtos,
  atualizarOrcamento,
  adicionarItem,
  removerItem,
  atualizarItem,
  calcularTotal,
  handleClienteChange,
  salvarNovoOrcamento,
  atualizarOrcamentoExistente,
  orcamentoSalvo,
  isLoading: isLoadingExterno,
  temAlteracoes,
}: FormularioOrcamentoProps) {
  const [linhaAtiva, setLinhaAtiva] = useState<string | null>(null)
  const [editandoItem, setEditandoItem] = useState<string | null>(null)
  // Atualizar a inicialização de novoItem
  const [novoItem, setNovoItem] = useState<Partial<ItemOrcamento>>({
    produtoId: "",
    quantidade: 0,
    valorUnitario: 0,
    tipoTamanhoSelecionado: "",
    tamanhos: { ...tamanhosPadrao },
    imagem: "",
    observacaoComercial: "",
    observacaoTecnica: "",
    estampas: [],
  })
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemOrcamento | null>(null)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const loading = isLoadingExterno ?? isLoading // Usar loading externo se disponível
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  // Novo estado para controlar se o formulário de novo item está expandido
  const [novoItemExpandido, setNovoItemExpandido] = useState(false)
  // Estado para tipos de tamanho disponíveis
  const [tiposTamanho, setTiposTamanho] = useState<TipoTamanho[]>([])
  const [tipoTamanhoSelecionado, setTipoTamanhoSelecionado] = useState<TipoTamanho | null>(null)

  // Refs para os inputs de arquivo
  const novoImagemInputRef = useRef<HTMLInputElement>(null)
  const editImagemInputRef = useRef<HTMLInputElement>(null)

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

  // Função para detectar e aplicar tipos de tamanho automaticamente em todos os itens do orçamento
  const detectarTiposTamanhoOrcamento = async () => {
    if (!orcamento?.itens || orcamento.itens.length === 0 || tiposTamanho.length === 0) return

    let itensAtualizados = false
    const novosItens = orcamento.itens.map(item => {
      // Se o item já tem tipo definido, não alterar
      if (item.tipoTamanhoSelecionado) return item
      
      // Detectar tipo automaticamente
      const tipoDetectado = detectarTipoTamanho(item.tamanhos || {})
      
      if (tipoDetectado) {
        console.log(`🎯 Auto-detectado tipo "${tipoDetectado.nome}" para produto: ${item.produto?.nome}`)
        itensAtualizados = true
        return {
          ...item,
          tipoTamanhoSelecionado: tipoDetectado.id
        }
      }
      
      return item
    })

    // Atualizar o orçamento se houve mudanças
    if (itensAtualizados) {
      atualizarOrcamento({ itens: novosItens })
      console.log('✅ Tipos de tamanho auto-detectados e aplicados ao orçamento')
    }
  }

  // Executar detecção automática quando carregar tipos de tamanho ou itens mudarem
  useEffect(() => {
    if (tiposTamanho.length > 0 && orcamento?.itens && orcamento.itens.length > 0) {
      detectarTiposTamanhoOrcamento()
    }
  }, [tiposTamanho.length, orcamento?.itens?.length])

  // Função para detectar automaticamente o tipo de tamanho baseado nos tamanhos com quantidade > 0
  const detectarTipoTamanho = (tamanhosItem: Record<string, number>): TipoTamanho | null => {
    if (!tamanhosItem || Object.keys(tamanhosItem).length === 0) return null

    // Obter tamanhos que têm quantidade > 0
    const tamanhosComQuantidade = Object.keys(tamanhosItem).filter(tamanho => tamanhosItem[tamanho] > 0)
    
    if (tamanhosComQuantidade.length === 0) return null

    // Procurar qual tipo de tamanho contém a maior quantidade dos tamanhos usados
    let melhorTipo: TipoTamanho | null = null
    let maiorCompatibilidade = 0

    for (const tipo of tiposTamanho) {
      // Verificar quantos dos tamanhos usados existem neste tipo
      const tamanhosCompativeis = tamanhosComQuantidade.filter(tamanho => 
        tipo.tamanhos && tipo.tamanhos.includes(tamanho)
      )
      
      const compatibilidade = tamanhosCompativeis.length / tamanhosComQuantidade.length
      
      // Se encontrou 100% de compatibilidade, é o tipo correto
      if (compatibilidade === 1.0) {
        return tipo
      }
      
      // Senão, guardar o tipo com maior compatibilidade
      if (compatibilidade > maiorCompatibilidade) {
        maiorCompatibilidade = compatibilidade
        melhorTipo = tipo
      }
    }

    // Retornar o tipo com maior compatibilidade (mínimo 50%)
    return maiorCompatibilidade >= 0.5 ? melhorTipo : null
  }

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

  // Mostrar tabela de tamanhos automaticamente quando um produto for selecionado
  useEffect(() => {
    if (novoItem.produtoId) {
      // Produto selecionado, mostrar tabela de tamanhos
      setNovoItemExpandido(true)
    }
  }, [novoItem.produtoId])

  const handleProdutoChange = async (produtoId: string) => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      // Primeiro, verificar se o produto está na lista local
      const produtoLocal = produtos.find((p) => p.id === produtoId)

      if (produtoLocal) {
        // Se o produto estiver na lista local, use-o diretamente
        setProdutoSelecionado(produtoLocal)
        setNovoItem({
          ...novoItem,
          produtoId,
          produto: produtoLocal,
          valorUnitario: produtoLocal.valorBase,
        })
        setIsLoading(false)
        return
      }

      // Se não estiver na lista local, busque do Supabase
      // Buscar o produto completo
      const { data: produtosData, error: produtoError } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", produtoId)
        .single()

      if (produtoError) {
        throw produtoError
      }

      if (produtosData) {
        // Buscar tecidos do produto
        const { data: tecidosData, error: tecidosError } = await supabase
          .from("tecidos")
          .select("*")
          .eq("produto_id", produtoId)

        if (tecidosError) throw tecidosError

        // Converter para o formato da aplicação
        const produto: Produto = {
          id: produtosData.id,
          nome: produtosData.nome,
          valorBase: Number(produtosData.valor_base),
          tecidos: tecidosData
            ? tecidosData.map((t) => ({
                nome: t.nome,
                composicao: t.composicao || "",
              }))
            : [],
          cores: produtosData.cores || [],
          tamanhosDisponiveis: produtosData.tamanhos_disponiveis || [],
        }

        setProdutoSelecionado(produto)
        setNovoItem({
          ...novoItem,
          produtoId,
          produto,
          valorUnitario: produto.valorBase,
        })
      } else {
        // Produto não encontrado
        setErrorMessage("Produto não encontrado no banco de dados")
        setProdutoSelecionado(null)
        setNovoItem({
          ...novoItem,
          produtoId: "",
          produto: undefined,
          valorUnitario: 0,
        })
      }
    } catch (error) {
      console.error("Erro ao carregar produto:", error)
      setErrorMessage(`Erro ao carregar produto: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      setProdutoSelecionado(null)
      setNovoItem({
        ...novoItem,
        produtoId: "",
        produto: undefined,
        valorUnitario: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Substituir handleEstampaChange por handleEstampasChange
  const handleEstampasChange = (estampas: Estampa[]) => {
    if (editandoItem && itemEmEdicao) {
      setItemEmEdicao({
        ...itemEmEdicao,
        estampas,
      })
    } else {
      setNovoItem({
        ...novoItem,
        estampas,
      })
    }
  }

  const handleAdicionarItem = async () => {
    if (novoItem.produtoId && novoItem.valorUnitario) {
      try {
        setIsLoading(true)

        // Generate UUID for the new item
        const novoItemCompleto = {
          ...(novoItem as ItemOrcamento),
          id: generateUUID(),
          quantidade: novoItem.quantidade || 1,
        }

        // Adicionar item
        await adicionarItem(novoItemCompleto)

        // Limpar formulário
        setNovoItem({
          produtoId: "",
          quantidade: 0,
          valorUnitario: 0,
          tipoTamanhoSelecionado: "",
          tamanhos: { ...tamanhosPadrao },
          imagem: "",
          observacaoComercial: "",
          observacaoTecnica: "",
          estampas: [],
        })
        setProdutoSelecionado(null)
        setTipoTamanhoSelecionado(null)
        setLinhaAtiva(null)
        setNovoItemExpandido(false)

        // Mostrar feedback ao usuário
        toast({
          title: "Produto adicionado",
          description: "O produto foi adicionado com sucesso.",
          duration: 2000,
        })
      } catch (error) {
        console.error("Erro ao adicionar item:", error)
        toast({
          title: "Erro ao adicionar produto",
          description: "Ocorreu um erro ao adicionar o produto. Tente novamente.",
          variant: "destructive",
          duration: 3000,
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const iniciarEdicaoItem = (item: ItemOrcamento) => {
    setItemEmEdicao({ ...item })
    setEditandoItem(item.id)
    
    // Buscar o produto para ter acesso às opções de tecido, cor e tamanho
    if (item.produto) {
      setProdutoSelecionado(item.produto)
    }
    
    // Detectar automaticamente o tipo de tamanho baseado nos tamanhos salvos
    let tipoDetectado: TipoTamanho | null = null
    
    // Primeiro, tentar usar o tipo salvo se existir
    if (item.tipoTamanhoSelecionado) {
      tipoDetectado = tiposTamanho.find(t => t.id === item.tipoTamanhoSelecionado) || null
    }
    
    // Se não encontrou o tipo salvo, detectar automaticamente
    if (!tipoDetectado && item.tamanhos) {
      tipoDetectado = detectarTipoTamanho(item.tamanhos)
      
      if (tipoDetectado) {
        console.log(`✅ Tipo de tamanho detectado automaticamente: ${tipoDetectado.nome}`)
        
        // Atualizar o item com o tipo detectado para salvar na próxima edição
        setItemEmEdicao(prevItem => prevItem ? {
          ...prevItem,
          tipoTamanhoSelecionado: tipoDetectado!.id
        } : null)
      }
    }
    
    setTipoTamanhoSelecionado(tipoDetectado)
    
    if (tipoDetectado) {
      console.log(`📝 Editando item com tipo de tamanho: ${tipoDetectado.nome}`)
    } else {
      console.warn('⚠️ Não foi possível detectar o tipo de tamanho para este item')
    }
  }

  const salvarEdicaoItem = async () => {
    if (itemEmEdicao) {
      try {
        setIsLoading(true)
        await atualizarItem(itemEmEdicao.id, itemEmEdicao)
        setEditandoItem(null)
        setItemEmEdicao(null)
        setProdutoSelecionado(null)
        setTipoTamanhoSelecionado(null)
      } catch (error) {
        console.error("Erro ao salvar item:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const cancelarEdicaoItem = () => {
    setEditandoItem(null)
    setItemEmEdicao(null)
    setProdutoSelecionado(null)
    setTipoTamanhoSelecionado(null)
  }

  const handleTamanhoChange = (tamanho: keyof ItemOrcamento["tamanhos"], valor: number) => {
    if (itemEmEdicao) {
      const novosTamanhos = { ...itemEmEdicao.tamanhos, [tamanho]: valor }
      const novaQuantidade = Object.values(novosTamanhos).reduce((sum, val) => sum + val, 0)

      setItemEmEdicao({
        ...itemEmEdicao,
        tamanhos: novosTamanhos,
        quantidade: novaQuantidade,
      })
    }
  }

  const handleNovoTamanhoChange = (tamanho: keyof ItemOrcamento["tamanhos"], valor: number) => {
    const novosTamanhos = { ...novoItem.tamanhos, [tamanho]: valor }
    const novaQuantidade = Object.values(novosTamanhos).reduce((sum, val) => sum + val, 0)

    setNovoItem({
      ...novoItem,
      tamanhos: novosTamanhos,
      quantidade: novaQuantidade,
    })
  }

  // Manipulador para upload de imagem para novo item
  const handleNovaImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      converterImagemParaBase64(file, (base64) => {
        setNovoItem({ ...novoItem, imagem: base64 })
      })
    }
  }

  // Manipulador para upload de imagem para item em edição
  const handleEditarImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && itemEmEdicao) {
      converterImagemParaBase64(file, (base64) => {
        setItemEmEdicao({ ...itemEmEdicao, imagem: base64 })
      })
    }
  }

  // Manipuladores para tecido e cor
  const handleTecidoChange = (tecidoNome: string) => {
    if (produtoSelecionado) {
      const tecido = produtoSelecionado.tecidos.find((t) => t.nome === tecidoNome)
      if (tecido) {
        if (editandoItem && itemEmEdicao) {
          setItemEmEdicao({
            ...itemEmEdicao,
            tecidoSelecionado: tecido,
          })
        } else {
          setNovoItem({
            ...novoItem,
            tecidoSelecionado: tecido,
          })
        }
      }
    }
  }

  const handleCorChange = (cor: string) => {
    if (editandoItem && itemEmEdicao) {
      setItemEmEdicao({
        ...itemEmEdicao,
        corSelecionada: cor,
      })
    } else {
      setNovoItem({
        ...novoItem,
        corSelecionada: cor,
      })
    }
  }

  const handleTipoTamanhoChange = (tipoTamanhoId: string) => {
    const tipoSelecionado = tiposTamanho.find(t => t.id === tipoTamanhoId)
    setTipoTamanhoSelecionado(tipoSelecionado || null)
    
    // Preservar quantidades dos tamanhos existentes ao mudar o tipo
    const tamanhosAtuais = editandoItem && itemEmEdicao ? itemEmEdicao.tamanhos : novoItem.tamanhos || {}
    const novosTamanhos: Record<string, number> = {}
    
    if (tipoSelecionado && tipoSelecionado.tamanhos) {
      tipoSelecionado.tamanhos.forEach((tamanho) => {
        // Preservar a quantidade se o tamanho já existia, senão usar 0
        novosTamanhos[tamanho] = tamanhosAtuais[tamanho] || 0
      })
    } else {
      // Se não houver tipo selecionado, usar tamanhos padrão preservando quantidades
      Object.keys(tamanhosPadrao).forEach((tamanho) => {
        novosTamanhos[tamanho] = tamanhosAtuais[tamanho] || 0
      })
    }

    // Calcular nova quantidade total
    const novaQuantidade = Object.values(novosTamanhos).reduce((sum, val) => sum + val, 0)

    if (editandoItem && itemEmEdicao) {
      setItemEmEdicao({
        ...itemEmEdicao,
        tipoTamanhoSelecionado: tipoTamanhoId,
        tamanhos: novosTamanhos,
        quantidade: novaQuantidade
      })
      
      console.log(`🔄 Tipo alterado para: ${tipoSelecionado?.nome || 'Padrão'} - Quantidade preservada: ${novaQuantidade}`)
    } else {
      setNovoItem({
        ...novoItem,
        tipoTamanhoSelecionado: tipoTamanhoId,
        tamanhos: novosTamanhos,
        quantidade: novaQuantidade
      })
    }
  }

  // Adicione esta função após a função handleCorChange
  const handleTextUppercase = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Orcamento) => {
    const value = e.target.value.toUpperCase()
    atualizarOrcamento({ [field]: value })
  }

  // Funções para mover itens para cima ou para baixo
  const moverItemParaCima = (index: number) => {
    if (index <= 0) return // Já está no topo

    const novosItens = [...orcamento.itens]
    // Trocar o item atual com o item acima
    const temp = novosItens[index]
    novosItens[index] = novosItens[index - 1]
    novosItens[index - 1] = temp

    // Atualizar o orçamento com a nova ordem
    atualizarOrcamento({ itens: novosItens })
  }

  const moverItemParaBaixo = (index: number) => {
    if (index >= orcamento.itens.length - 1) return // Já está no final

    const novosItens = [...orcamento.itens]
    // Trocar o item atual com o item abaixo
    const temp = novosItens[index]
    novosItens[index] = novosItens[index + 1]
    novosItens[index + 1] = temp

    // Atualizar o orçamento com a nova ordem
    atualizarOrcamento({ itens: novosItens })
  }

  // Função para obter a cor do badge baseado no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "6": return "bg-red-100 text-red-800 border-red-200"
      case "5": return "bg-blue-100 text-blue-800 border-blue-200"
      case "4": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "3": return "bg-orange-100 text-orange-800 border-orange-200"
      case "2": return "bg-green-100 text-green-800 border-green-200"
      case "1": return "bg-gray-100 text-gray-800 border-gray-200"
      default: return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "6": return "Recusada"
      case "5": return "Proposta"
      case "4": return "Execução"
      case "3": return "Emitir Cobrança"
      case "2": return "Entregue"
      case "1": return "Finalizada"
      default: return "Proposta"
    }
  }

  return (
    <div className="max-w-full mx-auto space-y-2">
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="p-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Processando...</span>
            </div>
          </Card>
        </div>
      )}

      {errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full"></div>
              <p className="text-red-700 text-xs md:text-sm font-medium">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid principal com duas colunas - esquerda para dados do orçamento e cliente (1/3), direita para itens (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Coluna da esquerda - Dados do orçamento, cliente e condições */}
        <div className="lg:col-span-1 space-y-3">
          
          {/* Informações básicas do orçamento */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm md:text-base text-primary">Dados do Orçamento</CardTitle>
                </div>
                <Badge className={`${getStatusColor(orcamento.status || "5")} text-xs px-1.5 py-0.5`}>
                  {getStatusText(orcamento.status || "5")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-primary" />
                    <Label className="text-primary text-xs font-medium">Número</Label>
                  </div>
                  <Input
                    value={orcamento.numero.split(" - ")[0]}
                    onChange={(e) => {
                      const numeroAtual = e.target.value
                      const partes = orcamento.numero.split(" - ")
                      if (partes.length > 1) {
                        atualizarOrcamento({ numero: `${numeroAtual} - ${partes.slice(1).join(" - ")}` })
                      } else {
                        atualizarOrcamento({ numero: numeroAtual })
                      }
                    }}
                    className="h-7 font-mono text-center text-xs md:text-sm font-bold text-primary"
                    placeholder="0000"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" />
                    <Label className="text-primary text-xs font-medium">Data</Label>
                  </div>
                  <Input
                    type="date"
                    value={orcamento.data}
                    onChange={(e) => atualizarOrcamento({ data: e.target.value })}
                    className="h-7 text-xs md:text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-primary" />
                    <Label className="text-primary text-xs font-medium">Status</Label>
                  </div>
                  <Select
                    value={orcamento.status || "5"}
                    onValueChange={(value) => atualizarOrcamento({ status: value })}
                  >
                    <SelectTrigger className="h-7 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Finalizada</SelectItem>
                      <SelectItem value="2">2 - Entregue</SelectItem>
                      <SelectItem value="3">3 - Emitir Cobrança</SelectItem>
                      <SelectItem value="4">4 - Execução</SelectItem>
                      <SelectItem value="5">5 - Proposta</SelectItem>
                      <SelectItem value="6">6 - Recusada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-primary" />
                    <Label className="text-primary text-xs font-medium">Frete</Label>
                  </div>
                  <Input
                    type="number"
                    value={orcamento.valorFrete || ""}
                    onChange={(e) => atualizarOrcamento({ valorFrete: e.target.value ? Number(e.target.value) : undefined })}
                    className="h-7 text-xs md:text-sm text-center"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <Label className="text-primary text-xs font-medium">Total do Orçamento</Label>
                </div>
                <div className="h-9 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-md flex items-center justify-center">
                  <span className="font-bold text-sm md:text-base text-primary">
                    R$ {(calcularTotal() + (orcamento.valorFrete || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Cliente */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm md:text-base text-primary">Cliente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div>
                <Label className="text-primary font-medium mb-1 block text-xs">Selecione o Cliente</Label>
                <Select value={orcamento.cliente?.id || ""} onValueChange={handleClienteChange}>
                  <SelectTrigger className="h-9 text-xs md:text-sm w-full min-w-0">
                    <SelectValue placeholder="Escolha um cliente..." />
                  </SelectTrigger>
                  <SelectContent className="w-full min-w-[300px]">
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id} className="w-full">
                        <div className="flex flex-col w-full">
                          <span className="font-medium truncate">{cliente.nome}</span>
                          <span className="text-sm text-gray-500 truncate">{cliente.cnpj}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-primary font-medium mb-1 block text-xs">Nome do Contato</Label>
                  <Input
                    value={orcamento.nomeContato || ""}
                    onChange={(e) => atualizarOrcamento({ nomeContato: e.target.value })}
                    className="h-7 text-xs md:text-sm"
                    placeholder="Nome da pessoa"
                  />
                </div>
                <div>
                  <Label className="text-primary font-medium mb-1 block text-xs">Telefone</Label>
                  <Input
                    value={orcamento.telefoneContato || ""}
                    onChange={(e) => atualizarOrcamento({ telefoneContato: e.target.value })}
                    className="h-7 text-xs md:text-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condições Comerciais */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b py-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm md:text-base text-primary">Condições Comerciais</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div>
                <Label className="text-primary font-medium mb-1 block text-xs">Condições de Pagamento</Label>
                <Input
                  value={orcamento.condicoesPagamento}
                  onChange={(e) => handleTextUppercase(e, "condicoesPagamento")}
                  className="h-7 font-medium text-xs md:text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-primary font-medium mb-1 block text-xs">Prazo de Entrega</Label>
                  <Input
                    value={orcamento.prazoEntrega}
                    onChange={(e) => handleTextUppercase(e, "prazoEntrega")}
                    className="h-7 text-xs md:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-primary font-medium mb-1 block text-xs">Validade</Label>
                  <Input
                    value={orcamento.validadeOrcamento}
                    onChange={(e) => handleTextUppercase(e, "validadeOrcamento")}
                    className="h-7 text-xs md:text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm md:text-base text-primary">Observações</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div>
                <Label className="text-primary font-medium mb-1 block text-xs">Observações Gerais</Label>
                <Textarea
                  value={orcamento.observacoes}
                  onChange={(e) => atualizarOrcamento({ observacoes: e.target.value })}
                  rows={3}
                  className="resize-none text-xs md:text-sm"
                  placeholder="Adicione observações relevantes para o orçamento..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da direita - Itens do orçamento */}
        <div className="lg:col-span-2">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm md:text-base text-primary">Itens do Orçamento</CardTitle>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <span className="animate-bounce">🔄</span>
                  <span className="hidden md:inline">Arraste para reordenar</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">

            <div className="border rounded-md overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] table-fixed">
                  <thead className="bg-primary text-white">
                  <tr>
                  <th className="p-1 md:p-2 w-[50px] rounded-tl-md"></th>
                  <th className="text-left p-1 md:p-2 w-[250px] text-xs md:text-sm">Produto</th>
                  <th className="text-center p-1 md:p-2 w-[150px] text-xs md:text-sm">Tamanhos</th>
                  <th className="text-center p-1 md:p-2 w-[100px] text-xs md:text-sm">Valor Unit.</th>
                  <th className="text-center p-1 md:p-2 w-[80px] text-xs md:text-sm">Qtd.</th>
                  <th className="text-right p-1 md:p-2 w-[120px] text-xs md:text-sm">Total</th>
                  <th className="p-1 md:p-2 w-[120px] rounded-tr-md text-center text-xs md:text-sm">Ações</th>
                  </tr>
                  </thead>
                  <tbody>
                    {orcamento.itens.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {dragOverItemId === item.id && (
                          <tr className="border-t">
                            <td colSpan={7} className="p-0">
                              <div className="h-1 bg-primary animate-pulse rounded-full mx-2"></div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`border-t hover:bg-accent/30 transition-colors ${
                            editandoItem === item.id ? "bg-accent/50" : ""
                          }`}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item.id)
                            e.currentTarget.classList.add("opacity-50")
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.classList.remove("opacity-50")
                            setDragOverItemId(null)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = "move"
                            if (dragOverItemId !== item.id) {
                              setDragOverItemId(item.id)
                            }
                          }}
                          onDragLeave={(e) => {
                            // Verificar se realmente saiu do elemento (e não apenas entrou em um filho)
                            const relatedTarget = e.relatedTarget as Node
                            if (!e.currentTarget.contains(relatedTarget)) {
                              setDragOverItemId(null)
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOverItemId(null)
                            const draggedItemId = e.dataTransfer.getData("text/plain")
                            const draggedIndex = orcamento.itens.findIndex((i) => i.id === draggedItemId)
                            const targetIndex = index

                            if (draggedIndex !== targetIndex) {
                              const novosItens = [...orcamento.itens]
                              const [itemRemovido] = novosItens.splice(draggedIndex, 1)
                              novosItens.splice(targetIndex, 0, itemRemovido)
                              atualizarOrcamento({ itens: novosItens })

                              // Mostrar toast de confirmação
                              toast({
                                title: "Item reordenado",
                                description: "A ordem dos itens foi atualizada e salva com sucesso.",
                                duration: 2000,
                              })
                            }
                          }}
                        >
                          <td className="p-1 md:p-2 text-center">
                            <div
                              className="flex flex-col items-center gap-0.5 cursor-grab"
                              title="Arraste para reordenar"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moverItemParaCima(index)}
                                disabled={index === 0 || isLoading}
                                className="h-5 w-5 rounded-full hover:bg-primary/10"
                                title="Mover para cima"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moverItemParaBaixo(index)}
                                disabled={index === orcamento.itens.length - 1 || isLoading}
                                className="h-5 w-5 rounded-full hover:bg-primary/10"
                                title="Mover para baixo"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-1 md:p-2">
                            <div className="text-xs md:text-sm font-medium">{item.produto?.nome}</div>
                            {item.observacaoComercial && (
                              <div className="text-xs mt-0.5 text-gray-600 italic">{item.observacaoComercial}</div>
                            )}
                          </td>
                          <td className="p-1 md:p-2">
                            <div className="flex flex-wrap gap-1">
                              {ordenarTamanhos(item.tamanhos || {}).map(([tamanho, quantidade]) => (
                                <span
                                  key={tamanho}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                  title={`${tamanho}: ${quantidade} unidades`}
                                >
                                  {tamanho}-{quantidade}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-1 md:p-2 text-center">
                            {editandoItem === item.id ? (
                              <Input
                                type="number"
                                value={itemEmEdicao?.valorUnitario || 0}
                                onChange={(e) =>
                                  setItemEmEdicao({
                                    ...itemEmEdicao!,
                                    valorUnitario: Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-7 text-center w-20 md:w-24 text-xs border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <span className="flex items-center justify-center gap-1 text-xs md:text-sm">
                                <DollarSign className="h-3 w-3 text-gray-500" />
                                {item.valorUnitario.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-1 md:p-2 text-center font-medium text-xs md:text-sm">{item.quantidade}</td>
                          <td className="p-1 md:p-2 text-right font-medium">
                            <span className="flex items-center justify-end gap-1 text-xs md:text-sm">
                              <DollarSign className="h-3 w-3 text-gray-500" />
                              {(item.quantidade * item.valorUnitario).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-1 md:p-2 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {editandoItem === item.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-success hover:text-success hover:bg-success/10"
                                    onClick={salvarEdicaoItem}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                    onClick={cancelarEdicaoItem}
                                    disabled={isLoading}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-primary hover:text-primary-dark hover:bg-primary/10"
                                    onClick={() => iniciarEdicaoItem(item)}
                                    disabled={isLoading}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removerItem(item.id)}
                                    className="h-6 w-6 text-gray-500 hover:text-red-500 hover:bg-red-50"
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {editandoItem === item.id && itemEmEdicao && (
                          <tr>
                            <td colSpan={7} className="p-3 bg-accent/50 border-t border-b">
                              <div className="space-y-3">
                                {/* Linha 1: Tecido, Cor e Tipo de Tamanho */}
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    {produtoSelecionado?.tecidos && produtoSelecionado.tecidos.length > 0 && (
                                      <div>
                                        <Label htmlFor="tecido" className="text-primary text-xs mb-1">
                                          Tecido
                                        </Label>
                                        <Select
                                          value={itemEmEdicao.tecidoSelecionado?.nome || ""}
                                          onValueChange={handleTecidoChange}
                                        >
                                          <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary">
                                            <SelectValue placeholder="Selecione o tecido" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {produtoSelecionado.tecidos.map((tecido) => (
                                              <SelectItem key={tecido.nome} value={tecido.nome}>
                                                {tecido.nome} {tecido.composicao ? `- ${tecido.composicao}` : ""}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    {produtoSelecionado?.cores && produtoSelecionado.cores.length > 0 && (
                                      <div>
                                        <Label htmlFor="cor" className="text-primary text-xs mb-1">
                                          Cor
                                        </Label>
                                        <Select value={itemEmEdicao.corSelecionada || ""} onValueChange={handleCorChange}>
                                          <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary">
                                            <SelectValue placeholder="Selecione a cor" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {produtoSelecionado.cores.map((cor) => (
                                              <SelectItem key={cor} value={cor}>
                                                {cor}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <Label htmlFor="tipo-tamanho-edit" className="text-primary text-xs mb-1">
                                      Tipo de Tamanho
                                    </Label>
                                    <Select 
                                      value={itemEmEdicao.tipoTamanhoSelecionado || ""} 
                                      onValueChange={handleTipoTamanhoChange}
                                    >
                                      <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary">
                                        <SelectValue placeholder="Selecione o tipo de tamanho" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {tiposTamanho.map((tipo) => (
                                          <SelectItem key={tipo.id} value={tipo.id}>
                                            {tipo.nome} - {tipo.descricao}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Linha 2: Tabela de tamanhos */}
                                {(itemEmEdicao.tipoTamanhoSelecionado || tipoTamanhoSelecionado) ? (
                                  renderTabelaTamanhos(
                                    itemEmEdicao.tamanhos || {},
                                    itemEmEdicao.quantidade || 0,
                                    true,
                                    handleTamanhoChange,
                                    tiposTamanho.find(t => t.id === (itemEmEdicao.tipoTamanhoSelecionado || tipoTamanhoSelecionado?.id))
                                  )
                                ) : (
                                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
                                    <Ruler className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">Detectando tipo de tamanho automaticamente...</p>
                                  </div>
                                )}

                                {/* Linha 3: Observações lado a lado */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="observacaoComercial" className="text-primary text-xs mb-1">
                                      Observação Comercial
                                    </Label>
                                    <Textarea
                                      id="observacaoComercial"
                                      value={itemEmEdicao.observacaoComercial || ""}
                                      onChange={(e) =>
                                        setItemEmEdicao({
                                          ...itemEmEdicao,
                                          observacaoComercial: e.target.value,
                                        })
                                      }
                                      className="h-16 text-xs border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                      placeholder="Observações para o cliente..."
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="observacaoTecnica" className="text-primary text-xs mb-1">
                                      Observação Técnica
                                    </Label>
                                    <Textarea
                                      id="observacaoTecnica"
                                      value={itemEmEdicao.observacaoTecnica || ""}
                                      onChange={(e) =>
                                        setItemEmEdicao({
                                          ...itemEmEdicao,
                                          observacaoTecnica: e.target.value,
                                        })
                                      }
                                      className="h-16 text-xs border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                      placeholder="Observações técnicas..."
                                    />
                                  </div>
                                </div>

                                {/* Linha 4: Estampas com largura total */}
                                <div>
                                  <Label className="text-primary text-xs mb-1">Estampas</Label>
                                  <div className="overflow-visible">
                                    <EstampaInput
                                      estampas={itemEmEdicao.estampas || []}
                                      onChange={handleEstampasChange}
                                    />
                                  </div>
                                </div>

                                {/* Linha 5: Imagem para Ficha Técnica */}
                                <GerenciadorImagem
                                  imagem={itemEmEdicao.imagem}
                                  onChange={(novaImagem) => setItemEmEdicao({ ...itemEmEdicao, imagem: novaImagem })}
                                  inputRef={editImagemInputRef}
                                  isEditing={true}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Adicionar linha de destaque no final da lista */}
                    {dragOverItemId === "end-of-list" && (
                      <tr className="border-t">
                        <td colSpan={7} className="p-0">
                          <div className="h-1 bg-primary animate-pulse rounded-full mx-2"></div>
                        </td>
                      </tr>
                    )}
                    <tr
                      className="border-t hover:bg-accent/30 transition-colors"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "move"
                        if (dragOverItemId !== "end-of-list") {
                          setDragOverItemId("end-of-list")
                        }
                      }}
                      onDragLeave={(e) => {
                        const relatedTarget = e.relatedTarget as Node
                        if (!e.currentTarget.contains(relatedTarget)) {
                          setDragOverItemId(null)
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOverItemId(null)
                        const draggedItemId = e.dataTransfer.getData("text/plain")
                        const draggedIndex = orcamento.itens.findIndex((i) => i.id === draggedItemId)

                        // Mover para o final da lista
                        if (draggedIndex !== -1 && draggedIndex !== orcamento.itens.length - 1) {
                          const novosItens = [...orcamento.itens]
                          const [itemRemovido] = novosItens.splice(draggedIndex, 1)
                          novosItens.push(itemRemovido)
                          atualizarOrcamento({ itens: novosItens })

                          // Mostrar toast de confirmação
                          toast({
                            title: "Item reordenado",
                            description: "O item foi movido para o final da lista.",
                            duration: 2000,
                          })
                        }
                      }}
                    >
                      <td className="p-3"></td>
                      <td className="p-3" onClick={() => setLinhaAtiva("novo")}>
                        {linhaAtiva === "novo" ? (
                          <Select value={novoItem.produtoId || ""} onValueChange={handleProdutoChange}>
                            <SelectTrigger className="h-9 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary">
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map((produto) => (
                                <SelectItem key={produto.id} value={produto.id}>
                                  {produto.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-primary h-9 hover:bg-primary/10 hover:text-primary-dark"
                            onClick={() => setLinhaAtiva("novo")}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar item...
                          </Button>
                        )}
                      </td>
                      <td className="p-3">
                        {linhaAtiva === "novo" && (
                          <div className="text-center text-gray-500 text-sm">
                            {novoItemExpandido && tipoTamanhoSelecionado ? "Ver abaixo" : "-"}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {linhaAtiva === "novo" && (
                          <Input
                            type="number"
                            value={novoItem.valorUnitario || ""}
                            onChange={(e) =>
                              setNovoItem({ ...novoItem, valorUnitario: Number.parseFloat(e.target.value) })
                            }
                            className="h-9 text-center border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="0,00"
                          />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {linhaAtiva === "novo" && (
                          <div className="text-center font-medium">{novoItem.quantidade || 0}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {linhaAtiva === "novo" && novoItem.valorUnitario && novoItem.quantidade ? (
                          <span className="flex items-center justify-end gap-1">
                            <DollarSign className="h-3 w-3 text-gray-500" />
                            {(novoItem.quantidade * novoItem.valorUnitario).toFixed(2)}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {linhaAtiva === "novo" && (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleAdicionarItem}
                              disabled={isLoading || !novoItem.produtoId || !novoItem.valorUnitario}
                              className="h-8 w-8 text-white bg-primary hover:bg-primary-dark disabled:bg-gray-300"
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Formulário expandido para novo item */}
                    {linhaAtiva === "novo" && novoItem.produtoId && (
                      <tr>
                        <td colSpan={7} className="p-3 bg-accent/20 border-t">
                          <div className="space-y-3">
                            {/* Linha 1: Tecido, Cor e Tipo de Tamanho */}
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                {produtoSelecionado?.tecidos && produtoSelecionado.tecidos.length > 0 && (
                                  <div>
                                    <Label htmlFor="tecido-novo" className="text-primary text-xs mb-1">
                                      Tecido
                                    </Label>
                                    <Select
                                      value={novoItem.tecidoSelecionado?.nome || ""}
                                      onValueChange={handleTecidoChange}
                                    >
                                      <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-primary">
                                        <SelectValue placeholder="Selecione o tecido" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {produtoSelecionado.tecidos.map((tecido) => (
                                          <SelectItem key={tecido.nome} value={tecido.nome}>
                                            {tecido.nome} {tecido.composicao ? `- ${tecido.composicao}` : ""}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {produtoSelecionado?.cores && produtoSelecionado.cores.length > 0 && (
                                  <div>
                                    <Label htmlFor="cor-novo" className="text-primary text-xs mb-1">
                                      Cor
                                    </Label>
                                    <Select value={novoItem.corSelecionada || ""} onValueChange={handleCorChange}>
                                      <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-primary">
                                        <SelectValue placeholder="Selecione a cor" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {produtoSelecionado.cores.map((cor) => (
                                          <SelectItem key={cor} value={cor}>
                                            {cor}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="tipo-tamanho-novo" className="text-primary text-xs mb-1">
                                  Tipo de Tamanho
                                </Label>
                                <Select 
                                  value={novoItem.tipoTamanhoSelecionado || ""} 
                                  onValueChange={handleTipoTamanhoChange}
                                >
                                  <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-primary">
                                    <SelectValue placeholder="Selecione o tipo de tamanho" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tiposTamanho.map((tipo) => (
                                      <SelectItem key={tipo.id} value={tipo.id}>
                                        {tipo.nome} - {tipo.descricao}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Linha 2: Tabela de tamanhos */}
                            {novoItem.tipoTamanhoSelecionado ? (
                              renderTabelaTamanhos(
                                novoItem.tamanhos || {},
                                novoItem.quantidade || 0,
                                true,
                                handleNovoTamanhoChange,
                                tiposTamanho.find(t => t.id === novoItem.tipoTamanhoSelecionado)
                              )
                            ) : (
                              <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
                                <Ruler className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">Selecione um tipo de tamanho para continuar</p>
                              </div>
                            )}

                            {/* Linha 3: Observações */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="observacaoComercial-novo" className="text-primary text-xs mb-1">
                                  Observação Comercial
                                </Label>
                                <Textarea
                                  id="observacaoComercial-novo"
                                  value={novoItem.observacaoComercial || ""}
                                  onChange={(e) => setNovoItem({ ...novoItem, observacaoComercial: e.target.value })}
                                  className="h-16 text-xs border-gray-300 focus:border-primary resize-none"
                                  placeholder="Observações para o cliente..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="observacaoTecnica-novo" className="text-primary text-xs mb-1">
                                  Observação Técnica
                                </Label>
                                <Textarea
                                  id="observacaoTecnica-novo"
                                  value={novoItem.observacaoTecnica || ""}
                                  onChange={(e) => setNovoItem({ ...novoItem, observacaoTecnica: e.target.value })}
                                  className="h-16 text-xs border-gray-300 focus:border-primary resize-none"
                                  placeholder="Observações técnicas..."
                                />
                              </div>
                            </div>

                            {/* Linha 4: Estampas */}
                            <div>
                              <Label className="text-primary text-xs mb-1">Estampas</Label>
                              <EstampaInput estampas={novoItem.estampas || []} onChange={handleEstampasChange} />
                            </div>

                            {/* Linha 5: Imagem */}
                            <GerenciadorImagem
                              imagem={novoItem.imagem}
                              onChange={(novaImagem) => setNovoItem({ ...novoItem, imagem: novaImagem })}
                              inputRef={novoImagemInputRef}
                              isEditing={true}
                            />

                            {/* Botões de ação */}
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLinhaAtiva(null)
                                  setNovoItem({
                                    produtoId: "",
                                    quantidade: 0,
                                    valorUnitario: 0,
                                    tipoTamanhoSelecionado: "",
                                    tamanhos: { ...tamanhosPadrao },
                                    imagem: "",
                                    observacaoComercial: "",
                                    observacaoTecnica: "",
                                    estampas: [],
                                  })
                                  setProdutoSelecionado(null)
                                  setTipoTamanhoSelecionado(null)
                                }}
                                className="h-8"
                              >
                                <X className="h-4 w-4 mr-1" /> Cancelar
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={handleAdicionarItem}
                                disabled={isLoading || !novoItem.produtoId || !novoItem.valorUnitario}
                                className="h-8 bg-primary hover:bg-primary-dark"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-1" />
                                )}
                                Adicionar Item
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-primary text-white">
                    <tr>
                      <td colSpan={5} className="p-3 text-right font-medium">
                        Valor dos Produtos:
                      </td>
                      <td className="p-3 text-right font-medium">R$ {calcularTotal().toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-3 text-right font-medium">
                        Valor do Frete:
                      </td>
                      <td className="p-3 text-right font-medium">R$ {(orcamento.valorFrete || 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-3 text-right font-bold">
                        Total do Orçamento:
                      </td>
                      <td className="p-3 text-right font-bold">
                        R$ {(calcularTotal() + (orcamento.valorFrete || 0)).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {/* Botão de salvar */}
            {(salvarNovoOrcamento || atualizarOrcamentoExistente) && (
              <div className="mt-4 flex justify-end border-t pt-4">
                <Button
                  onClick={orcamentoSalvo ? atualizarOrcamentoExistente : salvarNovoOrcamento}
                  disabled={loading || !orcamento.cliente}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {orcamentoSalvo ? "Atualizar" : "Salvar"} Orçamento
                </Button>
              </div>
            )}
            
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

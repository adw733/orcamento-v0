"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  FileText,
  Search,
  Calendar,
  Loader2,
  PlusCircle,
  Eye,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileDown,
  AlertCircle,
  Edit3,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { useDataCache } from "@/lib/data-cache"
import type { Orcamento } from "@/types/types"

interface ListaOrcamentosProps {
  onSelectOrcamento: (orcamentoId: string) => void
  onNovoOrcamento: () => void
  onDeleteOrcamento: (orcamentoId: string) => Promise<void>
  onUpdateStatus?: (orcamentoId: string, status: string) => Promise<void>
  onExportOrcamento?: (orcamentoId: string, tipoExportacao: "completo" | "ficha") => Promise<void>
  onAbrirOtimizado?: (orcamentoId: string) => void
  reloadRef?: React.MutableRefObject<(() => Promise<void>) | null>
  filtroStatus?: string
}

export default function ListaOrcamentos({
  onSelectOrcamento,
  onNovoOrcamento,
  onDeleteOrcamento,
  reloadRef,
  onUpdateStatus,
  onExportOrcamento,
  onAbrirOtimizado,
  filtroStatus,
}: ListaOrcamentosProps) {
  // Usar cache global para orçamentos
  const { orcamentosLista, orcamentosLoading, reloadOrcamentos, invalidateOrcamento, removeOrcamentoFromList } = useDataCache()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(filtroStatus || "4")
  const [error, setError] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Estados para ordenação
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: "asc" | "desc" }>({
    campo: "numero",
    direcao: "desc",
  })

  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const ITENS_POR_PAGINA = 15

  // Converter dados do cache para formato esperado pelo componente
  const orcamentos = useMemo(() => {
    return orcamentosLista.map(orc => ({
      id: orc.id,
      numero: orc.numero,
      data: orc.data,
      prazoEntrega: orc.prazo_entrega || "30 DIAS",
      cliente: orc.cliente ? {
        id: orc.cliente.id,
        nome: orc.cliente.nome,
        cnpj: orc.cliente.cnpj || "",
      } : null,
      itens: orc.itens || [],
      created_at: orc.created_at,
      updated_at: orc.updated_at,
      status: orc.status || "5",
      valorFrete: orc.valorFrete || 0,
      nomeContato: orc.nomeContato || "",
      telefoneContato: orc.telefoneContato || "",
    }))
  }, [orcamentosLista])

  // Definir o filtro inicial baseado na prop filtroStatus
  useEffect(() => {
    if (filtroStatus) {
      setStatusFilter(filtroStatus)
    }
  }, [filtroStatus])

  // Expor a função de recarregar para o componente pai
  useEffect(() => {
    if (reloadRef) {
      reloadRef.current = reloadOrcamentos
    }
  }, [reloadRef, reloadOrcamentos])

  // Adicionar uma função para verificar se todos os itens têm imagens
  // Adicionar esta função antes da função calcularTotal
  const verificarImagensFaltantes = (orcamento: Partial<Orcamento>) => {
    if (!orcamento.itens || !Array.isArray(orcamento.itens)) return false

    // Verificar se algum item não tem imagem
    return orcamento.itens.some((item) => !item.imagem)
  }

  // Modificar a função calcularDataEntrega para incluir a classe de cor
  const calcularDataEntrega = (dataOrcamento?: string, prazoEntrega?: string): { data: string; className: string } => {
    if (!dataOrcamento) return { data: "-", className: "" }

    // Converter a data do orçamento para um objeto Date
    const data = new Date(`${dataOrcamento}T12:00:00`)

    // Extrair o número de dias do prazo de entrega
    let diasAdicionais = 0
    if (prazoEntrega) {
      // Tentar extrair o número de dias do prazo (ex: "45 DIAS", "30 DIAS ÚTEIS", etc.)
      const match = prazoEntrega.match(/(\d+)/)
      if (match && match[1]) {
        diasAdicionais = Number.parseInt(match[1], 10)
      }
    }

    // Se não conseguir extrair um número válido, usar 30 dias como padrão
    if (isNaN(diasAdicionais) || diasAdicionais <= 0) {
      diasAdicionais = 30
    }

    // Adicionar os dias ao objeto Date
    data.setDate(data.getDate() + diasAdicionais)

    // Determinar a classe de cor com base na proximidade da data
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0) // Resetar horas para comparação apenas de datas

    const umaSemanaDepois = new Date(hoje)
    umaSemanaDepois.setDate(hoje.getDate() + 7)

    let className = ""

    if (data < hoje) {
      // Data de entrega já passou
      className = "text-red-600 font-medium"
    } else if (data <= umaSemanaDepois) {
      // Faltam menos de 7 dias
      className = "text-amber-600 font-medium"
    } else {
      // Mais de 7 dias
      className = "text-green-600 font-medium"
    }

    // Formatar a data de entrega
    return {
      data: data.toLocaleDateString("pt-BR"),
      className,
    }
  }

  // Função carregarOrcamentos removida - agora usa cache global via useDataCache

  const calcularTotal = (orcamento: Partial<Orcamento>) => {
    if (!orcamento.itens || !Array.isArray(orcamento.itens)) return 0

    // Calcular o total dos itens com desconto unitário
    const totalItens = orcamento.itens.reduce((total, item) => {
      const descontoPercentual = item.descontoUnitarioPercentual || 0
      const valorUnitario = (item.valorUnitario || 0) * (1 - descontoPercentual / 100)
      return total + (item.quantidade || 0) * valorUnitario
    }, 0)

    // Adicionar o valor do frete, se existir
    const valorFrete = orcamento.valorFrete || 0

    // Retornar o total (itens + frete)
    return totalItens + valorFrete
  }

  const atualizarStatusOrcamento = async (orcamentoId: string, novoStatus: string) => {
    try {
      const { error } = await supabase.from("orcamentos").update({ status: novoStatus }).eq("id", orcamentoId)

      if (error) {
        console.error("Erro ao atualizar status:", error)
        return
      }

      // Invalidar cache e recarregar para refletir a mudança
      invalidateOrcamento(orcamentoId)
      await reloadOrcamentos()

      // Chamar a função de callback se existir
      if (onUpdateStatus) {
        await onUpdateStatus(orcamentoId, novoStatus)
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
    }
  }

  // Função para alternar a ordenação
  const alternarOrdenacao = (campo: string) => {
    if (ordenacao.campo === campo) {
      setOrdenacao({
        campo,
        direcao: ordenacao.direcao === "asc" ? "desc" : "asc",
      })
    } else {
      setOrdenacao({
        campo,
        direcao: "asc",
      })
    }
  }

  // Funções auxiliares movidas para antes de filtrarOrcamentos
  const extrairNumeroOrcamento = (numeroCompleto?: string) => {
    if (!numeroCompleto) return ""
    const match = numeroCompleto.match(/^\d+/)
    return match ? match[0] : numeroCompleto
  }

  const extrairNumeroDiasPrazo = (prazoEntrega?: string): number => {
    if (!prazoEntrega) return 30
    const match = prazoEntrega.match(/(\d+)/)
    if (match && match[1]) {
      return Number.parseInt(match[1], 10)
    }
    return 30
  }

  const mapearStatusAntigo = (status: string): string => {
    switch (status) {
      case "proposta":
        return "5"
      case "execucao":
        return "4"
      case "finalizado":
        return "1"
      default:
        return status
    }
  }

  const calcularDataEntregaParaOrdenacao = (dataOrcamento?: string, prazoEntrega?: string): Date => {
    if (!dataOrcamento) return new Date(0)
    const data = new Date(`${dataOrcamento}T12:00:00`)
    let diasAdicionais = 0
    if (prazoEntrega) {
      const match = prazoEntrega.match(/(\d+)/)
      if (match && match[1]) {
        diasAdicionais = Number.parseInt(match[1], 10)
      }
    }
    if (isNaN(diasAdicionais) || diasAdicionais <= 0) {
      diasAdicionais = 30
    }
    data.setDate(data.getDate() + diasAdicionais)
    return data
  }

  const filtrarOrcamentos = () => {
    let resultado = orcamentos

    // Filtrar por termo de busca
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const terms = normalizedSearchTerm.split(' ').filter(term => term.trim() !== '');

      resultado = resultado.filter((orcamento) => {
        const searchableContent = [
          orcamento.numero,
          orcamento.cliente?.nome,
          orcamento.nomeContato,
        ]
          .join(' ')
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return terms.every(term => searchableContent.includes(term));
      });
    }

    // Filtrar por status
    if (statusFilter !== "todos") {
      resultado = resultado.filter((orcamento) => {
        // Mapear status antigos para novos códigos numéricos
        const statusMapeado = mapearStatusAntigo(orcamento.status || "")
        return statusMapeado === statusFilter
      })
    }

    // Ordenar os resultados
    resultado = resultado.sort((a, b) => {
      let valorA, valorB

      switch (ordenacao.campo) {
        case "numero":
          // Extrair apenas os números para comparação numérica
          valorA = Number.parseInt(extrairNumeroOrcamento(a.numero || "0"), 10) || 0
          valorB = Number.parseInt(extrairNumeroOrcamento(b.numero || "0"), 10) || 0
          break
        case "data":
          valorA = a.data || ""
          valorB = b.data || ""
          break
        case "dataEntrega":
          // Calcular as datas de entrega para comparação
          const dataEntregaA = calcularDataEntregaParaOrdenacao(a.data, a.prazoEntrega)
          const dataEntregaB = calcularDataEntregaParaOrdenacao(b.data, b.prazoEntrega)
          valorA = dataEntregaA
          valorB = dataEntregaB
          break
        case "cliente":
          valorA = a.cliente?.nome || ""
          valorB = b.cliente?.nome || ""
          break
        case "valor":
          valorA = calcularTotal(a)
          valorB = calcularTotal(b)
          break
        case "status":
          valorA = a.status || ""
          valorB = b.status || ""
          break
        case "created_at":
        default:
          valorA = a.created_at || ""
          valorB = b.created_at || ""
        case "prazoDias":
          valorA = extrairNumeroDiasPrazo(a.prazoEntrega)
          valorB = extrairNumeroDiasPrazo(b.prazoEntrega)
          break
      }

      if (ordenacao.campo === "numero" || ordenacao.campo === "valor") {
        // Comparação numérica
        return ordenacao.direcao === "asc"
          ? (valorA as number) - (valorB as number)
          : (valorB as number) - (valorA as number)
      } else if (typeof valorA === "string" && typeof valorB === "string") {
        // Comparação de strings
        return ordenacao.direcao === "asc" ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA)
      } else {
        // Fallback para outros tipos
        return ordenacao.direcao === "asc"
          ? (valorA as number) - (valorB as number)
          : (valorB as number) - (valorA as number)
      }
    })

    return resultado
  }

  // Dados paginados com memoização
  const { dadosPaginados, totalPaginas, totalItens } = useMemo(() => {
    const filtrados = filtrarOrcamentos()
    const total = filtrados.length
    const paginas = Math.ceil(total / ITENS_POR_PAGINA)
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    const fim = inicio + ITENS_POR_PAGINA
    return {
      dadosPaginados: filtrados.slice(inicio, fim),
      totalPaginas: paginas,
      totalItens: total
    }
  }, [paginaAtual, orcamentos, searchTerm, statusFilter, ordenacao])

  // Reset página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1)
  }, [searchTerm, statusFilter])

  const formatarData = (dataString?: string) => {
    if (!dataString) return ""
    // Adicionar o horário para evitar problemas de fuso horário
    const data = new Date(`${dataString}T12:00:00`)
    return data.toLocaleDateString("pt-BR")
  }

  // Modificar a função getStatusClassName para incluir os novos status
  const getStatusClassName = (status: string) => {
    switch (status) {
      case "6":
        return "bg-red-100 text-red-700 border-red-300"
      case "5":
      case "proposta":
        return "bg-blue-100 text-blue-700 border-blue-300"
      case "4":
      case "execucao":
        return "bg-amber-100 text-amber-700 border-amber-300"
      case "1":
      case "finalizado":
        return "bg-green-100 text-green-700 border-green-300"
      case "2":
      case "entregue":
        return "bg-purple-100 text-purple-700 border-purple-300"
      case "3":
      case "cobranca":
        return "bg-red-100 text-red-700 border-red-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  const formatarDescricaoPedido = (numeroCompleto: string, nomeContato?: string) => {
    // Extrair as partes do formato "0129 - CAMISA SOCIAL MASCULINA MANGA LONGA MIZU CIMENTOS - WILLIAN"
    const partes = numeroCompleto.split(" - ")
    if (partes.length >= 2) {
      const numero = partes[0] // "0129"

      // Extrair a empresa do nome do produto (assumindo que são as últimas 2-3 palavras)
      const produtoParts = partes[1].split(" ")
      let empresa = ""

      // Se o produto tem pelo menos 3 palavras, pegamos as últimas 2-3 como empresa
      if (produtoParts.length >= 3) {
        // Pegar as últimas 2 ou 3 palavras como empresa
        const palavrasEmpresa = produtoParts.slice(-Math.min(3, Math.floor(produtoParts.length / 2)))
        empresa = palavrasEmpresa.join(" ")
      } else {
        empresa = partes[1] // Se for curto, usar todo o texto
      }

      // Adicionar o nome do contato se disponível
      return nomeContato ? `${numero} - ${empresa} - ${nomeContato}` : `${numero} - ${empresa}`
    }
    return numeroCompleto
  }

  // Função simplificada para resumir produtos sem pluralização e sem quantidades
  const resumirProdutosDoOrcamento = (orcamento: Partial<Orcamento>): string => {
    if (!orcamento.itens || !Array.isArray(orcamento.itens) || orcamento.itens.length === 0) return ""

    // Extrair apenas as categorias principais dos produtos
    const categoriasProdutos = new Set<string>()

    orcamento.itens.forEach((item) => {
      // Obter o nome do produto de qualquer fonte disponível
      let nomeProduto = ""
      if (item.produtoNome) {
        nomeProduto = item.produtoNome
      } else if (item.descricao) {
        const partes = item.descricao.split(" - ")
        if (partes.length >= 2) {
          nomeProduto = partes[1]
        } else {
          nomeProduto = item.descricao
        }
      } else if (item.produto && typeof item.produto === "object" && item.produto.nome) {
        nomeProduto = item.produto.nome
      }

      if (!nomeProduto) return

      // Extrair apenas a categoria principal (primeira ou duas primeiras palavras)
      const palavras = nomeProduto.split(" ")
      let categoria = ""

      // Lista de tipos de vestuário comuns
      const tiposVestuario = [
        "CAMISA",
        "CAMISETA",
        "CALÇA",
        "JAQUETA",
        "COLETE",
        "JALECO",
        "MACACÃO",
        "UNIFORME",
        "BONÉ",
        "CHAPÉU",
        "AVENTAL",
      ]

      // Se a primeira palavra for um tipo de vestuário conhecido
      if (palavras.length > 0 && tiposVestuario.includes(palavras[0])) {
        // Qualificadores comuns que podem ser incluídos
        const qualificadores = ["SOCIAL", "POLO", "OPERACIONAL", "EXECUTIVA"]

        if (palavras.length > 1 && qualificadores.includes(palavras[1])) {
          // Se a segunda palavra for um qualificador importante, incluí-la
          categoria = `${palavras[0]} ${palavras[1]}`
        } else {
          // Caso contrário, usar apenas o tipo de vestuário
          categoria = palavras[0]
        }
      } else if (palavras.length > 0) {
        // Para outros tipos de produtos, usar apenas a primeira palavra
        categoria = palavras[0]
      }

      // Adicionar a categoria ao conjunto (sem pluralização)
      if (categoria) {
        categoriasProdutos.add(categoria)
      }
    })

    // Se não encontrou categorias
    if (categoriasProdutos.size === 0) return ""

    // Converter o conjunto em array e limitar a 5 categorias para não ficar muito longo
    const categoriasArray = Array.from(categoriasProdutos).slice(0, 5)

    // Se houver mais categorias além das 5 principais
    if (categoriasProdutos.size > 5) {
      categoriasArray.push("OUTROS")
    }

    // Juntar as categorias com " / "
    return categoriasArray.join(" / ")
  }

  const exportarOrcamento = async (orcamentoId: string, tipoExportacao: string) => {
    if (onExportOrcamento) {
      await onExportOrcamento(orcamentoId, tipoExportacao as "completo" | "ficha")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h3 className="text-lg font-medium text-primary flex items-center gap-2">
          <span className="bg-primary text-white p-1 rounded-md text-xs">ORÇAMENTOS</span>
          Orçamentos Salvos
        </h3>
        <span className="text-sm text-gray-500">{orcamentos.length} orçamentos</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
          <p className="text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={reloadOrcamentos}
            className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nº, empresa ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>
        <Button
          onClick={onNovoOrcamento}
          className="bg-primary hover:bg-primary-dark text-white transition-colors w-full lg:w-auto whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Novo Orçamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Modificar os botões de filtro de status */}
      <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 overflow-x-auto pb-2">
        <Button
          variant={statusFilter === "todos" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("todos")}
          className={`text-xs whitespace-nowrap ${statusFilter === "todos" ? "bg-primary text-white" : ""}`}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === "6" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("6")}
          className={`text-xs whitespace-nowrap ${statusFilter === "6"
            ? "bg-red-500 text-white"
            : "text-red-500 border-red-500 hover:bg-red-50"
            }`}
        >
          <span className="hidden sm:inline">6 - Recusada</span>
          <span className="sm:hidden">6</span>
        </Button>
        <Button
          variant={statusFilter === "5" || statusFilter === "proposta" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("5")}
          className={`text-xs whitespace-nowrap ${statusFilter === "5" || statusFilter === "proposta"
            ? "bg-blue-500 text-white"
            : "text-blue-500 border-blue-500 hover:bg-blue-50"
            }`}
        >
          <span className="hidden sm:inline">5 - Proposta</span>
          <span className="sm:hidden">5</span>
        </Button>
        <Button
          variant={statusFilter === "4" || statusFilter === "execucao" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("4")}
          className={`text-xs whitespace-nowrap ${statusFilter === "4" || statusFilter === "execucao"
            ? "bg-amber-500 text-white"
            : "text-amber-500 border-amber-500 hover:bg-amber-50"
            }`}
        >
          <span className="hidden sm:inline">4 - Execução</span>
          <span className="sm:hidden">4</span>
        </Button>
        <Button
          variant={statusFilter === "3" || statusFilter === "cobranca" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("3")}
          className={`text-xs whitespace-nowrap ${statusFilter === "3" || statusFilter === "cobranca"
            ? "bg-red-500 text-white"
            : "text-red-500 border-red-500 hover:bg-red-50"
            }`}
        >
          <span className="hidden sm:inline">3 - Cobrança</span>
          <span className="sm:hidden">3</span>
        </Button>
        <Button
          variant={statusFilter === "2" || statusFilter === "entregue" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("2")}
          className={`text-xs whitespace-nowrap ${statusFilter === "2" || statusFilter === "entregue"
            ? "bg-purple-500 text-white"
            : "text-purple-500 border-purple-500 hover:bg-purple-50"
            }`}
        >
          <span className="hidden sm:inline">2 - Entregue</span>
          <span className="sm:hidden">2</span>
        </Button>
        <Button
          variant={statusFilter === "1" || statusFilter === "finalizado" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("1")}
          className={`text-xs whitespace-nowrap ${statusFilter === "1" || statusFilter === "finalizado"
            ? "bg-green-500 text-white"
            : "text-green-500 border-green-500 hover:bg-green-50"
            }`}
        >
          <span className="hidden sm:inline">1 - Finalizada</span>
          <span className="sm:hidden">1</span>
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px] lg:min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead
                    className="px-2 sm:px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => alternarOrdenacao("numero")}
                  >
                    <div className="flex items-center">
                      <span className="hidden sm:inline">Número</span>
                      <span className="sm:hidden">Nº</span>
                      {ordenacao.campo === "numero" &&
                        (ordenacao.direcao === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-2 sm:px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted hidden sm:table-cell"
                    onClick={() => alternarOrdenacao("data")}
                  >
                    <div className="flex items-center">
                      Data
                      {ordenacao.campo === "data" &&
                        (ordenacao.direcao === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-2 sm:px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted hidden lg:table-cell"
                    onClick={() => alternarOrdenacao("dataEntrega")}
                  >
                    <div className="flex items-center">
                      Data Entrega
                      {ordenacao.campo === "dataEntrega" &&
                        (ordenacao.direcao === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-2 sm:px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted hidden xl:table-cell"
                    onClick={() => alternarOrdenacao("prazoDias")}
                  >
                    <div className="flex items-center">
                      Prazo (dias)
                      {ordenacao.campo === "prazoDias" &&
                        (ordenacao.direcao === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>


                  <TableHead
                    className="px-2 sm:px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted hidden md:table-cell"
                    onClick={() => alternarOrdenacao("valor")}
                  >
                    <div className="flex items-center">
                      <span className="hidden lg:inline">Valor Total</span>
                      <span className="lg:hidden">Valor</span>
                      {ordenacao.campo === "valor" &&
                        (ordenacao.direcao === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-2 sm:px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted min-w-[140px]"
                    onClick={() => alternarOrdenacao("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {ordenacao.campo === "status" &&
                        (ordenacao.direcao === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead className="px-2 sm:px-4 py-3 text-center font-medium text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentosLoading && orcamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-4 text-center text-muted-foreground">
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtrarOrcamentos().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-4 text-center text-muted-foreground">
                      <div className="text-center py-8 bg-accent/30 rounded-lg">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <h4 className="text-lg font-medium text-gray-600">Nenhum orçamento encontrado</h4>
                        <p className="text-gray-500 mt-1">
                          {searchTerm ? "Tente uma busca diferente" : "Crie seu primeiro orçamento"}
                        </p>
                        {!searchTerm && (
                          <Button
                            onClick={onNovoOrcamento}
                            className="mt-4 bg-primary hover:bg-primary-dark text-white"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" /> Criar Orçamento
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosPaginados.map((orcamento) => (
                    <TableRow key={orcamento.id} className="border-t hover:bg-muted/50">
                      <TableCell className="px-2 sm:px-4 py-3 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-primary text-sm">
                              {extrairNumeroOrcamento(orcamento.numero)} -{" "}
                              <span className="hidden sm:inline">
                                {orcamento.cliente?.nome?.toUpperCase() || "SEM EMPRESA"}
                              </span>
                              <span className="sm:hidden">
                                {(orcamento.cliente?.nome?.toUpperCase() || "SEM EMPRESA").substring(0, 20)}...
                              </span>
                              {orcamento.nomeContato && (
                                <>
                                  <span className="hidden lg:inline"> - {orcamento.nomeContato.toUpperCase()}</span>
                                  <span className="lg:hidden"> - {orcamento.nomeContato.toUpperCase().substring(0, 10)}</span>
                                </>
                              )}
                            </span>

                            {verificarImagensFaltantes(orcamento) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-amber-500 ml-1 flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Há itens sem imagens na ficha técnica</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {resumirProdutosDoOrcamento(orcamento)}
                          </div>
                          {/* Informações adicionais em mobile */}
                          <div className="sm:hidden text-xs text-gray-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatarData(orcamento.data)}</span>
                              {(() => {
                                const { data, className } = calcularDataEntrega(orcamento.data, orcamento.prazoEntrega)
                                return (
                                  <span className="ml-2">
                                    Entrega: <span className={className}>{data}</span>
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="md:hidden">
                              R$ {calcularTotal(orcamento).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3 align-middle hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          <span className="text-sm">{formatarData(orcamento.data)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3 align-middle hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          {(() => {
                            const { data, className } = calcularDataEntrega(orcamento.data, orcamento.prazoEntrega)
                            return <span className={`text-sm ${className}`}>{data}</span>
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3 align-middle hidden xl:table-cell">
                        <span className="font-medium text-sm">{extrairNumeroDiasPrazo(orcamento.prazoEntrega)}</span>
                      </TableCell>

                      <TableCell className="px-2 sm:px-4 py-3 align-middle hidden md:table-cell">
                        <span className="font-medium text-sm">R$ {calcularTotal(orcamento).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3 align-middle">
                        <select
                          value={orcamento.status || "5"}
                          onChange={(e) => atualizarStatusOrcamento(orcamento.id!, e.target.value)}
                          className={`text-xs font-medium px-1 sm:px-2 py-1 rounded-full border min-w-0 w-full ${getStatusClassName(orcamento.status || "5")}`}
                          style={{ minWidth: '120px' }}
                        >
                          <option value="1">1 - Finalizada</option>
                          <option value="2">2 - Entregue</option>
                          <option value="3">3 - Cobrança</option>
                          <option value="4">4 - Execução</option>
                          <option value="5">5 - Proposta</option>
                          <option value="6">6 - Recusada</option>
                        </select>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3 align-middle">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-primary hover:text-primary-dark hover:bg-primary/10"
                            title="Abrir Orçamento"
                            onClick={() => {
                              if (orcamento.id && onAbrirOtimizado) {
                                onAbrirOtimizado(orcamento.id)
                              }
                            }}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>

                          {onExportOrcamento && (
                            <div className="relative hidden sm:block">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Exportar orçamento"
                                onClick={() => setOpenDropdownId(openDropdownId === orcamento.id ? null : orcamento.id)}
                              >
                                <FileDown className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              {openDropdownId === orcamento.id && (
                                <div
                                  className="absolute right-0 mt-1 flex flex-col bg-white shadow-lg rounded-md p-1 z-10 w-48"
                                  onMouseLeave={() => setOpenDropdownId(null)}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start text-xs"
                                    onClick={() => {
                                      if (orcamento.id && onExportOrcamento) {
                                        exportarOrcamento(orcamento.id, "completo")
                                        setOpenDropdownId(null)
                                      }
                                    }}
                                  >
                                    <FileText className="h-3.5 w-3.5 mr-2" />
                                    Exportar documento completo
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (orcamento.id) {
                                if (
                                  window.confirm(
                                    "Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.",
                                  )
                                ) {
                                  // Remover da lista local imediatamente para feedback instantâneo
                                  removeOrcamentoFromList(orcamento.id)
                                  // Depois executar a exclusão no banco
                                  await onDeleteOrcamento(orcamento.id)
                                }
                              }
                            }}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500 hover:text-red-500 hover:bg-red-50"
                            title="Excluir orçamento"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {((paginaAtual - 1) * ITENS_POR_PAGINA) + 1} - {Math.min(paginaAtual * ITENS_POR_PAGINA, totalItens)} de {totalItens} orçamentos
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(1)}
              disabled={paginaAtual === 1}
              className="hidden sm:flex"
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                let pageNum: number
                if (totalPaginas <= 5) {
                  pageNum = i + 1
                } else if (paginaAtual <= 3) {
                  pageNum = i + 1
                } else if (paginaAtual >= totalPaginas - 2) {
                  pageNum = totalPaginas - 4 + i
                } else {
                  pageNum = paginaAtual - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={paginaAtual === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaginaAtual(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
            >
              Próxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(totalPaginas)}
              disabled={paginaAtual === totalPaginas}
              className="hidden sm:flex"
            >
              Última
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

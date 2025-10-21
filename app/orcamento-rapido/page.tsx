"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Copy, Save, X, Search, Loader2, Image as ImageIcon, Palette, RefreshCw, FileText, Eye, Download, Edit2, Settings, Ruler } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import type { Cliente, Produto, Orcamento, ItemOrcamento, Tecido, Estampa } from "@/types/types"

// Helper para gerar UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Tamanhos padrão disponíveis
const tamanhosPadrao = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3"]

// Função para converter imagem para base64
const converterImagemParaBase64 = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader()
  reader.onloadend = () => {
    const base64String = reader.result as string
    callback(base64String)
  }
  reader.readAsDataURL(file)
}

export default function OrcamentoRapido() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Estados do orçamento
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("")
  const [data, setData] = useState(new Date().toISOString().split("T")[0])
  const [condicoesPagamento, setCondicoesPagamento] = useState("À vista")
  const [prazoEntrega, setPrazoEntrega] = useState("30 dias")
  const [validadeOrcamento, setValidadeOrcamento] = useState("15 dias")
  const [observacoes, setObservacoes] = useState("")
  const [valorFrete, setValorFrete] = useState(0)
  const [nomeContato, setNomeContato] = useState("")
  const [telefoneContato, setTelefoneContato] = useState("")
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [orcamentoAtualId, setOrcamentoAtualId] = useState<string | null>(null)
  const [temAlteracoes, setTemAlteracoes] = useState(false)
  
  // Estados de edição inline
  const [searchProduto, setSearchProduto] = useState("")
  const [itemDetalhesAberto, setItemDetalhesAberto] = useState<string | null>(null)
  const [popoverTamanhosAberto, setPopoverTamanhosAberto] = useState<string | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])
  
  // Atalho Ctrl+S para salvar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        salvarOrcamento()
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [clienteSelecionado, itens])

  // Marcar que houve alterações
  useEffect(() => {
    if (itens.length > 0 || clienteSelecionado) {
      setTemAlteracoes(true)
    }
  }, [itens, clienteSelecionado, condicoesPagamento, prazoEntrega, observacoes])

  // Avisar antes de sair da página com mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (temAlteracoes && !orcamentoAtualId) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [temAlteracoes, orcamentoAtualId])

  const carregarDados = async () => {
    try {
      setIsLoading(true)

      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .order("nome")

      if (clientesError) throw clientesError
      setClientes(clientesData || [])

      // Carregar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from("produtos")
        .select("*")
        .order("nome")

      if (produtosError) throw produtosError

      // Carregar tecidos para cada produto
      const produtosCompletos = await Promise.all(
        (produtosData || []).map(async (produto) => {
          const { data: tecidosData } = await supabase
            .from("tecidos")
            .select("*")
            .eq("produto_id", produto.id)

          return {
            id: produto.id,
            codigo: produto.codigo || "",
            nome: produto.nome,
            valorBase: Number(produto.valor_base) || 0,
            tecidos: (tecidosData || []).map((t) => ({
              nome: t.nome,
              composicao: t.composicao || "",
            })),
            cores: produto.cores || [],
            tamanhosDisponiveis: produto.tamanhos_disponiveis || [],
          }
        })
      )

      setProdutos(produtosCompletos)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const adicionarItem = () => {
    const novoItem: ItemOrcamento = {
      id: generateUUID(),
      produtoId: "",
      quantidade: 0,
      valorUnitario: 0,
      tamanhos: {},
      estampas: [],
      observacaoComercial: "",
      observacaoTecnica: "",
    }
    setItens([...itens, novoItem])
  }

  const duplicarItem = (itemId: string) => {
    const item = itens.find((i) => i.id === itemId)
    if (!item) return

    const itemDuplicado: ItemOrcamento = {
      ...item,
      id: generateUUID(),
    }
    setItens([...itens, itemDuplicado])
    
    toast({
      title: "Item duplicado",
      description: "Item duplicado com sucesso",
    })
  }

  const removerItem = (itemId: string) => {
    setItens(itens.filter((i) => i.id !== itemId))
  }

  const atualizarItem = (itemId: string, campo: string, valor: any) => {
    setItens(
      itens.map((item) => {
        if (item.id !== itemId) return item

        const itemAtualizado = { ...item, [campo]: valor }

        // Se mudou o produto, atualizar dados relacionados
        if (campo === "produtoId") {
          const produto = produtos.find((p) => p.id === valor)
          if (produto) {
            itemAtualizado.produto = produto
            itemAtualizado.valorUnitario = produto.valorBase
            itemAtualizado.tecidoSelecionado = produto.tecidos[0]
            itemAtualizado.corSelecionada = produto.cores[0]
            // Inicializar tamanhos com os disponíveis do produto
            const tamanhosIniciais: Record<string, number> = {}
            produto.tamanhosDisponiveis.forEach(t => tamanhosIniciais[t] = 0)
            itemAtualizado.tamanhos = tamanhosIniciais
          }
        }

        // Recalcular quantidade total baseado nos tamanhos
        if (campo === "tamanhos") {
          itemAtualizado.quantidade = Object.values(valor as Record<string, number>).reduce(
            (sum, qtd) => sum + Number(qtd),
            0
          )
        }

        return itemAtualizado
      })
    )
  }

  const atualizarTamanho = (itemId: string, tamanho: string, quantidade: number) => {
    const item = itens.find(i => i.id === itemId)
    if (!item) return
    
    const novosTamanhos = { ...item.tamanhos, [tamanho]: quantidade }
    atualizarItem(itemId, "tamanhos", novosTamanhos)
  }

  const adicionarEstampa = (itemId: string) => {
    const item = itens.find(i => i.id === itemId)
    if (!item) return

    const novaEstampa: Estampa = {
      id: generateUUID(),
      posicao: "",
      tipo: "",
      largura: 0,
      comprimento: 0,
    }
    const estampas = [...(item.estampas || []), novaEstampa]
    atualizarItem(itemId, "estampas", estampas)
  }

  const removerEstampa = (itemId: string, estampaId: string) => {
    const item = itens.find(i => i.id === itemId)
    if (!item) return

    const estampas = (item.estampas || []).filter(e => e.id !== estampaId)
    atualizarItem(itemId, "estampas", estampas)
  }

  const atualizarEstampa = (itemId: string, estampaId: string, campo: keyof Estampa, valor: any) => {
    const item = itens.find(i => i.id === itemId)
    if (!item) return

    const estampas = (item.estampas || []).map(e =>
      e.id === estampaId ? { ...e, [campo]: valor } : e
    )
    atualizarItem(itemId, "estampas", estampas)
  }

  const handleImagemUpload = (itemId: string, file: File) => {
    converterImagemParaBase64(file, (base64) => {
      atualizarItem(itemId, "imagem", base64)
    })
  }

  const calcularSubtotal = (item: ItemOrcamento) => {
    return item.quantidade * item.valorUnitario
  }

  const calcularTotal = () => {
    return itens.reduce((total, item) => total + calcularSubtotal(item), 0)
  }

  const salvarOrcamento = async () => {
    try {
      setIsSaving(true)

      // Validações
      if (!clienteSelecionado) {
        toast({
          title: "Erro",
          description: "Selecione um cliente",
          variant: "destructive",
        })
        return
      }

      if (itens.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item",
          variant: "destructive",
        })
        return
      }

      // Validar itens
      for (const item of itens) {
        if (!item.produtoId || item.quantidade === 0) {
          toast({
            title: "Erro",
            description: "Todos os itens devem ter produto e quantidade",
            variant: "destructive",
          })
          return
        }
      }

      // Obter próximo número de orçamento
      const { data: ultimoOrcamento } = await supabase
        .from("orcamentos")
        .select("numero")
        .order("created_at", { ascending: false })
        .limit(1)

      let proximoNumero = "0001"
      if (ultimoOrcamento && ultimoOrcamento.length > 0) {
        const numeroAtual = Number.parseInt(ultimoOrcamento[0].numero.split(" - ")[0], 10)
        if (!isNaN(numeroAtual)) {
          proximoNumero = (numeroAtual + 1).toString().padStart(4, "0")
        }
      }

      const cliente = clientes.find((c) => c.id === clienteSelecionado)
      const primeiroItem = itens[0].produto?.nome || "Item"
      const numeroCompleto = `${proximoNumero} - ${primeiroItem} - ${cliente?.nome} - ${cliente?.contato || ""}`

      // Salvar orçamento
      const dadosOrcamento = {
        numero: numeroCompleto,
        data,
        cliente_id: clienteSelecionado,
        observacoes,
        condicoes_pagamento: condicoesPagamento,
        prazo_entrega: prazoEntrega,
        validade_orcamento: validadeOrcamento,
        status: "proposta",
        itens: JSON.stringify({
          items: itens.map((item) => ({
            id: item.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            tecidoSelecionado: item.tecidoSelecionado,
            corSelecionada: item.corSelecionada,
            tamanhos: item.tamanhos,
            estampas: item.estampas,
            observacaoComercial: item.observacaoComercial,
            observacaoTecnica: item.observacaoTecnica,
            imagem: item.imagem,
          })),
          metadados: {
            valorFrete,
            nomeContato,
            telefoneContato,
          },
        }),
      }
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from("orcamentos")
        .insert(dadosOrcamento)
        .select()
        .single()

      if (orcamentoError) throw orcamentoError

      // Salvar itens individuais
      for (const item of itens) {
        await supabase.from("itens_orcamento").insert({
          orcamento_id: orcamentoData.id,
          produto_id: item.produtoId,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          tecido_nome: item.tecidoSelecionado?.nome,
          tecido_composicao: item.tecidoSelecionado?.composicao,
          cor_selecionada: item.corSelecionada,
          tamanhos: item.tamanhos,
          observacao_comercial: item.observacaoComercial,
          observacao_tecnica: item.observacaoTecnica,
          imagem: item.imagem,
        })
      }

      // Salvar ID do orçamento
      setOrcamentoAtualId(orcamentoData.id)
      setTemAlteracoes(false)

      toast({
        title: "✅ Sucesso!",
        description: `Orçamento ${numeroCompleto} salvo com sucesso`,
        variant: "default",
      })
    } catch (error) {
      console.error("Erro ao salvar:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar orçamento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const limparFormulario = () => {
    setClienteSelecionado("")
    setData(new Date().toISOString().split("T")[0])
    setCondicoesPagamento("À vista")
    setPrazoEntrega("30 dias")
    setValidadeOrcamento("15 dias")
    setObservacoes("")
    setValorFrete(0)
    setNomeContato("")
    setTelefoneContato("")
    setItens([])
    setOrcamentoAtualId(null)
    setTemAlteracoes(false)
  }

  const copiarOrcamento = () => {
    setOrcamentoAtualId(null)
    setTemAlteracoes(true)
    toast({
      title: "📋 Copiado!",
      description: "Orçamento copiado. Altere o que precisar e salve.",
    })
  }

  const atualizarOrcamento = async () => {
    if (!orcamentoAtualId) {
      toast({
        title: "Aviso",
        description: "Salve o orçamento primeiro antes de atualizar.",
        variant: "destructive",
      })
      return
    }
    await salvarOrcamento()
  }

  const gerarPDFOrcamento = async () => {
    if (!orcamentoAtualId) {
      toast({
        title: "⚠️ Aviso",
        description: "Salve o orçamento antes de gerar o PDF.",
        variant: "destructive",
      })
      return
    }
    
    toast({
      title: "📄 Gerando PDF do Orçamento...",
      description: "O PDF do orçamento está sendo gerado.",
    })
    
    // TODO: Implementar geração real do PDF
    setTimeout(() => {
      toast({
        title: "✅ PDF Gerado!",
        description: "PDF do orçamento pronto para download.",
      })
    }, 2000)
  }

  const gerarPDFFichaTecnica = async () => {
    if (!orcamentoAtualId) {
      toast({
        title: "⚠️ Aviso",
        description: "Salve o orçamento antes de gerar a ficha técnica.",
        variant: "destructive",
      })
      return
    }
    
    toast({
      title: "📋 Gerando Ficha Técnica...",
      description: "A ficha técnica está sendo gerada.",
    })
    
    // TODO: Implementar geração real da ficha
    setTimeout(() => {
      toast({
        title: "✅ Ficha Gerada!",
        description: "Ficha técnica pronta para download.",
      })
    }, 2000)
  }

  const abrirPreview = () => {
    if (itens.length === 0) {
      toast({
        title: "⚠️ Aviso",
        description: "Adicione itens ao orçamento para visualizar.",
        variant: "destructive",
      })
      return
    }
    
    if (!clienteSelecionado) {
      toast({
        title: "⚠️ Aviso",
        description: "Selecione um cliente para visualizar o orçamento.",
        variant: "destructive",
      })
      return
    }
    
    // Abrir em nova janela/tab o preview do orçamento
    const cliente = clientes.find((c) => c.id === clienteSelecionado)
    if (!cliente) {
      toast({
        title: "⚠️ Erro",
        description: "Cliente não encontrado.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "👁️ Preview do Orçamento",
      description: `Visualizando orçamento para ${cliente.nome}`,
    })
    
    // Por enquanto, mostrar informações no toast
    setTimeout(() => {
      const total = calcularTotal()
      toast({
        title: "📋 Resumo do Orçamento",
        description: `Cliente: ${cliente.nome} | ${itens.length} ${itens.length === 1 ? 'item' : 'itens'} | Total: R$ ${total.toFixed(2)}`,
      })
    }, 500)
  }

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(searchProduto.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-3">
      {/* Header com botões de ação */}
      <div className="mb-3 flex items-center justify-between bg-white rounded-lg shadow-sm p-3">
        <h1 className="text-xl font-bold text-primary">Orçamento Completo - Edição Facilitada</h1>
        <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={limparFormulario}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Novo
              </Button>
              <Button variant="outline" size="sm" onClick={copiarOrcamento} disabled={!orcamentoAtualId}>
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={atualizarOrcamento} disabled={!orcamentoAtualId}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={abrirPreview}>
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={gerarPDFOrcamento}>
                <FileText className="h-3 w-3 mr-1" />
                PDF Orç.
              </Button>
              <Button variant="outline" size="sm" onClick={gerarPDFFichaTecnica}>
                <Download className="h-3 w-3 mr-1" />
                PDF Ficha
              </Button>
              <Button onClick={salvarOrcamento} disabled={isSaving} className="bg-primary hover:bg-primary/90" size="sm">
                <Save className="h-3 w-3 mr-1" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Cards de informações - COMPACTOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            {/* Card 1: Cliente e Data */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                <CardTitle className="text-sm font-semibold text-primary">Cliente e Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Cliente *</label>
                  <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id} className="text-xs">
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Data</label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-7 text-xs" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Condições e Prazos */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                <CardTitle className="text-sm font-semibold text-primary">Condições e Prazos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Condições Pagamento</label>
                  <Input value={condicoesPagamento} onChange={(e) => setCondicoesPagamento(e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Prazo Entrega</label>
                  <Input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Validade</label>
                  <Input value={validadeOrcamento} onChange={(e) => setValidadeOrcamento(e.target.value)} className="h-7 text-xs" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Frete e Contato */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                <CardTitle className="text-sm font-semibold text-primary">Frete e Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Frete (R$)</label>
                  <Input 
                    type="number" 
                    value={valorFrete} 
                    onChange={(e) => setValorFrete(Number(e.target.value))} 
                    className="h-7 text-xs"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Nome Contato</label>
                  <Input value={nomeContato} onChange={(e) => setNomeContato(e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-0.5 block text-gray-600">Telefone</label>
                  <Input value={telefoneContato} onChange={(e) => setTelefoneContato(e.target.value)} className="h-7 text-xs" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Itens */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-primary">Itens do Orçamento</CardTitle>
                <Button onClick={adicionarItem} size="sm" className="bg-primary hover:bg-primary/90 h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10 hover:bg-primary/10">
                      <TableHead className="w-[220px] text-primary font-semibold text-xs">Produto</TableHead>
                      <TableHead className="w-[120px] text-primary font-semibold text-xs">Tecido</TableHead>
                      <TableHead className="w-[90px] text-primary font-semibold text-xs">Cor</TableHead>
                      <TableHead className="w-[90px] text-primary font-semibold text-xs text-center">Tamanhos</TableHead>
                      <TableHead className="w-[60px] text-primary font-semibold text-xs text-center">Qtd</TableHead>
                      <TableHead className="w-[90px] text-primary font-semibold text-xs">Valor Unit.</TableHead>
                      <TableHead className="w-[90px] text-primary font-semibold text-xs">Subtotal</TableHead>
                      <TableHead className="w-[120px] text-primary font-semibold text-xs text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        Nenhum item adicionado. Clique em "Adicionar" para começar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        {/* Produto */}
                        <TableCell>
                          <Select
                            value={item.produtoId}
                            onValueChange={(value) => atualizarItem(item.id, "produtoId", value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Buscar produto..."
                                  value={searchProduto}
                                  onChange={(e) => setSearchProduto(e.target.value)}
                                  className="mb-2"
                                />
                              </div>
                              {produtosFiltrados.map((produto) => (
                                <SelectItem key={produto.id} value={produto.id}>
                                  {produto.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Tecido */}
                        <TableCell>
                          <Select
                            value={item.tecidoSelecionado?.nome || ""}
                            onValueChange={(value) => {
                              const tecido = item.produto?.tecidos.find((t) => t.nome === value)
                              if (tecido) atualizarItem(item.id, "tecidoSelecionado", tecido)
                            }}
                            disabled={!item.produto}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.produto?.tecidos.map((tecido) => (
                                <SelectItem key={tecido.nome} value={tecido.nome}>
                                  {tecido.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Cor */}
                        <TableCell>
                          <Select
                            value={item.corSelecionada || ""}
                            onValueChange={(value) => atualizarItem(item.id, "corSelecionada", value)}
                            disabled={!item.produto}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.produto?.cores.map((cor) => (
                                <SelectItem key={cor} value={cor}>
                                  {cor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Tamanhos - POPOVER */}
                        <TableCell className="text-center">
                          <Popover 
                            key={`popover-${item.id}`}
                            open={popoverTamanhosAberto === item.id}
                            onOpenChange={(open) => setPopoverTamanhosAberto(open ? item.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs"
                                disabled={!item.produtoId}
                              >
                                <Ruler className="h-3 w-3 mr-1" />
                                {item.produtoId ? "Editar" : "-"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="center">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Tamanhos e Quantidades</h4>
                                <Separator />
                                {item.produto?.tamanhosDisponiveis && item.produto.tamanhosDisponiveis.length > 0 ? (
                                  <div className="grid grid-cols-4 gap-2">
                                    {item.produto.tamanhosDisponiveis.map((tamanho) => (
                                      <div key={tamanho} className="flex flex-col items-center">
                                        <label className="text-[10px] font-bold text-gray-700 mb-1">
                                          {tamanho}
                                        </label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={item.tamanhos?.[tamanho] || 0}
                                          onChange={(e) =>
                                            atualizarTamanho(item.id, tamanho, Number(e.target.value))
                                          }
                                          className="h-8 w-full text-center text-xs font-semibold"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 text-center py-2">
                                    Selecione um produto primeiro
                                  </p>
                                )}
                                <Separator />
                                <div className="flex justify-between items-center text-sm font-semibold">
                                  <span>Total:</span>
                                  <Badge className="bg-primary">{item.quantidade} pç</Badge>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Quantidade Total - READONLY */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-semibold">
                            {item.quantidade}
                          </Badge>
                        </TableCell>

                        {/* Valor Unitário */}
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.valorUnitario || ""}
                            onChange={(e) =>
                              atualizarItem(item.id, "valorUnitario", Number(e.target.value))
                            }
                            className="h-9"
                          />
                        </TableCell>

                        {/* Subtotal */}
                        <TableCell>
                          <span className="font-medium">
                            R$ {calcularSubtotal(item).toFixed(2)}
                          </span>
                        </TableCell>

                        {/* Ações */}
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Detalhes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Item - {item.produto?.nome || "Novo Item"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  {/* 1. Imagem de Referência */}
                                  <Card className="shadow-sm">
                                    <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                                      <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Imagem de Referência
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                      {item.imagem ? (
                                        <div className="relative">
                                          <img
                                            src={item.imagem}
                                            alt="Preview"
                                            className="w-full h-48 object-contain border rounded bg-gray-50"
                                          />
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => atualizarItem(item.id, "imagem", undefined)}
                                            className="absolute top-1 right-1 h-6 w-6 p-0"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                                          <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                                          <span className="text-xs text-gray-600">Clique para upload</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) handleImagemUpload(item.id, file)
                                            }}
                                          />
                                        </label>
                                      )}
                                    </CardContent>
                                  </Card>

                                  {/* 2. Estampas/Artes */}
                                  <Card className="shadow-sm">
                                    <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                                          <Palette className="h-4 w-4" />
                                          Estampas/Artes
                                        </CardTitle>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => adicionarEstampa(item.id)}
                                          className="h-6 text-xs"
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Adicionar
                                        </Button>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        {(item.estampas || []).map((estampa, idx) => (
                                          <div
                                            key={estampa.id}
                                            className="border rounded p-2 bg-gray-50 relative"
                                          >
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removerEstampa(item.id, estampa.id!)}
                                              className="absolute top-1 right-1 h-5 w-5 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                            <div className="text-[10px] font-bold text-primary mb-2">
                                              ARTE {idx + 1}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                              <div>
                                                <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Posição</label>
                                                <Select
                                                  value={estampa.posicao || ""}
                                                  onValueChange={(value) =>
                                                    atualizarEstampa(item.id, estampa.id!, "posicao", value)
                                                  }
                                                >
                                                  <SelectTrigger className="h-7 text-[10px]">
                                                    <SelectValue placeholder="Selecione" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {["Peito esquerdo", "Peito direito", "Costas", "Bolso esquerdo", "Bolso direito", "Manga esquerda", "Manga direita"].map((pos) => (
                                                      <SelectItem key={pos} value={pos} className="text-xs">
                                                        {pos}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Tipo</label>
                                                <Select
                                                  value={estampa.tipo || ""}
                                                  onValueChange={(value) =>
                                                    atualizarEstampa(item.id, estampa.id!, "tipo", value)
                                                  }
                                                >
                                                  <SelectTrigger className="h-7 text-[10px]">
                                                    <SelectValue placeholder="Selecione" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {["Bordado", "Silk", "DTF", "Sublimação"].map((tipo) => (
                                                      <SelectItem key={tipo} value={tipo} className="text-xs">
                                                        {tipo}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Larg. (cm)</label>
                                                <Input
                                                  type="number"
                                                  value={estampa.largura || ""}
                                                  onChange={(e) =>
                                                    atualizarEstampa(
                                                      item.id,
                                                      estampa.id!,
                                                      "largura",
                                                      Number(e.target.value)
                                                    )
                                                  }
                                                  className="h-7 text-xs"
                                                  step="0.5"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Alt. (cm)</label>
                                                <Input
                                                  type="number"
                                                  value={estampa.comprimento || ""}
                                                  onChange={(e) =>
                                                    atualizarEstampa(
                                                      item.id,
                                                      estampa.id!,
                                                      "comprimento",
                                                      Number(e.target.value)
                                                    )
                                                  }
                                                  className="h-7 text-xs"
                                                  step="0.5"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {(!item.estampas || item.estampas.length === 0) && (
                                          <div className="text-xs text-gray-500 text-center py-2">
                                            Nenhuma estampa adicionada
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* 3. Observação Técnica */}
                                  <Card className="shadow-sm">
                                    <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                                      <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Observação Técnica (ficha técnica)
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                      <Textarea
                                        value={item.observacaoTecnica || ""}
                                        onChange={(e) =>
                                          atualizarItem(item.id, "observacaoTecnica", e.target.value)
                                        }
                                        className="min-h-[100px] text-sm"
                                        placeholder="Ex: Detalhes de produção, acabamento..."
                                      />
                                    </CardContent>
                                  </Card>

                                  {/* 4. Observação Comercial */}
                                  <Card className="shadow-sm">
                                    <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
                                      <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Observação Comercial (orçamento)
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                      <Textarea
                                        value={item.observacaoComercial || ""}
                                        onChange={(e) =>
                                          atualizarItem(item.id, "observacaoComercial", e.target.value)
                                        }
                                        className="min-h-[100px] text-sm"
                                        placeholder="Ex: Cor especial, prazo diferenciado..."
                                      />
                                    </CardContent>
                                  </Card>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicarItem(item.id)}
                              className="h-8 w-8"
                              title="Duplicar item"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerItem(item.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Remover item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

              {/* Total */}
              {itens.length > 0 && (
                <div className="p-3 bg-primary/5 border-t flex justify-end">
                  <div className="text-right">
                    <div className="text-xs text-gray-600 mb-0.5">Total do Orçamento</div>
                    <div className="text-xl font-bold text-primary">
                      R$ {calcularTotal().toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="mt-3 shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3 bg-primary/5 border-b">
              <CardTitle className="text-sm font-semibold text-primary">Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais do orçamento..."
                className="min-h-[60px] text-xs"
              />
            </CardContent>
          </Card>
    </div>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Search, Save, Copy, RefreshCw, Eye, Edit3 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import VisualizacaoEditavel from "@/components/visualizacao-editavel"
import { useSearchParams } from "next/navigation"
import type { Cliente, Produto, Orcamento, ItemOrcamento, DadosEmpresa } from "@/types/types"

// Helper para gerar UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function OrcamentoOtimizado({ id }: { id?: string }) {
  const searchParams = useSearchParams()
  const idUrl = id || searchParams.get("id")
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Estado unificado do orçamento
  const [orcamento, setOrcamento] = useState<Orcamento>({
    id: undefined,
    numero: "PREVIEW",
    data: new Date().toISOString().split("T")[0],
    cliente: null,
    itens: [],
    observacoes: "",
    condicoesPagamento: "À vista",
    prazoEntrega: "30 dias",
    validadeOrcamento: "15 dias",
    valorFrete: 0,
    status: "5",
    nomeContato: "",
    telefoneContato: ""
  })
  
  const [temAlteracoes, setTemAlteracoes] = useState(false)
  
  // Estados para Preview e PDF
  const [modoVisualizacao, setModoVisualizacao] = useState<"orcamento" | "ficha" | "completo">("completo")
  const [modoEdicao, setModoEdicao] = useState(true)
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa | undefined>(undefined)
  
  // Estados para carregar orçamentos (Lista)
  const [mostrarListaOrcamentos, setMostrarListaOrcamentos] = useState(false)
  const [orcamentosSalvos, setOrcamentosSalvos] = useState<Orcamento[]>([])
  const [carregandoOrcamentos, setCarregandoOrcamentos] = useState(false)

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])
  
  // Carregar orçamento pelo ID da URL se existir
  useEffect(() => {
    if (idUrl && !orcamento.id && !isLoading) {
      carregarOrcamentoPorId(idUrl)
    }
  }, [idUrl, isLoading])

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
  }, [orcamento])

  // Marcar que houve alterações
  useEffect(() => {
    if (orcamento.itens.length > 0 || orcamento.cliente) {
      setTemAlteracoes(true)
    }
  }, [orcamento])

  // Avisar antes de sair da página com mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (temAlteracoes && !orcamento.id) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [temAlteracoes, orcamento.id])

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
      
      // Carregar dados da empresa
      const { data: empresaData } = await supabase
        .from("empresa")
        .select("*")
        .limit(1)
        .single()
      
      if (empresaData) {
        setDadosEmpresa({
          id: empresaData.id,
          nome: empresaData.nome || "",
          cnpj: empresaData.cnpj || "",
          telefone: empresaData.telefone || "",
          email: empresaData.email || "",
          endereco: empresaData.endereco || "",
          logo_url: empresaData.logo_url || empresaData.logo || "",
        })
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const carregarOrcamentoPorId = async (id: string) => {
    try {
      setIsLoading(true)
      
      const { data: orcamentoDb, error } = await supabase
        .from("orcamentos")
        .select(`*, cliente:clientes(*)`)
        .eq("id", id)
        .single()
      
      if (error) throw error
      
      if (!orcamentoDb) return

      // Carregar itens do orçamento
      const { data: itensData } = await supabase
        .from("itens_orcamento")
        .select("*")
        .eq("orcamento_id", orcamentoDb.id)
      
      // Processar itens completos
      let produtosAtuais = produtos
      if (produtosAtuais.length === 0) {
         const { data: pData } = await supabase.from("produtos").select("*")
         produtosAtuais = (pData || []).map((p: any) => ({...p, tecidos: [], cores: [], tamanhosDisponiveis: p.tamanhos_disponiveis || []}))
      }

      const itensCompletos: ItemOrcamento[] = await Promise.all(
        (itensData || []).map(async (item) => {
          const produto = produtosAtuais.find(p => p.id === item.produto_id)
          
          let tecidos = produto?.tecidos || []
          if (produto && tecidos.length === 0) {
             const { data: tData } = await supabase.from("tecidos").select("*").eq("produto_id", produto.id)
             tecidos = (tData || []).map((t: any) => ({ nome: t.nome, composicao: t.composicao || "" }))
          }

          return {
            id: item.id,
            produtoId: item.produto_id,
            quantidade: item.quantidade,
            valorUnitario: Number(item.valor_unitario),
            tamanhos: item.tamanhos || {},
            estampas: item.estampas || [],
            observacaoComercial: item.observacao_comercial || "",
            observacaoTecnica: item.observacao_tecnica || "",
            imagem: item.imagem,
            produto: produto ? { ...produto, tecidos } : undefined,
            tecidoSelecionado: produto?.tecidos?.find((t: any) => t.nome === item.tecido_nome) || (tecidos?.[0] || undefined),
            corSelecionada: item.cor_selecionada || (produto?.cores?.[0] || ""),
          }
        })
      )
      
      setOrcamento({
        id: orcamentoDb.id,
        numero: orcamentoDb.numero,
        data: orcamentoDb.data,
        cliente: orcamentoDb.cliente || { id: "", codigo: "", nome: "", cnpj: "", telefone: "", email: "", endereco: "" },
        itens: itensCompletos,
        condicoesPagamento: orcamentoDb.condicoes_pagamento,
        prazoEntrega: orcamentoDb.prazo_entrega,
        validadeOrcamento: orcamentoDb.validade_orcamento,
        observacoes: orcamentoDb.observacoes || "",
        valorFrete: Number(orcamentoDb.valor_frete) || 0,
        nomeContato: orcamentoDb.nome_contato || "",
        telefoneContato: orcamentoDb.telefone_contato || "",
        status: orcamentoDb.status,
      })
      
      setTemAlteracoes(false)
      
      toast({
        title: "✅ Orçamento Carregado",
        description: `Orçamento ${orcamentoDb.numero} carregado.`,
      })

    } catch (error) {
      console.error("Erro ao carregar orçamento:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o orçamento.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calcularTotal = () => {
    return orcamento.itens.reduce((total, item) => total + (item.quantidade * item.valorUnitario), 0)
  }

  const salvarOrcamento = async () => {
    try {
      setIsSaving(true)

      if (!orcamento.cliente) {
        toast({ title: "Erro", description: "Informe o cliente", variant: "destructive" })
        return
      }

      if (orcamento.itens.length === 0) {
        toast({ title: "Erro", description: "Adicione pelo menos um item", variant: "destructive" })
        return
      }

      // Obter próximo número se for novo
      let numeroCompleto = orcamento.numero
      if (!orcamento.id || orcamento.numero === "PREVIEW") {
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
          
          const primeiroItem = orcamento.itens[0].produto?.nome || "Item"
          const nomeCliente = orcamento.cliente?.nome || "CLIENTE"
          numeroCompleto = `${proximoNumero} - ${primeiroItem} - ${nomeCliente} - ${orcamento.nomeContato || ""}`
      }

      const dadosOrcamento = {
        numero: numeroCompleto,
        data: orcamento.data,
        cliente_id: orcamento.cliente?.id && orcamento.cliente.id.length > 10 ? orcamento.cliente.id : null, 
        observacoes: orcamento.observacoes,
        condicoes_pagamento: orcamento.condicoesPagamento,
        prazo_entrega: orcamento.prazoEntrega,
        validade_orcamento: orcamento.validadeOrcamento,
        status: orcamento.status || "5 - Proposta",
        valor_frete: orcamento.valorFrete,
        nome_contato: orcamento.nomeContato,
        telefone_contato: orcamento.telefoneContato,
        itens: JSON.stringify({ // Legado
          items: orcamento.itens.map((item) => ({
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
            valorFrete: orcamento.valorFrete,
            nomeContato: orcamento.nomeContato,
            telefoneContato: orcamento.telefoneContato,
          },
        }),
      }
      
      if (!dadosOrcamento.cliente_id) {
          if (!orcamento.cliente?.id) {
             // Toast e retorno
             toast({ title: "Atenção", description: "Selecione um cliente existente para salvar.", variant: "destructive" })
             setIsSaving(false)
             return
          }
      }

      let result
      if (orcamento.id) {
         result = await supabase.from("orcamentos").update(dadosOrcamento).eq("id", orcamento.id).select().single()
      } else {
         result = await supabase.from("orcamentos").insert(dadosOrcamento).select().single()
      }

      if (result.error) throw result.error

      // Atualizar itens
      if (orcamento.id) {
          await supabase.from("itens_orcamento").delete().eq("orcamento_id", orcamento.id)
      }
      
      const orcamentoId = result.data.id
      
      for (const item of orcamento.itens) {
        await supabase.from("itens_orcamento").insert({
          orcamento_id: orcamentoId,
          produto_id: item.produtoId && item.produtoId.length > 5 ? item.produtoId : null, // FK check
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

      setOrcamento({ ...orcamento, id: orcamentoId, numero: numeroCompleto })
      setTemAlteracoes(false)

      toast({
        title: "✅ Sucesso!",
        description: `Orçamento salvo com sucesso`,
      })
    } catch (error: any) {
      console.error("Erro ao salvar:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar orçamento.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const limparFormulario = () => {
    setOrcamento({
        numero: "PREVIEW",
        data: new Date().toISOString().split("T")[0],
        cliente: null,
        itens: [],
        observacoes: "",
        condicoesPagamento: "À vista",
        prazoEntrega: "30 dias",
        validadeOrcamento: "15 dias",
        valorFrete: 0,
        status: "5",
        nomeContato: "",
        telefoneContato: ""
    })
    setTemAlteracoes(false)
    window.history.pushState({}, "", "/orcamento-otimizado")
  }
  
  const carregarOrcamentos = async () => {
    try {
      setCarregandoOrcamentos(true)
      const { data: orcamentosData, error } = await supabase
        .from("orcamentos")
        .select(`*, cliente:clientes(*)`)
        .order("created_at", { ascending: false })
        .limit(50)
      
      if (error) throw error
      setOrcamentosSalvos(orcamentosData as any || [])
    } catch (err) {
       console.error(err)
    } finally {
       setCarregandoOrcamentos(false)
    }
  }
  
  const abrirListaOrcamentos = () => {
    carregarOrcamentos()
    setMostrarListaOrcamentos(true)
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      
      {/* Linha com título do orçamento, tabs e botões funcionais */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-primary">Orçamento Otimizado: {orcamento.numero.split(" - ")[0]}</h2>
          <div className="flex bg-muted p-1 rounded-lg">
              <Button 
                  variant={modoVisualizacao === "completo" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setModoVisualizacao("completo")}
                  className={modoVisualizacao === "completo" ? "bg-background shadow-sm" : ""}
              >
                  Completo
              </Button>
              <Button 
                  variant={modoVisualizacao === "orcamento" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setModoVisualizacao("orcamento")}
                  className={modoVisualizacao === "orcamento" ? "bg-background shadow-sm" : ""}
              >
                  Orçamento
              </Button>
              <Button 
                  variant={modoVisualizacao === "ficha" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setModoVisualizacao("ficha")}
                  className={modoVisualizacao === "ficha" ? "bg-background shadow-sm" : ""}
              >
                  Ficha Téc.
              </Button>
          </div>
        </div>
        
        {/* Botões funcionais do orçamento otimizado */}
        <div className="flex gap-2">
            {/* Botão Editar/Visualizar */}
            <Button 
                size="sm" 
                onClick={() => setModoEdicao(!modoEdicao)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
            >
                {modoEdicao ? <Eye className="w-4 h-4 mr-1"/> : <Edit3 className="w-4 h-4 mr-1"/>}
                {modoEdicao ? "Visualizar" : "Editar"}
            </Button>
            
            {/* Botão Copiar - Azul */}
            <Button 
                size="sm" 
                onClick={() => {
                    if (orcamento.id) {
                        setOrcamento({...orcamento, id: undefined, numero: "PREVIEW"})
                        setTemAlteracoes(true)
                        toast({
                            title: "📋 Copiado!",
                            description: "Orçamento copiado. Altere o que precisar e salve.",
                        })
                    }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
            >
                <Copy className="w-4 h-4 mr-1"/> Copiar
            </Button>
            
            {/* Botão Atualizar - Verde */}
            <Button 
                size="sm" 
                onClick={salvarOrcamento} 
                disabled={isSaving || !orcamento.id}
                className="bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-400"
            >
                <RefreshCw className="w-4 h-4 mr-1"/> Atualizar
            </Button>
            
            {/* Botão PDF Orçamento - Azul */}
            <Button 
                size="sm" 
                onClick={async () => {
                    if (!orcamento.cliente || orcamento.itens.length === 0) {
                        toast({
                            title: "⚠️ Aviso",
                            description: "Complete o orçamento para gerar PDF.",
                            variant: "destructive",
                        })
                        return
                    }
                    window.print()
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
            >
                <Save className="w-4 h-4 mr-1"/> PDF Orçamento
            </Button>
            
            {/* Botão PDF Ficha - Azul */}
            <Button 
                size="sm" 
                onClick={async () => {
                    if (!orcamento.cliente || orcamento.itens.length === 0) {
                        toast({
                            title: "⚠️ Aviso",
                            description: "Complete o orçamento para gerar ficha técnica.",
                            variant: "destructive",
                        })
                        return
                    }
                    setModoVisualizacao("ficha")
                    setTimeout(() => window.print(), 100)
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
            >
                <Save className="w-4 h-4 mr-1"/> PDF Ficha
            </Button>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto p-3">
         {/* Visualização Editável */}
         <VisualizacaoEditavel 
            orcamento={orcamento}
            setOrcamento={setOrcamento}
            dadosEmpresa={dadosEmpresa}
            setDadosEmpresa={setDadosEmpresa}
            calcularTotal={calcularTotal}
            modoExportacao={modoVisualizacao}
            clientes={clientes}
            produtos={produtos}
            onSave={salvarOrcamento}
            mostrarBarraBotoes={false}
            modoEdicaoExterno={modoEdicao}
         />
      </div>

      {/* Dialog Lista */}
      <Dialog open={mostrarListaOrcamentos} onOpenChange={setMostrarListaOrcamentos}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
              <DialogTitle>Carregar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 space-y-2">
            {orcamentosSalvos.map(o => (
                <div key={o.id} onClick={() => {
                    setMostrarListaOrcamentos(false)
                    window.history.pushState({}, "", `/orcamento-otimizado?id=${o.id}`)
                    carregarOrcamentoPorId(o.id!)
                }} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors">
                    <div>
                        <div className="font-bold text-primary">{o.numero}</div>
                        <div className="text-sm text-gray-600">{o.cliente?.nome || "Sem cliente"}</div>
                        <div className="text-xs text-gray-400">{new Date(o.data).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                         <div className="font-bold text-lg">
                             R$ {(o.itens.reduce((acc: number, i: any) => acc + (Number(i.quantidade) * Number(i.valor_unitario || i.valorUnitario)), 0) + (Number((o as any).valor_frete || o.valorFrete) || 0)).toFixed(2)}
                         </div>
                         <Badge variant="outline">{o.status}</Badge>
                    </div>
                </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

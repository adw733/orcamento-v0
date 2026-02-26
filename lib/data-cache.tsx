"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Cliente, Produto, DadosEmpresa, Orcamento } from '@/types/types'
import { useCurrentUser } from '@/hooks/use-current-user'

// Tipos para o cache
interface CachedData<T> {
  data: T
  timestamp: number
  isLoading: boolean
}

interface OrcamentoResumido {
  id: string
  numero: string
  data: string
  cliente_id: string | null
  cliente?: { id: string; nome: string; cnpj?: string } | null
  status: string
  valor_total?: number
  valorFrete?: number
  prazo_entrega?: string
  temImagemFaltante?: boolean
  nomeContato?: string
  telefoneContato?: string
  created_at: string
  updated_at?: string
}

interface DataCacheContextType {
  // Clientes
  clientes: Cliente[]
  clientesLoading: boolean
  reloadClientes: () => Promise<void>
  
  // Produtos
  produtos: Produto[]
  produtosLoading: boolean
  reloadProdutos: () => Promise<void>
  
  // Empresa
  dadosEmpresa: DadosEmpresa | undefined
  empresaLoading: boolean
  reloadEmpresa: () => Promise<void>
  
  // Orçamentos (lista resumida para navegação rápida)
  orcamentosLista: OrcamentoResumido[]
  orcamentosLoading: boolean
  reloadOrcamentos: () => Promise<void>
  
  // Cache de orçamentos completos (por ID)
  getOrcamentoCompleto: (id: string) => Promise<Orcamento | null>
  invalidateOrcamento: (id: string) => void
  removeOrcamentoFromList: (id: string) => void
  updateOrcamentoInList: (id: string, patch: Partial<OrcamentoResumido>) => void
  
  // Status geral
  isInitialized: boolean
  initializeAll: () => Promise<void>
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined)

// Tempo de cache em ms (5 minutos)
const CACHE_TTL = 5 * 60 * 1000

const extrairContatoDoNumero = (numero?: string): string => {
  if (!numero) return ""
  const partes = numero
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean)

  if (partes.length < 4) return ""
  return partes[partes.length - 1] || ""
}

// Cache em memória para orçamentos completos
const orcamentosCache = new Map<string, { data: Orcamento; timestamp: number }>()

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const { tenantId, isLoading: userLoading } = useCurrentUser()
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)
  const [clientesTimestamp, setClientesTimestamp] = useState(0)
  
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosLoading, setProdutosLoading] = useState(false)
  const [produtosTimestamp, setProdutosTimestamp] = useState(0)
  
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa | undefined>(undefined)
  const [empresaLoading, setEmpresaLoading] = useState(false)
  const [empresaTimestamp, setEmpresaTimestamp] = useState(0)
  
  const [orcamentosLista, setOrcamentosLista] = useState<OrcamentoResumido[]>([])
  const [orcamentosLoading, setOrcamentosLoading] = useState(false)
  const [orcamentosTimestamp, setOrcamentosTimestamp] = useState(0)
  
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar clientes
  const reloadClientes = useCallback(async (force = false) => {
    if (clientesLoading) return
    if (!force && clientes.length > 0 && Date.now() - clientesTimestamp < CACHE_TTL) return
    if (!tenantId) return // Não carregar sem tenant_id
    
    setClientesLoading(true)
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome")
      
      if (error) throw error
      setClientes(data || [])
      setClientesTimestamp(Date.now())
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setClientesLoading(false)
    }
  }, [clientesLoading, clientes.length, clientesTimestamp, tenantId])

  // Carregar produtos com tecidos
  const reloadProdutos = useCallback(async (force = false) => {
    if (produtosLoading) return
    if (!force && produtos.length > 0 && Date.now() - produtosTimestamp < CACHE_TTL) return
    if (!tenantId) return // Não carregar sem tenant_id
    
    setProdutosLoading(true)
    try {
      const { data: produtosData, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome")
      
      if (error) throw error
      
      // Carregar tecidos base (globais) - disponíveis para todos os produtos
      const { data: tecidosBase } = await supabase
        .from("tecidos_base")
        .select("*")
        .order("nome")
      
      const tecidosGlobais = (tecidosBase || []).map((t) => ({
        nome: t.nome,
        composicao: t.composicao || "",
      }))
      
      // Carregar tecidos específicos para cada produto em paralelo
      const produtosCompletos = await Promise.all(
        (produtosData || []).map(async (produto) => {
          const { data: tecidosData } = await supabase
            .from("tecidos")
            .select("*")
            .eq("produto_id", produto.id)
          
          // Se o produto tem tecidos específicos, usar esses. Senão, usar tecidos globais.
          const tecidosProduto = (tecidosData && tecidosData.length > 0)
            ? tecidosData.map((t) => ({ nome: t.nome, composicao: t.composicao || "" }))
            : tecidosGlobais
          
          return {
            id: produto.id,
            codigo: produto.codigo || "",
            nome: produto.nome,
            valorBase: Number(produto.valor_base) || 0,
            tecidos: tecidosProduto,
            cores: produto.cores || [],
            tamanhosDisponiveis: produto.tamanhos_disponiveis || [],
          }
        })
      )
      
      setProdutos(produtosCompletos)
      setProdutosTimestamp(Date.now())
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    } finally {
      setProdutosLoading(false)
    }
  }, [produtosLoading, produtos.length, produtosTimestamp, tenantId])

  // Carregar dados da empresa
  const reloadEmpresa = useCallback(async (force = false) => {
    if (empresaLoading) return
    if (!force && dadosEmpresa && Date.now() - empresaTimestamp < CACHE_TTL) return
    if (!tenantId) return // Não carregar sem tenant_id
    
    setEmpresaLoading(true)
    try {
      const { data, error } = await supabase
        .from("empresa")
        .select("*")
        .eq("tenant_id", tenantId)
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setDadosEmpresa({
          id: data.id,
          nome: data.nome || "",
          cnpj: data.cnpj || "",
          telefone: data.telefone || "",
          email: data.email || "",
          endereco: data.endereco || "",
          logo_url: data.logo_url || data.logo || "",
        })
      }
      setEmpresaTimestamp(Date.now())
    } catch (error) {
      console.error("Erro ao carregar empresa:", error)
    } finally {
      setEmpresaLoading(false)
    }
  }, [empresaLoading, dadosEmpresa, empresaTimestamp, tenantId])

  // Carregar lista de orçamentos (completa para todas as visualizações)
  const reloadOrcamentos = useCallback(async (force = false) => {
    if (orcamentosLoading) return
    if (!force && orcamentosLista.length > 0 && Date.now() - orcamentosTimestamp < CACHE_TTL) return
    if (!tenantId) return // Não carregar sem tenant_id
    
    setOrcamentosLoading(true)
    try {
      type OrcamentoResumoRpc = {
        id: string
        numero: string
        data: string
        cliente_id: string | null
        cliente: { id: string; nome: string; cnpj?: string } | null
        status: string | null
        prazo_entrega: string | null
        contato_nome: string | null
        contato_telefone: string | null
        valor_frete: number | string | null
        valor_total: number | string | null
        tem_imagem_faltante: boolean | null
        created_at: string
        updated_at: string | null
      }

      const { data: resumoData, error: resumoError } = await supabase
        .rpc("get_orcamentos_lista_resumo" as any, { p_tenant_id: tenantId } as any)

      if (!resumoError && Array.isArray(resumoData)) {
        const orcamentosProcessados = (resumoData as OrcamentoResumoRpc[]).map((orc) => ({
          id: orc.id,
          numero: orc.numero,
          data: orc.data,
          cliente_id: orc.cliente_id,
          cliente: orc.cliente,
          status: orc.status || "5",
          prazo_entrega: orc.prazo_entrega || "30 DIAS",
          valor_total: Number(orc.valor_total) || 0,
          valorFrete: Number(orc.valor_frete) || 0,
          temImagemFaltante: Boolean(orc.tem_imagem_faltante),
          nomeContato: orc.contato_nome || extrairContatoDoNumero(orc.numero),
          telefoneContato: orc.contato_telefone || "",
          created_at: orc.created_at,
          updated_at: orc.updated_at || undefined,
        }))

        setOrcamentosLista(orcamentosProcessados)
        setOrcamentosTimestamp(Date.now())
        return
      }

      if (resumoError) {
        console.warn("RPC get_orcamentos_lista_resumo indisponivel. Usando fallback local.", resumoError)
      }

      const { data: baseData, error: baseError } = await supabase
        .from("orcamentos")
        .select(`
          id,
          numero,
          data,
          cliente_id,
          status,
          prazo_entrega,
          contato_nome,
          contato_telefone,
          valor_frete,
          created_at,
          updated_at,
          cliente:clientes(id, nome, cnpj)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("numero", { ascending: false })

      if (!baseError && Array.isArray(baseData)) {
        const orcamentoIds = baseData.map((orc: any) => orc.id).filter(Boolean)
        const totaisPorOrcamento = new Map<string, { total: number; temImagemFaltante: boolean }>()

        if (orcamentoIds.length > 0) {
          const { data: itensData, error: itensError } = await supabase
            .from("itens_orcamento")
            .select("orcamento_id, quantidade, valor_unitario, desconto_unitario_percentual, imagem")
            .in("orcamento_id", orcamentoIds)

          if (!itensError && Array.isArray(itensData)) {
            for (const item of itensData) {
              const orcamentoId = item.orcamento_id
              if (!orcamentoId) continue

              const atual = totaisPorOrcamento.get(orcamentoId) || { total: 0, temImagemFaltante: false }
              const desconto = Number(item.desconto_unitario_percentual) || 0
              const valorUnitario = (Number(item.valor_unitario) || 0) * (1 - desconto / 100)
              atual.total += (Number(item.quantidade) || 0) * valorUnitario

              if (!item.imagem || String(item.imagem).trim() === "") {
                atual.temImagemFaltante = true
              }

              totaisPorOrcamento.set(orcamentoId, atual)
            }
          }
        }

        const orcamentosProcessados = baseData.map((orc: any) => {
          const totais = totaisPorOrcamento.get(orc.id) || { total: 0, temImagemFaltante: false }
          const valorFrete = Number(orc.valor_frete) || 0

          return {
            id: orc.id,
            numero: orc.numero,
            data: orc.data,
            cliente_id: orc.cliente_id,
            cliente: orc.cliente,
            status: orc.status || "5",
            prazo_entrega: orc.prazo_entrega || "30 DIAS",
            valor_total: totais.total + valorFrete,
            valorFrete,
            temImagemFaltante: totais.temImagemFaltante,
            nomeContato: orc.contato_nome || extrairContatoDoNumero(orc.numero),
            telefoneContato: orc.contato_telefone || "",
            created_at: orc.created_at,
            updated_at: orc.updated_at,
          }
        })

        setOrcamentosLista(orcamentosProcessados)
        setOrcamentosTimestamp(Date.now())
        return
      }

      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          id,
          numero,
          data,
          cliente_id,
          status,
          prazo_entrega,
          contato_nome,
          contato_telefone,
          valor_frete,
          itens,
          created_at,
          updated_at,
          cliente:clientes(id, nome, cnpj)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("numero", { ascending: false })
      
      if (error) throw error
      
      // Processar orçamentos com dados completos
      const orcamentosProcessados = (data || []).map((orc: any) => {
        let valorTotal = 0
        let valorFrete = Number(orc.valor_frete) || 0
        let nomeContato = ""
        let telefoneContato = ""
        let itensParseados: any[] = []
        
        try {
          if (orc.itens) {
            const itensObj = typeof orc.itens === 'string' ? JSON.parse(orc.itens) : orc.itens
            
            if (itensObj.items && Array.isArray(itensObj.items)) {
              itensParseados = itensObj.items
              if (itensObj.metadados) {
                valorFrete = Number(itensObj.metadados.valorFrete) || 0
                nomeContato = itensObj.metadados.nomeContato || ""
                telefoneContato = itensObj.metadados.telefoneContato || ""
              }
            } else if (Array.isArray(itensObj)) {
              itensParseados = itensObj
            }
            
            valorTotal = itensParseados.reduce((acc: number, item: any) => {
              return acc + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0)
            }, 0)
          }
        } catch (e) {}
        
        return {
          id: orc.id,
          numero: orc.numero,
          data: orc.data,
          cliente_id: orc.cliente_id,
          cliente: orc.cliente,
          status: orc.status || "5",
          prazo_entrega: orc.prazo_entrega || "30 DIAS",
          itens: itensParseados,
          valor_total: valorTotal + valorFrete,
          valorFrete,
          nomeContato: orc.contato_nome || nomeContato || extrairContatoDoNumero(orc.numero),
          telefoneContato: orc.contato_telefone || telefoneContato || "",
          created_at: orc.created_at,
          updated_at: orc.updated_at
        }
      })
      
      setOrcamentosLista(orcamentosProcessados)
      setOrcamentosTimestamp(Date.now())
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error)
    } finally {
      setOrcamentosLoading(false)
    }
  }, [orcamentosLoading, orcamentosLista.length, orcamentosTimestamp, tenantId])

  // Buscar orçamento completo (com cache)
  const getOrcamentoCompleto = useCallback(async (id: string): Promise<Orcamento | null> => {
    // Verificar cache
    const cached = orcamentosCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    
    try {
      const { data: orcamentoDb, error } = await supabase
        .from("orcamentos")
        .select(`*, cliente:clientes(*)`)
        .eq("id", id)
        .single()
      
      if (error) throw error
      if (!orcamentoDb) return null
      
      // Carregar itens do orçamento
      const { data: itensData } = await supabase
        .from("itens_orcamento")
        .select("*")
        .eq("orcamento_id", orcamentoDb.id)
        .order("posicao", { ascending: true })
      
      // Recuperar dados extras do campo JSON legado
      let itensJSON: any[] = []
      let metadados = { valorFrete: 0, nomeContato: "", telefoneContato: "", valorDesconto: 0, tipoDesconto: "valor" as const }
      try {
        if (orcamentoDb.itens) {
          const bruto = typeof orcamentoDb.itens === 'string' ? JSON.parse(orcamentoDb.itens) : orcamentoDb.itens
          if (Array.isArray(bruto.items)) {
            itensJSON = bruto.items
          }
          if (bruto.metadados) {
            metadados = {
              valorFrete: Number(bruto.metadados.valorFrete) || 0,
              nomeContato: bruto.metadados.nomeContato || "",
              telefoneContato: bruto.metadados.telefoneContato || "",
              valorDesconto: Number(bruto.metadados.valorDesconto) || 0,
              tipoDesconto: bruto.metadados.tipoDesconto || "valor",
            }
          }
        }
      } catch (e) {}
      
      // Usar produtos do cache se disponível
      let produtosAtuais = produtos
      if (produtosAtuais.length === 0) {
        const { data: pData } = await supabase.from("produtos").select("*")
        
        // Carregar tecidos base (globais)
        const { data: tecidosBase } = await supabase
          .from("tecidos_base")
          .select("*")
          .order("nome")
        
        const tecidosGlobais = (tecidosBase || []).map((t: any) => ({
          nome: t.nome,
          composicao: t.composicao || "",
        }))
        
        // Carregar tecidos para cada produto
        produtosAtuais = await Promise.all(
          (pData || []).map(async (p: any) => {
            const { data: tecidosData } = await supabase
              .from("tecidos")
              .select("*")
              .eq("produto_id", p.id)
            
            // Se o produto tem tecidos específicos, usar esses. Senão, usar tecidos globais.
            const tecidosProduto = (tecidosData && tecidosData.length > 0)
              ? tecidosData.map((t: any) => ({ nome: t.nome, composicao: t.composicao || "" }))
              : tecidosGlobais
            
            return { 
              id: p.id,
              codigo: p.codigo || "",
              nome: p.nome,
              valorBase: Number(p.valor_base) || 0,
              tecidos: tecidosProduto,
              cores: p.cores || [], 
              tamanhosDisponiveis: p.tamanhos_disponiveis || [] 
            }
          })
        )
      }
      
      // Carregar tecidos base para fallback
      let tecidosGlobaisFallback: { nome: string; composicao: string }[] = []
      const { data: tecidosBaseFallback } = await supabase.from("tecidos_base").select("*").order("nome")
      tecidosGlobaisFallback = (tecidosBaseFallback || []).map((t: any) => ({ nome: t.nome, composicao: t.composicao || "" }))
      
      // Processar itens completos
      const itensCompletos = await Promise.all(
        (itensData || []).map(async (item: any, idx: number) => {
          let produto = produtosAtuais.find(p => p.id === item.produto_id)
          
          // Se produto não encontrado no cache, buscar do banco
          if (!produto && item.produto_id) {
            const { data: pData } = await supabase
              .from("produtos")
              .select("*")
              .eq("id", item.produto_id)
              .single()
            
            if (pData) {
              const { data: tecidosData } = await supabase
                .from("tecidos")
                .select("*")
                .eq("produto_id", pData.id)
              
              const tecidosProduto = (tecidosData && tecidosData.length > 0)
                ? tecidosData.map((t: any) => ({ nome: t.nome, composicao: t.composicao || "" }))
                : tecidosGlobaisFallback
              
              produto = {
                id: pData.id,
                codigo: pData.codigo || "",
                nome: pData.nome,
                valorBase: Number(pData.valor_base) || 0,
                tecidos: tecidosProduto,
                cores: pData.cores || [],
                tamanhosDisponiveis: pData.tamanhos_disponiveis || []
              }
            }
          }
          
          let tecidos = produto?.tecidos || []
          if (tecidos.length === 0) {
            // Primeiro tentar tecidos específicos do produto
            if (produto) {
              const { data: tData } = await supabase.from("tecidos").select("*").eq("produto_id", produto.id)
              if (tData && tData.length > 0) {
                tecidos = tData.map((t: any) => ({ nome: t.nome, composicao: t.composicao || "" }))
              }
            }
            // Se ainda não tem, usar tecidos base globais
            if (tecidos.length === 0) {
              tecidos = tecidosGlobaisFallback
            }
          }
          
          // Garantir que cores também esteja disponível - usar cores do produto ou fallback
          let cores = produto?.cores || []
          if (cores.length === 0) {
            // Buscar cores base como fallback
            const { data: coresBase } = await supabase.from("cores").select("nome").order("nome")
            cores = (coresBase || []).map((c: any) => c.nome)
          }
          
          let jsonItem = itensJSON.find((j: any) => j.id === item.id)
          if (!jsonItem) {
            const pos = typeof item.posicao === 'number' ? item.posicao : idx
            jsonItem = itensJSON[pos] || null
          }
          
          return {
            id: item.id,
            produtoId: item.produto_id,
            quantidade: jsonItem?.quantidade ?? item.quantidade,
            valorUnitario: Number(jsonItem?.valorUnitario ?? item.valor_unitario),
            tipoTamanhoSelecionado: jsonItem?.tipoTamanhoSelecionado || null,
            tamanhos: jsonItem?.tamanhos || item.tamanhos || {},
            estampas: jsonItem?.estampas || [],
            observacaoComercial: jsonItem?.observacaoComercial || item.observacao_comercial || "",
            observacaoTecnica: jsonItem?.observacaoTecnica || item.observacao_tecnica || "",
            imagem: jsonItem?.imagem || item.imagem,
            produto: produto ? { ...produto, tecidos, cores } : undefined,
            tecidoSelecionado: tecidos.find((t: any) => t.nome === item.tecido_nome) || (tecidos[0] || undefined),
            corSelecionada: item.cor_selecionada || (cores[0] || ""),
            descontoUnitarioPercentual: jsonItem?.descontoUnitarioPercentual || item.desconto_unitario_percentual || 0,
          }
        })
      )
      
      const orcamentoCompleto: Orcamento = {
        id: orcamentoDb.id,
        numero: orcamentoDb.numero,
        data: orcamentoDb.data,
        cliente: orcamentoDb.cliente || { id: "", codigo: "", nome: "", cnpj: "", telefone: "", email: "", endereco: "" },
        itens: itensCompletos,
        condicoesPagamento: orcamentoDb.condicoes_pagamento,
        prazoEntrega: orcamentoDb.prazo_entrega,
        validadeOrcamento: orcamentoDb.validade_orcamento,
        observacoes: orcamentoDb.observacoes || "",
        valorFrete: Number(orcamentoDb.valor_frete) || metadados.valorFrete,
        nomeContato: orcamentoDb.contato_nome || metadados.nomeContato || extrairContatoDoNumero(orcamentoDb.numero) || "",
        telefoneContato: orcamentoDb.contato_telefone || metadados.telefoneContato || "",
        valorDesconto: metadados.valorDesconto,
        tipoDesconto: metadados.tipoDesconto,
        status: orcamentoDb.status,
      }
      
      // Salvar no cache
      orcamentosCache.set(id, { data: orcamentoCompleto, timestamp: Date.now() })
      
      return orcamentoCompleto
    } catch (error) {
      console.error("Erro ao carregar orçamento:", error)
      return null
    }
  }, [produtos])

  // Invalidar cache de um orçamento específico
  const invalidateOrcamento = useCallback((id: string) => {
    orcamentosCache.delete(id)
    // Também atualizar a lista
    setOrcamentosTimestamp(0)
  }, [])

  // Remover orçamento da lista local (para exclusão instantânea sem recarregar)
  const removeOrcamentoFromList = useCallback((id: string) => {
    orcamentosCache.delete(id)
    setOrcamentosLista(prev => prev.filter(orc => orc.id !== id))
  }, [])

  // Atualizar orcamento na lista local sem recarregar todos os dados
  const updateOrcamentoInList = useCallback((id: string, patch: Partial<OrcamentoResumido>) => {
    setOrcamentosLista((prev) => prev.map((orc) => (orc.id === id ? { ...orc, ...patch } : orc)))
  }, [])

  // Inicializar todos os dados em paralelo
  const initializeAll = useCallback(async () => {
    if (isInitialized) return
    
    await Promise.all([
      reloadClientes(true),
      reloadProdutos(true),
      reloadEmpresa(true),
      reloadOrcamentos(true)
    ])
    
    setIsInitialized(true)
  }, [isInitialized, reloadClientes, reloadProdutos, reloadEmpresa, reloadOrcamentos])

  // Inicializar automaticamente na primeira renderização
  useEffect(() => {
    if (!isInitialized && tenantId && !userLoading) {
      initializeAll()
    }
  }, [isInitialized, initializeAll, tenantId, userLoading])

  // Reinicializar quando o tenantId mudar (logout/login)
  useEffect(() => {
    if (tenantId && !userLoading) {
      // Limpar dados antigos
      setClientes([])
      setProdutos([])
      setDadosEmpresa(undefined)
      setOrcamentosLista([])
      orcamentosCache.clear()
      setIsInitialized(false)
      // Recarregar com novo tenant
      setClientesTimestamp(0)
      setProdutosTimestamp(0)
      setEmpresaTimestamp(0)
      setOrcamentosTimestamp(0)
    }
  }, [tenantId])

  const value: DataCacheContextType = {
    clientes,
    clientesLoading,
    reloadClientes: () => reloadClientes(true),
    
    produtos,
    produtosLoading,
    reloadProdutos: () => reloadProdutos(true),
    
    dadosEmpresa,
    empresaLoading,
    reloadEmpresa: () => reloadEmpresa(true),
    
    orcamentosLista,
    orcamentosLoading,
    reloadOrcamentos: () => reloadOrcamentos(true),
    
    getOrcamentoCompleto,
    invalidateOrcamento,
    removeOrcamentoFromList,
    updateOrcamentoInList,
    
    isInitialized,
    initializeAll
  }

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (context === undefined) {
    throw new Error('useDataCache deve ser usado dentro de DataCacheProvider')
  }
  return context
}


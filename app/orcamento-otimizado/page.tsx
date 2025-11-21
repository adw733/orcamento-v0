"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Search, Save, Copy, RefreshCw, Eye, Edit3, FileDown, Hash, Calendar, Building2, DollarSign, User, Phone, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import VisualizacaoEditavel from "@/components/visualizacao-editavel"
import { useSearchParams } from "next/navigation"
import type { Cliente, Produto, Orcamento, ItemOrcamento, DadosEmpresa } from "@/types/types"
import { pdf } from '@react-pdf/renderer'
import { PDFOrcamento } from '@/components/pdf-orcamento'
import { PDFTodasFichasTecnicas } from '@/components/pdf-ficha-tecnica'
import { NavigationHeader } from '@/components/navigation-header'

// Helper para gerar UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function OrcamentoOtimizado({ id, onOrcamentoChange }: { id?: string, onOrcamentoChange?: (id: string) => void }) {
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

  // Estado para armazenar o orçamento original (para verificar alterações)
  const [orcamentoOriginal, setOrcamentoOriginal] = useState<Orcamento | null>(null)

  const [temAlteracoes, setTemAlteracoes] = useState(false)

  // Estados para Preview e PDF
  const [modoVisualizacao, setModoVisualizacao] = useState<"orcamento" | "ficha" | "completo">("completo")
  const [modoEdicao, setModoEdicao] = useState(true)
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa | undefined>(undefined)

  // Estados para carregar orçamentos (Lista)
  const [mostrarListaOrcamentos, setMostrarListaOrcamentos] = useState(false)
  const [orcamentosSalvos, setOrcamentosSalvos] = useState<Orcamento[]>([])
  const [carregandoOrcamentos, setCarregandoOrcamentos] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)

  // Estados para edição do número do orçamento
  const [editandoNumero, setEditandoNumero] = useState(false)
  const [numeroTemp, setNumeroTemp] = useState("")
  const [erroNumero, setErroNumero] = useState("")

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])

  // Carregar orçamento pelo ID da URL se existir
  useEffect(() => {
    if (idUrl && idUrl !== orcamento.id && !isLoading) {
      carregarOrcamentoPorId(idUrl)
    }
  }, [idUrl, isLoading, orcamento.id])

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

  // Marcar que houve alterações comparando com o original
  useEffect(() => {
    if (!orcamentoOriginal) {
      // Se não tem original (novo orçamento), qualquer dado inserido é alteração
      if (orcamento.itens.length > 0 || orcamento.cliente) {
        setTemAlteracoes(true)
      } else {
        setTemAlteracoes(false)
      }
      return
    }

    // Comparação profunda simplificada
    const atual = JSON.stringify({
      ...orcamento,
      // Ignorar campos que podem mudar sem afetar o conteúdo principal se necessário
    })
    const original = JSON.stringify(orcamentoOriginal)

    setTemAlteracoes(atual !== original)
  }, [orcamento, orcamentoOriginal])

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

      // Carregar itens do orçamento (tabela itens_orcamento)
      const { data: itensData } = await supabase
        .from("itens_orcamento")
        .select("*")
        .eq("orcamento_id", orcamentoDb.id)
        .order("posicao", { ascending: true })

      // Recuperar dados extras do campo JSON legado (itens + metadados)
      let itensJSON: any[] = []
      let metadados = { valorFrete: 0, nomeContato: "", telefoneContato: "" }
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
            }
          }
        }
      } catch (e) {
        console.warn("Erro ao parsear itens/metadados do orçamento:", e)
      }

      // Processar itens completos
      let produtosAtuais = produtos
      if (produtosAtuais.length === 0) {
        const { data: pData } = await supabase.from("produtos").select("*")
        produtosAtuais = (pData || []).map((p: any) => ({ ...p, tecidos: [], cores: [], tamanhosDisponiveis: p.tamanhos_disponiveis || [] }))
      }

      const itensCompletos: ItemOrcamento[] = await Promise.all(
        (itensData || []).map(async (item: any, idx: number) => {
          const produto = produtosAtuais.find(p => p.id === item.produto_id)

          let tecidos = produto?.tecidos || []
          if (produto && tecidos.length === 0) {
            const { data: tData } = await supabase.from("tecidos").select("*").eq("produto_id", produto.id)
            tecidos = (tData || []).map((t: any) => ({ nome: t.nome, composicao: t.composicao || "" }))
          }

          // Tentar casar item da tabela com item do JSON (por id, depois por posição/índice)
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
            produto: produto ? { ...produto, tecidos } : undefined,
            tecidoSelecionado: produto?.tecidos?.find((t: any) => t.nome === item.tecido_nome) || (tecidos?.[0] || undefined),
            corSelecionada: item.cor_selecionada || (produto?.cores?.[0] || ""),
          }
        })
      )

      const novoOrcamento = {
        id: orcamentoDb.id,
        numero: orcamentoDb.numero,
        data: orcamentoDb.data,
        cliente: orcamentoDb.cliente || { id: "", codigo: "", nome: "", cnpj: "", telefone: "", email: "", endereco: "" },
        itens: itensCompletos,
        condicoesPagamento: orcamentoDb.condicoes_pagamento,
        prazoEntrega: orcamentoDb.prazo_entrega,
        validadeOrcamento: orcamentoDb.validade_orcamento,
        observacoes: orcamentoDb.observacoes || "",
        valorFrete: metadados.valorFrete,
        nomeContato: metadados.nomeContato,
        telefoneContato: metadados.telefoneContato,
        status: orcamentoDb.status,
      }

      setOrcamento(novoOrcamento)
      setOrcamentoOriginal(novoOrcamento) // Salvar cópia original

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

  // Função para gerar PDF do Orçamento COMPLETO (com fichas técnicas)
  const gerarPDFOrcamento = async () => {
    console.log('🎯 INICIANDO GERAÇÃO DE PDF DO ORÇAMENTO COMPLETO')
    setExportandoPDF(true)
    try {
      console.log('📄 Criando documento PDF completo...', { orcamento, dadosEmpresa })
      
      // Gerar nome do arquivo: 01 - ORCAMENTO_0187_MIZU_CIMENTOS_DANIELLE
      const numeroOrcamento = orcamento.numero.split(' - ')[0] || orcamento.numero
      const nomeCliente = (orcamento.cliente?.nome || 'CLIENTE')
        .toUpperCase()
        .replace(/\s+/g, '_')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      const nomeContato = (orcamento.nomeContato || '')
        .toUpperCase()
        .replace(/\s+/g, '_')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      
      const fileName = `01 - ORCAMENTO_${numeroOrcamento}_${nomeCliente}${nomeContato ? '_' + nomeContato : ''}.pdf`
      
      // Gerar os dois PDFs separadamente e combinar
      const docOrcamento = <PDFOrcamento orcamento={orcamento} dadosEmpresa={dadosEmpresa} calcularTotal={calcularTotal} />
      const docFichas = <PDFTodasFichasTecnicas orcamento={orcamento} dadosEmpresa={dadosEmpresa} />
      
      // Gerar blobs
      const blobOrcamento = await pdf(docOrcamento).toBlob()
      const blobFichas = await pdf(docFichas).toBlob()
      
      // Combinar os PDFs usando pdf-lib
      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      
      // Carregar o PDF do orçamento
      const pdfOrcamento = await PDFDocument.load(await blobOrcamento.arrayBuffer())
      const pagesOrcamento = await pdfDoc.copyPages(pdfOrcamento, pdfOrcamento.getPageIndices())
      pagesOrcamento.forEach((page: any) => pdfDoc.addPage(page))
      
      // Carregar o PDF das fichas
      const pdfFichas = await PDFDocument.load(await blobFichas.arrayBuffer())
      const pagesFichas = await pdfDoc.copyPages(pdfFichas, pdfFichas.getPageIndices())
      pagesFichas.forEach((page: any) => pdfDoc.addPage(page))
      
      // Salvar o PDF combinado
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      
      console.log('✅ PDF combinado gerado:', blob.size, 'bytes')
      
      // Criar link de download e forçar download do arquivo
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      console.log('📥 Iniciando download:', fileName)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('✅ PDF COMPLETO GERADO COM SUCESSO!')
      
      toast({
        title: "✅ PDF Gerado",
        description: "Orçamento completo (com fichas técnicas) baixado com sucesso!",
      })
    } catch (err) {
      console.error('❌ ERRO ao gerar PDF do orçamento:', err)
      console.error('Stack:', (err as Error).stack)
      toast({
        title: "❌ Erro",
        description: "Erro ao gerar PDF: " + (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setExportandoPDF(false)
    }
  }

  // Função para gerar PDF APENAS das Fichas Técnicas
  const gerarPDFFichasTecnicas = async () => {
    console.log('🎯 INICIANDO GERAÇÃO DE PDF DAS FICHAS TÉCNICAS')
    setExportandoPDF(true)
    try {
      console.log('📄 Criando documento PDF das fichas...', { orcamento, dadosEmpresa })
      
      // Gerar nome do arquivo: 02 - FICHA_TECNICA_0187_MIZU_CIMENTOS_DANIELLE
      const numeroOrcamento = orcamento.numero.split(' - ')[0] || orcamento.numero
      const nomeCliente = (orcamento.cliente?.nome || 'CLIENTE')
        .toUpperCase()
        .replace(/\s+/g, '_')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      const nomeContato = (orcamento.nomeContato || '')
        .toUpperCase()
        .replace(/\s+/g, '_')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      
      const fileName = `02 - FICHA_TECNICA_${numeroOrcamento}_${nomeCliente}${nomeContato ? '_' + nomeContato : ''}.pdf`
      
      const doc = <PDFTodasFichasTecnicas orcamento={orcamento} dadosEmpresa={dadosEmpresa} />
      
      console.log('🔄 Convertendo para PDF...')
      const asPdf = pdf(doc)
      
      console.log('💾 Gerando blob...')
      const blob = await asPdf.toBlob()
      console.log('✅ Blob gerado:', blob.size, 'bytes')
      
      // Criar link de download e forçar download do arquivo
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      console.log('📥 Iniciando download:', fileName)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('✅ PDF DAS FICHAS GERADO COM SUCESSO!')
      
      toast({
        title: "✅ PDF Gerado",
        description: "Fichas técnicas baixadas com sucesso!",
      })
    } catch (err) {
      console.error('❌ ERRO ao gerar PDF das fichas:', err)
      console.error('Stack:', (err as Error).stack)
      toast({
        title: "❌ Erro",
        description: "Erro ao gerar PDF: " + (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setExportandoPDF(false)
    }
  }

  // Validar e atualizar número do orçamento
  const validarEAtualizarNumero = async (novoNumero: string) => {
    try {
      // Validar formato (deve ser 4 dígitos)
      const numeroLimpo = novoNumero.trim().padStart(4, "0")
      if (!/^\d{4}$/.test(numeroLimpo)) {
        setErroNumero("Número deve ter 4 dígitos")
        return false
      }

      // Verificar se o número já existe (exceto se for o próprio orçamento)
      const { data: orcamentosExistentes } = await supabase
        .from("orcamentos")
        .select("id, numero")
        .is("deleted_at", null)
        .ilike("numero", `${numeroLimpo} - %`)

      if (orcamentosExistentes && orcamentosExistentes.length > 0) {
        // Se encontrou, verificar se não é o próprio orçamento
        const numeroExiste = orcamentosExistentes.some((orc) => orc.id !== orcamento.id)
        if (numeroExiste) {
          setErroNumero(`Número ${numeroLimpo} já existe`)
          return false
        }
      }

      // Atualizar o número mantendo o restante do formato
      const partesNumero = orcamento.numero.split(" - ")
      const novoNumeroCompleto = `${numeroLimpo} - ${partesNumero.slice(1).join(" - ")}`
      
      setOrcamento({ ...orcamento, numero: novoNumeroCompleto })
      setTemAlteracoes(true)
      setErroNumero("")
      setEditandoNumero(false)
      
      toast({
        title: "✅ Número atualizado",
        description: `Número alterado para ${numeroLimpo}. Salve o orçamento para confirmar.`,
      })
      
      return true
    } catch (error) {
      console.error("Erro ao validar número:", error)
      setErroNumero("Erro ao validar número")
      return false
    }
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
          .is("deleted_at", null)
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
        itens: JSON.stringify({ // Legado
          items: orcamento.itens.map((item) => ({
            id: item.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            tecidoSelecionado: item.tecidoSelecionado,
            corSelecionada: item.corSelecionada,
            tipoTamanhoSelecionado: item.tipoTamanhoSelecionado,
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

      const orcamentoId = result.data.id

      // Salvar itens com segurança: primeiro salvar novos, depois deletar antigos
      const novosItensIds: string[] = []
      
      for (let index = 0; index < orcamento.itens.length; index++) {
        const item = orcamento.itens[index]
        const dadosItem = {
          orcamento_id: orcamentoId,
          produto_id: item.produtoId && item.produtoId.length > 5 ? item.produtoId : null,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          tecido_nome: item.tecidoSelecionado?.nome,
          tecido_composicao: item.tecidoSelecionado?.composicao,
          cor_selecionada: item.corSelecionada,
          tamanhos: item.tamanhos,
          observacao_comercial: item.observacaoComercial,
          observacao_tecnica: item.observacaoTecnica,
          imagem: item.imagem,
          posicao: index,
        }

        // Se o item já tem ID, tentar atualizar; se não, inserir novo
        if (item.id && typeof item.id === 'string' && item.id.length > 10) {
          const { data: itemAtualizado, error: updateError } = await supabase
            .from("itens_orcamento")
            .update(dadosItem)
            .eq("id", item.id)
            .eq("orcamento_id", orcamentoId)
            .select()
            .single()

          if (!updateError && itemAtualizado) {
            novosItensIds.push(itemAtualizado.id)
          } else {
            // Se falhou atualizar, tentar inserir como novo
            const { data: novoItem, error: insertError } = await supabase
              .from("itens_orcamento")
              .insert(dadosItem)
              .select()
              .single()

            if (insertError) {
              console.error("Erro ao inserir item:", insertError)
            } else if (novoItem) {
              novosItensIds.push(novoItem.id)
            }
          }
        } else {
          // Item novo, inserir
          const { data: novoItem, error: insertError } = await supabase
            .from("itens_orcamento")
            .insert(dadosItem)
            .select()
            .single()

          if (insertError) {
            console.error("Erro ao inserir item:", insertError)
          } else if (novoItem) {
            novosItensIds.push(novoItem.id)
          }
        }
      }

      // Agora deletar apenas os itens que não estão mais na lista (foram removidos pelo usuário)
      if (orcamento.id && novosItensIds.length > 0) {
        await supabase
          .from("itens_orcamento")
          .delete()
          .eq("orcamento_id", orcamentoId)
          .not("id", "in", `(${novosItensIds.join(",")})`)
      }

      const novoOrcamento = { ...orcamento, id: orcamentoId, numero: numeroCompleto }
      setOrcamento(novoOrcamento)
      setOrcamentoOriginal(novoOrcamento) // Atualizar original após salvar
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
    if (onOrcamentoChange) {
      onOrcamentoChange("")
    } else {
      window.history.pushState({}, "", "/orcamento-otimizado")
    }
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
    <div className="h-full flex flex-col bg-gray-50 overflow-x-hidden">
      {/* Wrapper superior igual ao GeradorOrcamento (padding + espaçamento vertical) */}
      <div className="p-2 md:p-4 space-y-2 md:space-y-3">
        {/* Banner de alterações não salvas - mesmo estilo do GeradorOrcamento */}
        {modoEdicao && temAlteracoes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between print:hidden">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">
                Há alterações não salvas neste orçamento
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              onClick={salvarOrcamento}
            >
              <Save className="h-3 w-3 mr-1" />
              Salvar
            </Button>
          </div>
        )}

        {/* Header com layout igual ao GeradorOrcamento */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-2 md:p-4 rounded-lg shadow-sm gap-2 border border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <NavigationHeader />
              <h1 className="text-lg md:text-xl font-bold text-primary">Edição de Orçamento</h1>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  {!editandoNumero ? (
                    <p 
                      className="text-gray-600 text-sm md:text-base cursor-pointer hover:text-primary transition-colors"
                      onClick={() => {
                        if (orcamento.id) { // Só permite editar se já foi salvo
                          setEditandoNumero(true)
                          setNumeroTemp(orcamento.numero.split(" - ")[0])
                          setErroNumero("")
                        }
                      }}
                      title={orcamento.id ? "Clique para editar" : "Salve o orçamento antes de editar o número"}
                    >
                      <span className="font-semibold text-primary">Orçamento:</span>{" "}
                      <span className="font-semibold text-gray-800">{orcamento.numero.split(" - ")[0]}</span>
                      {orcamento.id && <Edit3 className="inline h-3.5 w-3.5 ml-1 text-primary" />}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <Input
                        type="text"
                        value={numeroTemp}
                        onChange={(e) => setNumeroTemp(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            validarEAtualizarNumero(numeroTemp)
                          } else if (e.key === "Escape") {
                            setEditandoNumero(false)
                            setErroNumero("")
                          }
                        }}
                        className="w-20 h-7 text-xs"
                        placeholder="0000"
                        maxLength={4}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => validarEAtualizarNumero(numeroTemp)}
                        className="h-7 px-2 text-xs"
                      >
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditandoNumero(false)
                          setErroNumero("")
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>

                {modoEdicao && (
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-primary font-semibold">Status do Orçamento:</span>
                    </div>
                    <Select
                      value={orcamento.status || "5"}
                      onValueChange={(value) => {
                        setOrcamento({ ...orcamento, status: value })
                        setTemAlteracoes(true)
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs md:text-sm w-[210px]">
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
                    <Badge className={`${
                      orcamento.status === "6" ? "bg-red-100 text-red-800 border-red-200" :
                      orcamento.status === "5" ? "bg-blue-100 text-blue-800 border-blue-200" :
                      orcamento.status === "4" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                      orcamento.status === "3" ? "bg-orange-100 text-orange-800 border-orange-200" :
                      orcamento.status === "2" ? "bg-purple-100 text-purple-800 border-purple-200" :
                      "bg-green-100 text-green-800 border-green-200"
                    } text-xs px-2 py-0.5 rounded-full`}
                    >
                      {orcamento.status === "6" ? "Recusada" :
                       orcamento.status === "5" ? "Proposta" :
                       orcamento.status === "4" ? "Execução" :
                       orcamento.status === "3" ? "Cobrança" :
                       orcamento.status === "2" ? "Entregue" :
                       "Finalizada"}
                    </Badge>
                  </div>
                )}
              </div>

              {erroNumero && (
                <span className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {erroNumero}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-start md:justify-end">
            <Button
              size="sm"
              onClick={abrirListaOrcamentos}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
            >
              <Search className="h-4 w-4" /> Carregar
            </Button>
            
            <Button
              size="sm"
              onClick={() => {
                const novoOrcamento: Orcamento = {
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
                }
                setOrcamento(novoOrcamento)
                setOrcamentoOriginal(null)
                setTemAlteracoes(false)
                window.history.pushState({}, "", '/orcamento-otimizado')
              }}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
            >
              <Plus className="h-4 w-4" /> Novo
            </Button>
            {/* Botões de Ação */}
            <Button
              size="sm"
              onClick={async () => {
                if (!orcamento.id) {
                  toast({
                    title: "⚠️ Aviso",
                    description: "Salve o orçamento antes de copiá-lo.",
                    variant: "destructive",
                  })
                  return
                }

                try {
                  setIsSaving(true)
                  const { data: ultimoOrcamento } = await supabase
                    .from("orcamentos")
                    .select("numero")
                    .is("deleted_at", null)
                    .order("created_at", { ascending: false })
                    .limit(1)

                  let proximoNumero = "0001"
                  if (ultimoOrcamento && ultimoOrcamento.length > 0) {
                    const numeroAtual = Number.parseInt(ultimoOrcamento[0].numero.split(" - ")[0], 10)
                    if (!isNaN(numeroAtual)) {
                      proximoNumero = (numeroAtual + 1).toString().padStart(4, "0")
                    }
                  }

                  const primeiroItem = orcamento.itens[0]?.produto?.nome || "Item"
                  const nomeCliente = orcamento.cliente?.nome || "CLIENTE"
                  const numeroCompleto = `${proximoNumero} - ${primeiroItem} - ${nomeCliente} - ${orcamento.nomeContato || ""}`

                  const dadosOrcamento = {
                    numero: numeroCompleto,
                    data: new Date().toISOString().split('T')[0],
                    cliente_id: orcamento.cliente?.id && orcamento.cliente.id.length > 10 ? orcamento.cliente.id : null,
                    observacoes: orcamento.observacoes,
                    condicoes_pagamento: orcamento.condicoesPagamento,
                    prazo_entrega: orcamento.prazoEntrega,
                    validade_orcamento: orcamento.validadeOrcamento,
                    status: orcamento.status || "5 - Proposta",
                    itens: JSON.stringify({
                      items: orcamento.itens.map((item) => ({
                        id: item.id,
                        produtoId: item.produtoId,
                        quantidade: item.quantidade,
                        valorUnitario: item.valorUnitario,
                        tamanhos: item.tamanhos,
                        estampas: item.estampas,
                        observacaoComercial: item.observacaoComercial,
                        observacaoTecnica: item.observacaoTecnica,
                        imagem: item.imagem,
                        tipoTamanhoSelecionado: item.tipoTamanhoSelecionado,
                      })),
                      metadados: {
                        valorFrete: orcamento.valorFrete,
                        nomeContato: orcamento.nomeContato,
                        telefoneContato: orcamento.telefoneContato,
                      },
                    }),
                  }

                  const { data: novoOrcamento, error } = await supabase
                    .from("orcamentos")
                    .insert(dadosOrcamento)
                    .select()
                    .single()

                  if (error) throw error

                  const itensParaInserir = orcamento.itens.map((item, index) => ({
                    id: item.id,
                    orcamento_id: novoOrcamento.id,
                    produto_id: item.produtoId,
                    quantidade: item.quantidade,
                    valor_unitario: item.valorUnitario,
                    tamanhos: item.tamanhos,
                    observacao_comercial: item.observacaoComercial || "",
                    observacao_tecnica: item.observacaoTecnica || "",
                    imagem: item.imagem,
                    tecido_nome: item.tecidoSelecionado?.nome || "",
                    cor_selecionada: item.corSelecionada || "",
                    posicao: index,
                  }))

                  const { error: itensError } = await supabase
                    .from("itens_orcamento")
                    .insert(itensParaInserir)

                  if (itensError) throw itensError

                  toast({
                    title: "✅ Sucesso!",
                    description: `Orçamento copiado! Novo número: ${proximoNumero}`,
                  })

                  window.location.href = `/orcamento-otimizado?id=${novoOrcamento.id}`
                } catch (error: any) {
                  console.error("Erro ao copiar:", error)
                  toast({
                    title: "❌ Erro",
                    description: error.message || "Erro ao copiar orçamento",
                    variant: "destructive",
                  })
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-secondary hover:bg-secondary-dark text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
            >
              <Copy className="h-4 w-4" /> Copiar
            </Button>

            <Button
              size="sm"
              onClick={salvarOrcamento}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-success hover:bg-success/80 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
            >
              <Save className="h-4 w-4" /> Atualizar
            </Button>

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
                await gerarPDFOrcamento()
              }}
              disabled={exportandoPDF}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
            >
              <FileDown className="h-4 w-4" /> PDF Orçamento
            </Button>

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
                await gerarPDFFichasTecnicas()
              }}
              disabled={exportandoPDF}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
            >
              <FileDown className="h-4 w-4" /> PDF Ficha
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {/* Visualização Editável */}
        <div className="w-full mx-auto">
          <VisualizacaoEditavel
            orcamento={orcamento}
            setOrcamento={setOrcamento}
            dadosEmpresa={dadosEmpresa}
            setDadosEmpresa={setDadosEmpresa}
            calcularTotal={calcularTotal}
            modoExportacao={modoVisualizacao}
            setModoExportacao={setModoVisualizacao}
            clientes={clientes}
            produtos={produtos}
            onSave={salvarOrcamento}
            temAlteracoes={temAlteracoes}
            mostrarBarraBotoes={false}
            modoEdicaoExterno={modoEdicao}
            setModoEdicaoExterno={setModoEdicao}
          />
        </div>

      </div>

      {/* Dialog Lista */}
      <Dialog open={mostrarListaOrcamentos} onOpenChange={setMostrarListaOrcamentos}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Carregar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 space-y-2">
            {carregandoOrcamentos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : orcamentosSalvos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum orçamento encontrado
              </div>
            ) : (
              orcamentosSalvos.map(o => {
                // Parsear itens se vier como string JSON
                let itensArray: any[] = []
                try {
                  if (typeof o.itens === 'string') {
                    const parsed = JSON.parse(o.itens)
                    itensArray = Array.isArray(parsed.items) ? parsed.items : []
                  } else if (Array.isArray(o.itens)) {
                    itensArray = o.itens
                  }
                } catch (e) {
                  console.warn('Erro ao parsear itens do orçamento:', e)
                }

                const total = itensArray.reduce((acc: number, i: any) => {
                  const qtd = Number(i.quantidade) || 0
                  const valor = Number(i.valor_unitario || i.valorUnitario) || 0
                  return acc + (qtd * valor)
                }, 0)

                const frete = Number((o as any).valor_frete || o.valorFrete) || 0
                const totalComFrete = total + frete

                return (
                  <div 
                    key={o.id} 
                    onClick={() => {
                      setMostrarListaOrcamentos(false)
                      if (onOrcamentoChange && o.id) {
                        onOrcamentoChange(o.id)
                      } else {
                        window.history.pushState({}, "", `/orcamento-otimizado?id=${o.id}`)
                      }
                      carregarOrcamentoPorId(o.id!)
                    }} 
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="font-bold text-primary">{o.numero}</div>
                      <div className="text-sm text-gray-600">{o.cliente?.nome || "Sem cliente"}</div>
                      <div className="text-xs text-gray-400">{new Date(o.data).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        R$ {totalComFrete.toFixed(2)}
                      </div>
                      <Badge variant="outline">{o.status}</Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

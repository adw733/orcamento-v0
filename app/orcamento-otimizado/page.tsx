"use client"

import React, { useState, useEffect, Suspense } from "react"
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
import ChatEdicaoOrcamento from "@/components/chat-edicao-orcamento"
import { useSearchParams } from "next/navigation"
import type { Cliente, Produto, Orcamento, ItemOrcamento, DadosEmpresa } from "@/types/types"
import { pdf } from '@react-pdf/renderer'
import { PDFOrcamento } from '@/components/pdf-orcamento'
import { PDFTodasFichasTecnicas } from '@/components/pdf-ficha-tecnica'
import { PageHeader } from '@/components/page-header'
import { useDataCache } from '@/lib/data-cache'

// Helper para gerar UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function OrcamentoOtimizadoInner({ id, onOrcamentoChange }: { id?: string, onOrcamentoChange?: (id: string) => void }) {
  const searchParams = useSearchParams()
  const idUrl = id || searchParams.get("id")

  // Usar cache global para dados compartilhados
  const { 
    clientes, 
    produtos, 
    dadosEmpresa: dadosEmpresaCache, 
    orcamentosLista,
    orcamentosLoading,
    getOrcamentoCompleto,
    invalidateOrcamento,
    isInitialized 
  } = useDataCache()

  const [isLoadingOrcamento, setIsLoadingOrcamento] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa | undefined>(undefined)

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
    telefoneContato: "",
    valorDesconto: 0,
    tipoDesconto: "valor"
  })

  // Estado para armazenar o orçamento original (para verificar alterações)
  const [orcamentoOriginal, setOrcamentoOriginal] = useState<Orcamento | null>(null)

  const [temAlteracoes, setTemAlteracoes] = useState(false)

  // Estados para Preview e PDF
  const [modoVisualizacao, setModoVisualizacao] = useState<"orcamento" | "ficha" | "completo">("completo")
  const [modoEdicao, setModoEdicao] = useState(true)

  // Estados para carregar orçamentos (Lista)
  const [mostrarListaOrcamentos, setMostrarListaOrcamentos] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)

  // Estados para edição do número do orçamento
  const [editandoNumero, setEditandoNumero] = useState(false)
  const [numeroTemp, setNumeroTemp] = useState("")
  const [erroNumero, setErroNumero] = useState("")
  

  // Sincronizar dados da empresa do cache
  useEffect(() => {
    if (dadosEmpresaCache) {
      setDadosEmpresa(dadosEmpresaCache)
    }
  }, [dadosEmpresaCache])

  // Carregar orçamento pelo ID da URL se existir (usando cache)
  useEffect(() => {
    if (idUrl && idUrl !== orcamento.id && isInitialized && !isLoadingOrcamento) {
      carregarOrcamentoPorId(idUrl)
    }
  }, [idUrl, isInitialized, isLoadingOrcamento, orcamento.id])

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

  // Função para carregar orçamento usando cache global
  const carregarOrcamentoPorId = async (id: string) => {
    try {
      setIsLoadingOrcamento(true)

      // Usar cache global para carregar orçamento
      const orcamentoCompleto = await getOrcamentoCompleto(id)
      
      if (!orcamentoCompleto) {
        toast({
          title: "Erro",
          description: "Orçamento não encontrado.",
          variant: "destructive",
        })
        return
      }

      setOrcamento(orcamentoCompleto)
      setOrcamentoOriginal(orcamentoCompleto)
      setTemAlteracoes(false)

      toast({
        title: "✅ Orçamento Carregado",
        description: `Orçamento ${orcamentoCompleto.numero} carregado.`,
      })

    } catch (error) {
      console.error("Erro ao carregar orçamento:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o orçamento.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingOrcamento(false)
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

      // Invalidar cache para forçar atualização na próxima vez
      invalidateOrcamento(orcamentoId)

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
      telefoneContato: "",
      valorDesconto: 0,
      tipoDesconto: "valor"
    })
    setTemAlteracoes(false)
    if (onOrcamentoChange) {
      onOrcamentoChange("")
    } else {
      window.history.pushState({}, "", "/orcamento-otimizado")
    }
  }

  // Usar lista de orçamentos do cache global
  const abrirListaOrcamentos = () => {
    setMostrarListaOrcamentos(true)
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

        {/* Header Padronizado */}
        <PageHeader
          title="Edição de Orçamento"
          badge={
            <div className="flex flex-wrap items-center gap-2">
              {/* Número do Orçamento */}
              {!editandoNumero ? (
                <button 
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                  onClick={() => {
                    if (orcamento.id) {
                      setEditandoNumero(true)
                      setNumeroTemp(orcamento.numero.split(" - ")[0])
                      setErroNumero("")
                    }
                  }}
                  title={orcamento.id ? "Clique para editar" : "Salve o orçamento antes de editar o número"}
                >
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-gray-700">{orcamento.numero.split(" - ")[0]}</span>
                  {orcamento.id && <Edit3 className="h-3 w-3 text-primary" />}
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="text"
                    value={numeroTemp}
                    onChange={(e) => setNumeroTemp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") validarEAtualizarNumero(numeroTemp)
                      else if (e.key === "Escape") { setEditandoNumero(false); setErroNumero("") }
                    }}
                    className="w-16 h-7 text-xs"
                    placeholder="0000"
                    maxLength={4}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => validarEAtualizarNumero(numeroTemp)} className="h-7 px-2 text-xs">OK</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditandoNumero(false); setErroNumero("") }} className="h-7 px-2 text-xs">✕</Button>
                </div>
              )}
              
              {/* Status Badge */}
              {modoEdicao && (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={orcamento.status || "5"}
                    onValueChange={(value) => {
                      setOrcamento({ ...orcamento, status: value })
                      setTemAlteracoes(true)
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[140px] border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Finalizada</SelectItem>
                      <SelectItem value="2">2 - Entregue</SelectItem>
                      <SelectItem value="3">3 - Cobrança</SelectItem>
                      <SelectItem value="4">4 - Execução</SelectItem>
                      <SelectItem value="5">5 - Proposta</SelectItem>
                      <SelectItem value="6">6 - Recusada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className={`text-xs px-2 py-0.5 rounded-full ${
                    orcamento.status === "6" ? "bg-red-100 text-red-700" :
                    orcamento.status === "5" ? "bg-blue-100 text-blue-700" :
                    orcamento.status === "4" ? "bg-yellow-100 text-yellow-700" :
                    orcamento.status === "3" ? "bg-orange-100 text-orange-700" :
                    orcamento.status === "2" ? "bg-purple-100 text-purple-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {orcamento.status === "6" ? "Recusada" :
                     orcamento.status === "5" ? "Proposta" :
                     orcamento.status === "4" ? "Execução" :
                     orcamento.status === "3" ? "Cobrança" :
                     orcamento.status === "2" ? "Entregue" : "Finalizada"}
                  </Badge>
                </div>
              )}
              
              {erroNumero && (
                <span className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {erroNumero}
                </span>
              )}
            </div>
          }
        >
          {/* Botões de Ação */}
          <Button size="sm" onClick={abrirListaOrcamentos} className="h-9 px-3 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm">
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Carregar</span>
          </Button>
          
          <Button size="sm" onClick={() => window.location.href = '/orcamento-otimizado'} className="h-9 px-3 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Novo</span>
          </Button>

          <Button
            size="sm"
            onClick={async () => {
              if (!orcamento.id) {
                toast({ title: "⚠️ Aviso", description: "Carregue um orçamento antes de copiá-lo.", variant: "destructive" })
                return
              }
              try {
                // Buscar próximo número disponível
                const { data: ultimoOrcamento } = await supabase.from("orcamentos").select("numero").is("deleted_at", null).order("created_at", { ascending: false }).limit(1)
                let proximoNumero = "0001"
                if (ultimoOrcamento && ultimoOrcamento.length > 0) {
                  const numeroAtual = Number.parseInt(ultimoOrcamento[0].numero.split(" - ")[0], 10)
                  if (!isNaN(numeroAtual)) proximoNumero = (numeroAtual + 1).toString().padStart(4, "0")
                }
                
                // Criar cópia local do orçamento SEM SALVAR no banco
                // Apenas atualiza o estado local para edição
                const novoOrcamento: Orcamento = {
                  ...orcamento,
                  id: undefined, // Remove o ID para indicar que é novo
                  numero: proximoNumero,
                  data: new Date().toISOString().split('T')[0],
                  status: "5 - Proposta",
                  // Gerar novos IDs para os itens
                  itens: orcamento.itens.map((item, index) => ({
                    ...item,
                    id: `temp-${Date.now()}-${index}`, // ID temporário
                  })),
                }
                
                setOrcamento(novoOrcamento)
                setOrcamentoOriginal(novoOrcamento)
                setTemAlteracoes(true) // Marcar como tendo alterações para forçar salvamento
                
                // Atualizar URL sem o ID (novo orçamento)
                window.history.pushState({}, '', '/orcamento-otimizado')
                
                toast({ 
                  title: "📋 Orçamento Copiado", 
                  description: `Cópia criada com número ${proximoNumero}. Clique em "Atualizar" para salvar.`,
                })
              } catch (error: any) {
                console.error("Erro ao copiar:", error)
                toast({ title: "❌ Erro", description: error.message || "Erro ao copiar orçamento", variant: "destructive" })
              }
            }}
            disabled={isSaving}
            className="h-9 px-3 text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Copiar</span>
          </Button>

          <Button size="sm" onClick={salvarOrcamento} disabled={isSaving} className="h-9 px-3 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
            <Save className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={async () => {
              if (!orcamento.cliente || orcamento.itens.length === 0) {
                toast({ title: "⚠️ Aviso", description: "Complete o orçamento para gerar PDF.", variant: "destructive" })
                return
              }
              await gerarPDFOrcamento()
            }}
            disabled={exportandoPDF}
            className="h-9 px-3 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">PDF Orçamento</span>
          </Button>

          <Button
            size="sm"
            onClick={async () => {
              if (!orcamento.cliente || orcamento.itens.length === 0) {
                toast({ title: "⚠️ Aviso", description: "Complete o orçamento para gerar ficha técnica.", variant: "destructive" })
                return
              }
              await gerarPDFFichasTecnicas()
            }}
            disabled={exportandoPDF}
            className="h-9 px-3 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">PDF Ficha</span>
          </Button>
        </PageHeader>
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
      
      {/* Chat flutuante de edição com IA */}
      <ChatEdicaoOrcamento
        orcamento={orcamento}
        setOrcamento={setOrcamento}
      />

      {/* Dialog Lista - usando cache global */}
      <Dialog open={mostrarListaOrcamentos} onOpenChange={setMostrarListaOrcamentos}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Carregar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 space-y-2">
            {orcamentosLoading && orcamentosLista.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : orcamentosLista.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum orçamento encontrado
              </div>
            ) : (
              orcamentosLista.map(o => (
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
                      R$ {(o.valor_total || 0).toFixed(2)}
                    </div>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function OrcamentoOtimizado(props: { id?: string, onOrcamentoChange?: (id: string) => void }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <OrcamentoOtimizadoInner {...props} />
    </Suspense>
  )
}

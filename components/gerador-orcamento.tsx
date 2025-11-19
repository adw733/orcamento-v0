"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Save, Check, AlertCircle, FileDown, Eye, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import LixeiraOrcamentos from "@/components/lixeira-orcamentos"
import { mockClientes, mockProdutos } from "@/lib/mock-data"
import FormularioOrcamento from "@/components/formulario-orcamento"
import VisualizacaoDocumento from "@/components/visualizacao-documento"
import GerenciadorClientes from "@/components/gerenciador-clientes"
import GerenciadorProdutos from "@/components/gerenciador-produtos"
import type { Cliente, Produto, Orcamento, ItemOrcamento, Estampa, DadosEmpresa } from "@/types/types"
import ListaOrcamentos from "@/components/lista-orcamentos"
import AssistenteIA from "@/components/assistente-ia"
// Adicionar a importação do GerenciadorMateriais no início do arquivo, junto com as outras importações
import GerenciadorMateriais from "@/components/gerenciador-materiais"
// Adicionar a importação do GerenciadorTiposTamanho
import GerenciadorTiposTamanho from "@/components/gerenciador-tipos-tamanho"
// Adicionar a importação do GerenciadorEmpresa e DadosEmpresa
import GerenciadorEmpresa from "@/components/gerenciador-empresa"
// Importar o GerenciadorCategorias
import GerenciadorCategorias from "@/components/gerenciador-categorias"
// Adicionar a importação do componente TabelaProdutos no início do arquivo, junto com as outras importações
import TabelaProdutos from "@/components/tabela-produtos"
// Adicionar a importação do componente GerenciadorGastosReceitas
import GerenciadorGastosReceitas from "@/components/gerenciador-gastos-receitas"
import DashboardFinanceiro from "@/components/dashboard-financeiro";
// Adicionar a importação do componente LixeiraOrcamentos
import * as ReactDOM from "react-dom/client"
import { Loader2 } from "lucide-react"
// Adicionar os imports necessários para o modal no início do arquivo:
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// Importar a página de orçamento rápido
import dynamic from 'next/dynamic'
const OrcamentoRapido = dynamic(() => import('@/app/orcamento-rapido/page'), { ssr: false })
const OrcamentoOtimizado = dynamic(() => import('@/app/orcamento-otimizado/page'), { ssr: false })

// Helper function to generate UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function GeradorOrcamento({ abaAtiva: abaAtivaInicial = "orcamentos", setAbaAtiva: setAbaAtivaExterna }) {
  // Estado inicial comum para evitar detectar alterações falsas
  const orcamentoInicial: Orcamento = {
    numero: "Carregando...",
    data: new Date().toISOString().split("T")[0],
    cliente: null,
    itens: [],
    observacoes: "",
    condicoesPagamento: "45 DIAS",
    prazoEntrega: "45 DIAS",
    validadeOrcamento: "15 DIAS",
    status: "5", // Atualizar para o novo formato de status
    valorFrete: 0, // Inicializar o valor do frete
    nomeContato: "",
    telefoneContato: "",
  }
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [orcamento, setOrcamento] = useState<Orcamento>(orcamentoInicial)
  const [isPrinting, setIsPrinting] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<string>(abaAtivaInicial)
  const [isLoading, setIsLoading] = useState(false)
  const [orcamentoSalvo, setOrcamentoSalvo] = useState<string | null>(null)
  // Adicionar um novo estado para controlar se estamos criando um novo orçamento
  const [criandoNovoOrcamento, setCriandoNovoOrcamento] = useState(false)
  const [orcamentoJaCarregado, setOrcamentoJaCarregado] = useState(false)
  // Adicionar estado para feedback de salvamento
  const [feedbackSalvamento, setFeedbackSalvamento] = useState({
    visivel: false,
    sucesso: false,
    mensagem: "",
  })
  // Adicionar estado para controlar a aba ativa
  // Adicionar o estado para os dados da empresa
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa | null>(null)
  // Adicionar o estado para controlar a exportação da ficha técnica
  const [exportandoFichaTecnica, setExportandoFichaTecnica] = useState(false)
  // Adicionar um estado para controlar o modal de visualização após os outros estados:
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false)
  
  // Estados para controle de mudanças não salvas
  const [temAlteracoes, setTemAlteracoes] = useState(false)
  const [orcamentoOriginal, setOrcamentoOriginal] = useState<Orcamento | null>(orcamentoInicial)
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false)
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null)
  const [inicializacaoCompleta, setInicializacaoCompleta] = useState(false)
  const [carregandoOrcamento, setCarregandoOrcamento] = useState(false)
  // Estado para ID do orçamento otimizado
  const [orcamentoOtimizadoId, setOrcamentoOtimizadoId] = useState<string | null>(null)

  const documentoRef = useRef<HTMLDivElement>(null)
  const orcamentoRef = useRef<HTMLDivElement>(null)
  const fichasTecnicasRef = useRef<HTMLDivElement[]>([])
  
  // Estado para controlar o loading do PDF profissional
  const [gerandoPDFProfissional, setGerandoPDFProfissional] = useState(false)

  const recarregarOrcamentosRef = useRef<(() => Promise<void>) | null>(null)
  // Adicionar após a declaração de recarregarOrcamentosRef
  const recarregarLixeiraRef = useRef(null)

  // Sincronizar o estado interno com o externo
  useEffect(() => {
    if (setAbaAtivaExterna) {
      setAbaAtivaExterna(abaAtiva)
    }
  }, [abaAtiva, setAbaAtivaExterna])

  // Função para verificar se há alterações no orçamento
  const verificarAlteracoes = (orcamentoAtual: Orcamento, orcamentoRef: Orcamento | null) => {
    if (!orcamentoRef) return false // Se não há referência, não há alterações para comparar

    // Comparar campos principais
    const alteracoesDetectadas = 
      orcamentoAtual.numero !== orcamentoRef.numero ||
      orcamentoAtual.data !== orcamentoRef.data ||
      orcamentoAtual.cliente?.id !== orcamentoRef.cliente?.id ||
      orcamentoAtual.observacoes !== orcamentoRef.observacoes ||
      orcamentoAtual.condicoesPagamento !== orcamentoRef.condicoesPagamento ||
      orcamentoAtual.prazoEntrega !== orcamentoRef.prazoEntrega ||
      orcamentoAtual.validadeOrcamento !== orcamentoRef.validadeOrcamento ||
      orcamentoAtual.status !== orcamentoRef.status ||
      orcamentoAtual.valorFrete !== orcamentoRef.valorFrete ||
      orcamentoAtual.nomeContato !== orcamentoRef.nomeContato ||
      orcamentoAtual.telefoneContato !== orcamentoRef.telefoneContato ||
      orcamentoAtual.itens.length !== orcamentoRef.itens.length

    if (alteracoesDetectadas) return true

    // Comparação robusta de itens - apenas campos essenciais
    for (let i = 0; i < orcamentoAtual.itens.length; i++) {
      const itemAtual = orcamentoAtual.itens[i]
      const itemRef = orcamentoRef.itens[i]
      
      if (!itemRef) return true
      
      // Comparar apenas campos essenciais que realmente importam
      if (
        itemAtual.produtoId !== itemRef.produtoId ||
        itemAtual.quantidade !== itemRef.quantidade ||
        Number(itemAtual.valorUnitario) !== Number(itemRef.valorUnitario) ||
        (itemAtual.tecidoSelecionado?.nome || '') !== (itemRef.tecidoSelecionado?.nome || '') ||
        (itemAtual.corSelecionada || '') !== (itemRef.corSelecionada || '') ||
        (itemAtual.observacaoComercial || '') !== (itemRef.observacaoComercial || '') ||
        (itemAtual.observacaoTecnica || '') !== (itemRef.observacaoTecnica || '') ||
        JSON.stringify(itemAtual.tamanhos || {}) !== JSON.stringify(itemRef.tamanhos || {}) ||
        (itemAtual.estampas?.length || 0) !== (itemRef.estampas?.length || 0)
      ) {
        return true
      }

      // Comparação detalhada das estampas
      if (itemAtual.estampas && itemRef.estampas) {
        for (let j = 0; j < itemAtual.estampas.length; j++) {
          const estampaAtual = itemAtual.estampas[j]
          const estampaRef = itemRef.estampas[j]
          
          if (!estampaRef) return true
          
          if (
            (estampaAtual.posicao || '') !== (estampaRef.posicao || '') ||
            (estampaAtual.tipo || '') !== (estampaRef.tipo || '') ||
            Number(estampaAtual.largura || 0) !== Number(estampaRef.largura || 0) ||
            Number(estampaAtual.comprimento || 0) !== Number(estampaRef.comprimento || 0)
          ) {
            return true
          }
        }
      }
    }

    return false
  }

  // Função para abrir modal de confirmação
  const abrirModalConfirmacao = (acao: () => void) => {
    setAcaoPendente(() => acao)
    setModalConfirmacaoAberto(true)
  }

  // Função para salvar e executar ação pendente
  const salvarEContinuar = async () => {
    if (orcamentoSalvo) {
      await atualizarOrcamentoExistente()
    } else {
      await salvarNovoOrcamento()
    }
    
    setModalConfirmacaoAberto(false)
    if (acaoPendente) {
      acaoPendente()
      setAcaoPendente(null)
    }
  }

  // Função para descartar mudanças e continuar
  const descartarEContinuar = () => {
    setTemAlteracoes(false)
    setModalConfirmacaoAberto(false)
    if (acaoPendente) {
      acaoPendente()
      setAcaoPendente(null)
    }
  }

  // useEffect para detectar mudanças - VERSÃO FINAL
  useEffect(() => {
    // Não detectar durante carregamento de orçamento ou inicialização
    if (!inicializacaoCompleta || carregandoOrcamento) return
    
    const alteracoes = verificarAlteracoes(orcamento, orcamentoOriginal)
    setTemAlteracoes(alteracoes)
  }, [orcamento, orcamentoOriginal, inicializacaoCompleta, carregandoOrcamento])

  // useEffect para prevenir fechamento da página com alterações não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (temAlteracoes && abaAtiva === "orcamento") {
        e.preventDefault()
        e.returnValue = "Você tem alterações não salvas. Tem certeza que deseja sair?"
        return "Você tem alterações não salvas. Tem certeza que deseja sair?"
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [temAlteracoes, abaAtiva])

  // Função para obter o próximo número de orçamento
  const obterProximoNumeroOrcamento = async (): Promise<string> => {
    try {
      // Buscar todos os números de orçamentos, excluindo os que estão na lixeira
      const { data: todosOrcamentos, error: erroTodos } = await supabase
        .from("orcamentos")
        .select("numero")
        .is("deleted_at", null) // Excluir orçamentos na lixeira
        .order("created_at", { ascending: false })

      if (erroTodos) {
        console.error("Erro ao buscar todos os orçamentos:", erroTodos)
        return "0140"
      }

      // Encontrar o maior número entre todos os orçamentos válidos
      let maiorNumero = 139 // Valor padrão antes do 0140

      if (todosOrcamentos && todosOrcamentos.length > 0) {
        todosOrcamentos.forEach((orc) => {
          if (orc.numero) {
            // Extrair apenas os dígitos do início do número (formato "XXXX - ..." ou apenas "XXXX")
            const numeroStr = orc.numero.split(" - ")[0].replace(/\D/g, "")
            const numero = Number.parseInt(numeroStr, 10)

            if (!isNaN(numero) && numero > maiorNumero) {
              maiorNumero = numero
            }
          }
        })
      }

      // Incrementar e formatar com zeros à esquerda
      let proximoNumero = (maiorNumero + 1).toString().padStart(4, "0")
      
      // Verificar se o número já existe (segurança adicional)
      const numeroExiste = todosOrcamentos.some(orc => 
        orc.numero && orc.numero.startsWith(proximoNumero)
      )
      
      // Se o número já existir, incrementar até encontrar um livre
      while (numeroExiste) {
        maiorNumero++
        proximoNumero = maiorNumero.toString().padStart(4, "0")
        const novoNumeroExiste = todosOrcamentos.some(orc => 
          orc.numero && orc.numero.startsWith(proximoNumero)
        )
        if (!novoNumeroExiste) break
      }
      
      return proximoNumero
    } catch (error) {
      console.error("Erro ao obter próximo número de orçamento:", error)
      return "0140"
    }
  }

  // Função para exportar PDF usando html2canvas (mais fiel à visualização)
  const exportarPDFCanvas = async () => {
    if (!documentoRef.current || !orcamento.numero) {
      console.error('Referência do documento não encontrada ou orçamento sem número')
      return
    }

    try {
      setGerandoPDFProfissional(true)

      // Importar as bibliotecas dinamicamente
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).jsPDF

      const elemento = documentoRef.current

      // Configurar html2canvas para capturar com largura A4
      const canvas = await html2canvas(elemento, {
        scale: 2, // Alta resolução
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: elemento.scrollWidth,
        height: elemento.scrollHeight,
        logging: false
      })

      // Converter canvas para imagem
      const imgData = canvas.toDataURL('image/png', 1.0)

      // Dimensões A4 em mm: 210 x 297
      // Converter para pontos (1mm = 2.834645669 pt)
      const a4Width = 210 * 2.834645669  // 595.28 pt
      const a4Height = 297 * 2.834645669 // 841.89 pt
      
      // Margens em pontos (10mm = 28.35pt de cada lado)
      const margin = 28.35
      const usableWidth = a4Width - (margin * 2)
      const usableHeight = a4Height - (margin * 2)

      // Calcular dimensões da imagem mantendo proporção
      const imgWidthPx = canvas.width
      const imgHeightPx = canvas.height
      
      // Calcular escala para ajustar à largura utilizável
      const scaleToFit = usableWidth / imgWidthPx
      const finalWidth = imgWidthPx * scaleToFit
      const finalHeight = imgHeightPx * scaleToFit

      // Criar PDF
      const pdf = new jsPDF('portrait', 'pt', 'a4')
      
      // Se a altura da imagem for maior que uma página
      if (finalHeight > usableHeight) {
        let yPosition = 0
        let pageNumber = 1
        
        while (yPosition < finalHeight) {
          if (pageNumber > 1) {
            pdf.addPage()
          }
          
          // Calcular quanto da imagem cabe nesta página
          const remainingHeight = finalHeight - yPosition
          const heightForThisPage = Math.min(usableHeight, remainingHeight)
          
          // Criar um canvas temporário para esta seção
          const pageCanvas = document.createElement('canvas')
          const pageCtx = pageCanvas.getContext('2d')
          
          // Configurar dimensões do canvas da página
          const scaleFactor = 2 // Mesma escala do html2canvas
          pageCanvas.width = finalWidth * scaleFactor
          pageCanvas.height = heightForThisPage * scaleFactor
          
          // Desenhar a seção correspondente da imagem original
          pageCtx.drawImage(
            canvas,
            0, 
            (yPosition / scaleToFit) * scaleFactor, // posição Y na imagem original
            imgWidthPx * scaleFactor, 
            (heightForThisPage / scaleToFit) * scaleFactor, // altura na imagem original
            0, 
            0, 
            pageCanvas.width, 
            pageCanvas.height
          )
          
          // Converter para imagem e adicionar ao PDF
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0)
          pdf.addImage(
            pageImgData,
            'PNG',
            margin,
            margin,
            finalWidth,
            heightForThisPage
          )
          
          yPosition += usableHeight
          pageNumber++
        }
      } else {
        // Imagem cabe em uma página - centralizar verticalmente
        const yOffset = margin + (usableHeight - finalHeight) / 2
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yOffset,
          finalWidth,
          finalHeight
        )
      }

      // Baixar o PDF
      pdf.save(`orcamento-${orcamento.numero}.pdf`)

      // Mostrar feedback de sucesso
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: `PDF A4 gerado com sucesso! Arquivo: orcamento-${orcamento.numero}.pdf`,
      })

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Tente novamente'}`,
      })
    } finally {
      setGerandoPDFProfissional(false)
    }
  }

  // Função para exportar PDF profissional usando Puppeteer
  const exportarPDFProfissional = async () => {
    if (!documentoRef.current || !orcamento.numero) {
      console.error('Referência do documento não encontrada ou orçamento sem número')
      return
    }

    try {
      setGerandoPDFProfissional(true)

      // Capturar o HTML do documento atual
      const elemento = documentoRef.current
      const htmlContent = elemento.innerHTML

      // Fazer a requisição para a API
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          orcamentoNumero: orcamento.numero
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF')
      }

      // Converter response para blob e fazer download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orcamento-${orcamento.numero}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Mostrar feedback de sucesso
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: `PDF profissional gerado com sucesso! Arquivo: orcamento-${orcamento.numero}.pdf`,
      })

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao gerar PDF profissional: ${error instanceof Error ? error.message : 'Tente novamente'}`,
      })
    } finally {
      setGerandoPDFProfissional(false)
    }
  }

  // Atualizar o status padrão para "5" (Proposta) ao criar um novo orçamento
  const criarNovoOrcamento = async () => {
    try {
      setIsLoading(true)

      // Obter o próximo número de orçamento
      const proximoNumero = await obterProximoNumeroOrcamento()

      // Criar um novo orçamento em branco com o próximo número
      // Obter a data atual no fuso horário local
      const hoje = new Date()
      const dataLocal =
        hoje.getFullYear() +
        "-" +
        String(hoje.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(hoje.getDate()).padStart(2, "0")

      const novoOrcamento = {
        numero: proximoNumero, // Usar apenas o número base (ex: "0154")
        data: dataLocal,
        cliente: null,
        itens: [],
        observacoes: "",
        condicoesPagamento: "45 DIAS",
        prazoEntrega: "45 DIAS",
        validadeOrcamento: "15 DIAS",
        status: "5", // Status padrão: Proposta
        valorFrete: 0,
        nomeContato: "",
        telefoneContato: "",
      }

      setOrcamento(novoOrcamento)
      setOrcamentoOriginal(null) // Iniciar sem referência para novo orçamento
      setInicializacaoCompleta(false) // Reset durante criação

      // Limpar o ID do orçamento salvo para indicar que é um novo
      setOrcamentoSalvo(null)
      setCriandoNovoOrcamento(true)
      setOrcamentoJaCarregado(false) // Resetar flag de orçamento carregado

      // Mudar para a aba de orçamento
      setAbaAtiva("orcamento")

      // Marcar inicialização como completa após criar
      setTimeout(() => {
        setInicializacaoCompleta(true)
      }, 100)

      // Mostrar feedback
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Novo orçamento criado! Preencha os dados e salve quando terminar.",
      })
    } catch (error) {
      console.error("Erro ao criar novo orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao criar novo orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Adicionar esta função após a função criarNovoOrcamento:
  const copiarOrcamento = async () => {
    try {
      setIsLoading(true)

      // Obter o próximo número de orçamento
      const proximoNumero = await obterProximoNumeroOrcamento()

      // Usar apenas o número base na cópia - a formatação completa será feita quando adicionar cliente/itens
      const novoNumero = proximoNumero

      // Criar uma cópia do orçamento atual com um novo número e sem ID
      // Obter a data atual no fuso horário local
      const hoje = new Date()
      const dataLocal =
        hoje.getFullYear() +
        "-" +
        String(hoje.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(hoje.getDate()).padStart(2, "0")

      const orcamentoCopia = {
        ...orcamento,
        id: undefined, // Remover o ID para que seja considerado um novo orçamento
        numero: novoNumero,
        data: dataLocal, // Atualizar a data para hoje no formato local
      }

      // Atualizar o estado com a cópia do orçamento
      setOrcamento(orcamentoCopia)
      setOrcamentoSalvo(null) // Definir como null para indicar que é um novo orçamento não salvo
      setCriandoNovoOrcamento(true)
      setOrcamentoJaCarregado(false) // Resetar flag para permitir nova numeração

      // Mostrar feedback de sucesso
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento copiado com sucesso! Clique em 'Salvar' para salvar as alterações.",
      })
    } catch (error) {
      console.error("Erro ao copiar orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao copiar o orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para salvar novo orçamento
  const salvarNovoOrcamento = async () => {
    try {
      setIsLoading(true)
      
      if (!orcamento.cliente) {
        setFeedbackSalvamento({
          visivel: true,
          sucesso: false,
          mensagem: "Selecione um cliente antes de salvar",
        })
        return
      }

      // Preparar dados para salvar
      const dadosOrcamento = {
        numero: orcamento.numero,
        data: orcamento.data,
        cliente_id: orcamento.cliente.id,
        observacoes: orcamento.observacoes,
        condicoes_pagamento: orcamento.condicoesPagamento,
        prazo_entrega: orcamento.prazoEntrega,
        validade_orcamento: orcamento.validadeOrcamento,
        status: orcamento.status,
        itens: {
          metadados: {
            valorFrete: orcamento.valorFrete,
            nomeContato: orcamento.nomeContato,
            telefoneContato: orcamento.telefoneContato,
          },
          items: orcamento.itens.map(item => ({
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
          }))
        }
      }

      // Inserir orçamento
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from("orcamentos")
        .insert(dadosOrcamento)
        .select()
        .single()

      if (orcamentoError) throw orcamentoError

      // Salvar itens individuais com posição
      for (let index = 0; index < orcamento.itens.length; index++) {
        const item = orcamento.itens[index]
        const { data: itemData, error: itemError } = await supabase
          .from("itens_orcamento")
          .insert({
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
            posicao: index + 1, // Adicionar posição baseada no índice do array
          })
          .select()
          .single()

        if (itemError) throw itemError

        // Salvar estampas do item (comentado temporariamente devido a erro 400)
        // if (item.estampas && item.estampas.length > 0) {
        //   for (const estampa of item.estampas) {
        //     const { error: estampaError } = await supabase
        //       .from("estampas")
        //       .insert({
        //         item_orcamento_id: itemData.id,
        //         posicao: estampa.posicao,
        //         tipo: estampa.tipo,
        //         largura: estampa.largura,
        //       })

        //     if (estampaError) throw estampaError
        //   }
        // }
      }

      setOrcamentoSalvo(orcamentoData.id)
      setOrcamentoOriginal({ ...orcamento }) // Atualizar orçamento original
      
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento salvo com sucesso!",
      })

      // Recarregar lista de orçamentos se disponível
      if (recarregarOrcamentosRef.current) {
        await recarregarOrcamentosRef.current()
      }

    } catch (error) {
      console.error("Erro ao salvar orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao salvar orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para atualizar orçamento existente
  const atualizarOrcamentoExistente = async () => {
    try {
      setIsLoading(true)
      
      if (!orcamentoSalvo) {
        await salvarNovoOrcamento()
        return
      }

      if (!orcamento.cliente) {
        setFeedbackSalvamento({
          visivel: true,
          sucesso: false,
          mensagem: "Selecione um cliente antes de salvar",
        })
        return
      }

      // Atualizar dados do orçamento
      const { error: orcamentoError } = await supabase
        .from("orcamentos")
        .update({
          numero: orcamento.numero,
          data: orcamento.data,
          cliente_id: orcamento.cliente.id,
          observacoes: orcamento.observacoes,
          condicoes_pagamento: orcamento.condicoesPagamento,
          prazo_entrega: orcamento.prazoEntrega,
          validade_orcamento: orcamento.validadeOrcamento,
          status: orcamento.status,
          itens: {
            metadados: {
              valorFrete: orcamento.valorFrete,
              nomeContato: orcamento.nomeContato,
              telefoneContato: orcamento.telefoneContato,
            },
            items: orcamento.itens.map(item => ({
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
            }))
          }
        })
        .eq("id", orcamentoSalvo)

      if (orcamentoError) throw orcamentoError

      // Remover itens existentes
      await supabase
        .from("itens_orcamento")
        .delete()
        .eq("orcamento_id", orcamentoSalvo)

      // Inserir itens atualizados com posição
      for (let index = 0; index < orcamento.itens.length; index++) {
        const item = orcamento.itens[index]
        const { data: itemData, error: itemError } = await supabase
          .from("itens_orcamento")
          .insert({
            orcamento_id: orcamentoSalvo,
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
            posicao: index + 1, // Adicionar posição baseada no índice do array
          })
          .select()
          .single()

        if (itemError) throw itemError

        // Salvar estampas do item
        if (item.estampas && item.estampas.length > 0) {
          for (const estampa of item.estampas) {
            try {
              const { error: estampaError } = await supabase
                .from("estampas")
                .insert({
                  id: estampa.id || generateUUID(), // Garantir que sempre tenha ID
                  item_orcamento_id: itemData.id,
                  posicao: estampa.posicao || null,
                  tipo: estampa.tipo || null,
                  largura: estampa.largura || null,
                  comprimento: estampa.comprimento || null,
                })

              if (estampaError) {
                console.error("Erro específico da estampa:", estampaError)
                throw estampaError
              }
            } catch (estampaErr) {
              console.error("Erro ao inserir estampa:", estampaErr)
              // Continue com as outras estampas mesmo se uma falhar
            }
          }
        }
      }

      setOrcamentoOriginal({ ...orcamento }) // Atualizar orçamento original
      
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento atualizado com sucesso!",
      })

      // Recarregar lista de orçamentos se disponível
      if (recarregarOrcamentosRef.current) {
        await recarregarOrcamentosRef.current()
      }

    } catch (error) {
      console.error("Erro ao atualizar orçamento:", error)
      
      // Log mais detalhado do erro
      if (error && typeof error === 'object') {
        console.error("Detalhes do erro:", JSON.stringify(error, null, 2))
      }
      
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao atualizar orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Adicionar a função para exportar apenas a ficha técnica
  const exportarFichaTecnica = async () => {
    if (!orcamento) return

    try {
      setExportandoFichaTecnica(true)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Exportando ficha técnica, aguarde...",
      })

      // Importar dinamicamente as funções de PDF
      const { generatePDF, formatPDFFilename } = await import("@/lib/pdf-utils")

      // Encontrar apenas as fichas técnicas
      const fichasTecnicas = document.querySelectorAll(".ficha-tecnica")

      if (fichasTecnicas.length === 0) {
        console.warn("Nenhuma ficha técnica encontrada")
        setFeedbackSalvamento({
          visivel: true,
          sucesso: false,
          mensagem: "Nenhuma ficha técnica encontrada para exportar",
        })
        return
      }

      // Criar um container temporário para as fichas técnicas
      const container = document.createElement("div")
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.width = "210mm" // Largura A4
      container.style.backgroundColor = "#ffffff"
      container.style.padding = "0"
      container.style.margin = "0"
      container.style.boxSizing = "border-box"
      container.className = "fichas-tecnicas-container" // Adicionar uma classe para identificação

      // Adicionar as fichas técnicas ao container
      fichasTecnicas.forEach((ficha, index) => {
        const fichaClone = ficha.cloneNode(true) as HTMLElement
        // Remover a classe page-break-before da primeira ficha para evitar página em branco
        if (index === 0) {
          fichaClone.classList.remove("page-break-before")
        }
        container.appendChild(fichaClone)
      })

      // Adicionar ao DOM temporariamente
      document.body.appendChild(container)

      // Gerar o nome do arquivo
      const nomeCliente = orcamento.cliente?.nome
      const nomeContato = orcamento.nomeContato
      const filename = formatPDFFilename(orcamento.numero, nomeCliente, nomeContato).replace(
        "ORCAMENTO",
        "FICHA_TECNICA",
      )

      // Gerar o PDF
      await generatePDF(container, filename)

      // Remover o container temporário
      document.body.removeChild(container)

      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: `Ficha técnica "${filename}" exportada com sucesso!`,
      })
    } catch (error) {
      console.error("Erro ao exportar ficha técnica:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao exportar ficha técnica: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setExportandoFichaTecnica(false)
    }
  }

  // Adicionar a função exportarOrcamento após a função exportarFichaTecnica

  // Modificar a função exportarOrcamento para suportar os três tipos de exportação
  // Localizar a função exportarOrcamento e substituir por:
  // Função para exportar orçamento (completo, apenas orçamento ou apenas ficha técnica)
  const exportarOrcamento = async (orcamentoId: string, tipoExportacao: "completo" | "ficha" | "orcamento") => {
    try {
      setIsLoading(true)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: `Exportando ${
          tipoExportacao === "completo"
            ? "documento completo"
            : tipoExportacao === "ficha"
              ? "ficha técnica"
              : "orçamento"
        }, aguarde...`,
      })

      // Carregar o orçamento do banco de dados
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*, cliente:cliente_id(*)")
        .eq("id", orcamentoId)
        .single()

      if (error) throw error

      // Carregar itens do orçamento ordenados por posição
      const { data: itensData, error: itensError } = await supabase
        .from("itens_orcamento")
        .select("*, produto:produto_id(*)")
        .eq("orcamento_id", orcamentoId)
        .order("posicao", { ascending: true })

      if (itensError) throw itensError

      // Extrair metadados e ordem dos itens do JSON
      let _valorFrete = 0
      let _nomeContato = ""
      let _telefoneContato = ""
      let ordemItens: string[] = [] // Array para armazenar a ordem dos IDs dos itens

      try {
        if (data.itens && typeof data.itens === "object") {
          // Se itens já é um objeto (parseado automaticamente)
          if (data.itens.metadados) {
            if (data.itens.metadados.valorFrete !== undefined) {
              _valorFrete = Number(data.itens.metadados.valorFrete)
            }
            if (data.itens.metadados.nomeContato !== undefined) {
              _nomeContato = data.itens.metadados.nomeContato
            }
            if (data.itens.metadados.telefoneContato !== undefined) {
              _telefoneContato = data.itens.metadados.telefoneContato
            }
          }
          // Extrair a ordem dos itens, se existir
          if (data.itens.items && Array.isArray(data.itens.items)) {
            ordemItens = data.itens.items.map((item) => item.id)
          }
        } else if (data.itens && typeof data.itens === "string") {
          // Se itens é uma string JSON
          const itensObj = JSON.parse(data.itens)
          if (itensObj.metadados) {
            if (itensObj.metadados.valorFrete !== undefined) {
              _valorFrete = Number(itensObj.metadados.valorFrete)
            }
            if (itensObj.metadados.nomeContato !== undefined) {
              _nomeContato = itensObj.metadados.nomeContato
            }
            if (itensObj.metadados.telefoneContato !== undefined) {
              _telefoneContato = itensObj.metadados.telefoneContato
            }
          }
          // Extrair a ordem dos itens, se existir
          if (itensObj.items && Array.isArray(itensObj.items)) {
            ordemItens = itensObj.items.map((item) => item.id)
          }
        }
      } catch (e) {
        console.error("Erro ao extrair metadados do JSON:", e)
      }

      // Converter para o formato da aplicação
      let itensFormatados: ItemOrcamento[] = await Promise.all(
        itensData
          ? itensData.map(async (item) => {
              // Buscar o produto completo com tecidos
              let produto: Produto | undefined = undefined
              if (item.produto) {
                const { data: tecidosData, error: tecidosError } = await supabase
                  .from("tecidos")
                  .select("*")
                  .eq("produto_id", item.produto.id)

                if (tecidosError) throw tecidosError

                produto = {
                  id: item.produto.id,
                  nome: item.produto.nome,
                  valorBase: Number(item.produto.valor_base),
                  tecidos: tecidosData
                    ? tecidosData.map((t) => ({
                        nome: t.nome,
                        composicao: t.composicao || "",
                      }))
                    : [],
                  cores: item.produto.cores || [],
                  tamanhosDisponiveis: item.produto.tamanhos_disponiveis || [],
                }
              }

              // Carregar estampas do item
              const { data: estampasData, error: estampasError } = await supabase
                .from("estampas")
                .select("*")
                .eq("item_orcamento_id", item.id)

              if (estampasError) throw estampasError

              // Converter estampas para o formato da aplicação
              const estampas: Estampa[] = estampasData
                ? estampasData.map((estampa) => ({
                    id: estampa.id,
                    posicao: estampa.posicao || undefined,
                    tipo: estampa.tipo || undefined,
                    largura: estampa.largura || undefined,
                    comprimento: estampa.comprimento || undefined,
                  }))
                : []

              return {
                id: item.id,
                produtoId: item.produto_id || "",
                produto,
                quantidade: item.quantidade,
                valorUnitario: Number(item.valor_unitario),
                tecidoSelecionado: item.tecido_nome
                  ? {
                      nome: item.tecido_nome,
                      composicao: item.tecido_composicao || "",
                    }
                  : undefined,
                corSelecionada: item.cor_selecionada || undefined,
                estampas: estampas,
                tamanhos: (item.tamanhos as ItemOrcamento["tamanhos"]) || {},
                imagem: item.imagem || undefined,
                observacaoComercial: item.observacao_comercial || undefined,
                observacaoTecnica: item.observacao_tecnica || undefined,
              }
            })
          : [],
      )

      // Ordenar os itens conforme a ordem salva no JSON
      if (ordemItens.length > 0) {
        // Criar um mapa para facilitar a busca por ID
        const itensMap = new Map(itensFormatados.map((item) => [item.id, item]))

        // Criar um novo array ordenado
        const itensOrdenados: ItemOrcamento[] = []

        // Adicionar os itens na ordem salva
        ordemItens.forEach((id) => {
          const item = itensMap.get(id)
          if (item) {
            itensOrdenados.push(item)
            itensMap.delete(id) // Remover do mapa para não duplicar
          }
        })

        // Adicionar quaisquer itens restantes que não estavam na ordem salva
        itensMap.forEach((item) => {
          itensOrdenados.push(item)
        })

        // Substituir o array original pelo ordenado
        itensFormatados = itensOrdenados
      }

      // Extrair metadados do JSON de itens, se existirem
      let valorFrete = 0
      let nomeContato = ""
      let telefoneContato = ""

      try {
        if (data.itens && typeof data.itens === "object") {
          // Se itens já é um objeto (parseado automaticamente)
          if (data.itens.metadados) {
            if (data.itens.metadados.valorFrete !== undefined) {
              valorFrete = Number(data.itens.metadados.valorFrete)
            }
            if (data.itens.metadados.nomeContato !== undefined) {
              nomeContato = data.itens.metadados.nomeContato
            }
            if (data.itens.metadados.telefoneContato !== undefined) {
              telefoneContato = data.itens.metadados.telefoneContato
            }
          }
        } else if (data.itens && typeof data.itens === "string") {
          // Se itens é uma string JSON
          const itensObj = JSON.parse(data.itens)
          if (itensObj.metadados) {
            if (itensObj.metadados.valorFrete !== undefined) {
              valorFrete = Number(itensObj.metadados.valorFrete)
            }
            if (itensObj.metadados.nomeContato !== undefined) {
              nomeContato = itensObj.metadados.nomeContato
            }
            if (itensObj.metadados.telefoneContato !== undefined) {
              telefoneContato = itensObj.metadados.telefoneContato
            }
          }
        }
      } catch (e) {
        console.error("Erro ao extrair metadados do JSON:", e)
      }

      // Converter cliente
      const clienteFormatado = {
        id: data.cliente.id,
        nome: data.cliente.nome,
        cnpj: data.cliente.cnpj || "",
        endereco: data.cliente.endereco || "",
        telefone: data.cliente.telefone || "",
        email: data.cliente.email || "",
        contato: data.cliente.contato || "",
      }

      // Criar o orçamento temporário para exportação
      const orcamentoExportacao: Orcamento = {
        id: data.id,
        numero: data.numero,
        data: data.data,
        cliente: clienteFormatado,
        itens: itensFormatados,
        observacoes: data.observacoes || "",
        condicoesPagamento: data.condicoes_pagamento || "À vista",
        prazoEntrega: data.prazo_entrega || "15 dias",
        validadeOrcamento: data.validade_orcamento || "15 dias",
        status: data.status || "proposta",
        valorFrete: valorFrete,
        nomeContato: nomeContato,
        telefoneContato: telefoneContato,
      }

      // Importar as funções de PDF
      const { generatePDF, formatPDFFilename } = await import("@/lib/pdf-utils")

      // Criar um container temporário
      const container = document.createElement("div")
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.width = "210mm"
      container.style.backgroundColor = "#ffffff"
      document.body.appendChild(container)

      // Renderizar o documento
      const root = ReactDOM.createRoot(container)

      // Renderizar o conteúdo apropriado com base no tipo de exportação
      if (tipoExportacao === "orcamento") {
        // Renderizar apenas o orçamento
        root.render(
          <div className="orcamento-container">
            <VisualizacaoDocumento
              orcamento={{
                ...orcamentoExportacao,
                itens: orcamentoExportacao.itens, // Manter todos os itens para o cabeçalho
              }}
              calcularTotal={() =>
                orcamentoExportacao.itens.reduce((total, item) => total + item.quantidade * item.valorUnitario, 0)
              }
              dadosEmpresa={dadosEmpresa || undefined}
              modoExportacao="orcamento" // Adicionar prop para indicar que é apenas o orçamento
            />
          </div>,
        )
      } else if (tipoExportacao === "ficha") {
        // Renderizar apenas as fichas técnicas
        root.render(
          <div className="fichas-tecnicas-container">
            <VisualizacaoDocumento
              orcamento={orcamentoExportacao}
              calcularTotal={() =>
                orcamentoExportacao.itens.reduce((total, item) => total + item.quantidade * item.valorUnitario, 0)
              }
              dadosEmpresa={dadosEmpresa || undefined}
              modoExportacao="ficha" // Adicionar prop para indicar que são apenas as fichas
            />
          </div>,
        )
      } else {
        // Renderizar o documento completo
        root.render(
          <VisualizacaoDocumento
            orcamento={orcamentoExportacao}
            calcularTotal={() =>
              orcamentoExportacao.itens.reduce((total, item) => total + item.quantidade * item.valorUnitario, 0)
            }
            dadosEmpresa={dadosEmpresa || undefined}
            modoExportacao="completo" // Adicionar prop para indicar que é o documento completo
          />,
        )
      }

      // Aguardar renderização
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Gerar o nome do arquivo
      const filename = formatPDFFilename(
        orcamentoExportacao.numero,
        tipoExportacao === "ficha" ? "ficha-tecnica" : "orcamento",
        orcamentoExportacao.cliente?.nome,
        orcamentoExportacao.nomeContato,
      )

      // Gerar o PDF
      await generatePDF(container, filename, tipoExportacao)

      // Remover o container
      document.body.removeChild(container)

      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: `Documento exportado com sucesso!`,
      })
    } catch (error) {
      console.error("Erro ao exportar:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao exportar: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // REMOVER ESTE useEffect que estava criando um novo orçamento automaticamente
  // useEffect(() => {
  //   criarNovoOrcamento()
  //
  //   // Get hash from URL if available
  //   if (typeof window !== "undefined") {
  //     const hash = window.location.hash ? window.location.hash.substring(1) : "orcamento"
  //     setAbaAtiva(hash)
  //   }
  // }, [])

  // Inicializar o aplicativo - VERSÃO CORRIGIDA
  useEffect(() => {
    // Carregar dados iniciais
    const carregarDadosIniciais = async () => {
      try {
        await carregarDadosEmpresa()
        await carregarClientes()
        await carregarProdutos()
        
        // SOMENTE inicializar com o próximo número se estiver criando um orçamento NOVO
        // Não sobrescrever o número de orçamentos já carregados
        if (!orcamentoSalvo && !orcamentoJaCarregado && orcamento.numero === "Carregando...") {
          const proximoNumero = await obterProximoNumeroOrcamento()
          const novoOrcamento = {
            ...orcamento,
            numero: proximoNumero // Usar apenas o número base
          }
          setOrcamento(novoOrcamento)
          setOrcamentoOriginal(novoOrcamento) // Definir como original para evitar detecção de alterações
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error)
        // Em caso de erro, usar um número padrão APENAS se for novo orçamento
        if (!orcamentoSalvo && !orcamentoJaCarregado && orcamento.numero === "Carregando...") {
          const orcamentoComNumero = {
            ...orcamento,
            numero: "0140"
          }
          setOrcamento(orcamentoComNumero)
          setOrcamentoOriginal(orcamentoComNumero) // Definir como original para evitar detecção de alterações
        }
      }
    }

    carregarDadosIniciais()

    // Verificar hash na URL
    if (typeof window !== "undefined") {
      const hash = window.location.hash ? window.location.hash.substring(1) : ""
      if (hash) {
        setAbaAtiva(hash)
      } else {
        // Se não houver hash, usar o valor inicial
        if (abaAtivaInicial && abaAtivaInicial !== "orcamento") {
          window.location.hash = abaAtivaInicial
        }
      }
    }

    // Marcar inicialização como completa após um pequeno delay
    const timer = setTimeout(() => {
      setInicializacaoCompleta(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [abaAtivaInicial, orcamentoJaCarregado])

  // Adicionar a função para carregar os dados da empresa
  const carregarDadosEmpresa = async () => {
    try {
      const { data, error } = await supabase.from("empresa").select("*").single()

      if (error) {
        if (error.code === "PGRST116") {
          // Não encontrou registros
          console.log("Nenhum dado de empresa encontrado.")
          return
        }
        throw error
      }

      if (data) {
        setDadosEmpresa(data)
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error)
    }
  }

  // Função para carregar clientes
  const carregarClientes = async () => {
    try {
      const { data: clientesData, error: clientesError } = await supabase.from("clientes").select("*").order("nome")

      if (clientesError) {
        console.warn("Erro ao carregar clientes do Supabase, usando dados mock:", clientesError)
        if (clientes.length === 0) {
          setClientes(mockClientes)
        }
      } else if (clientesData && clientesData.length > 0) {
        // Converter para o formato da aplicação
        const clientesFormatados: Cliente[] = clientesData.map((cliente) => ({
          id: cliente.id,
          codigo: cliente.codigo || "",
          nome: cliente.nome,
          cnpj: cliente.cnpj || "",
          endereco: cliente.endereco || "",
          telefone: cliente.telefone || "",
          email: cliente.email || "",
          contato: cliente.contato || "",
        }))

        setClientes(clientesFormatados)
      } else if (clientes.length === 0) {
        setClientes(mockClientes)
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      if (clientes.length === 0) {
        setClientes(mockClientes)
      }
    }
  }

  // Função para carregar produtos
  const carregarProdutos = async () => {
    try {
      const { data: produtosData, error: produtosError } = await supabase.from("produtos").select("*").order("nome")

      if (produtosError) {
        console.warn("Erro ao carregar produtos do Supabase, usando dados mock:", produtosError)
        if (produtos.length === 0) {
          setProdutos(mockProdutos)
        }
      } else if (produtosData && produtosData.length > 0) {
        // Verificar se há produtos sem código e atualizar se necessário
        const produtosSemCodigo = produtosData.filter((p) => !p.codigo)
        if (produtosSemCodigo.length > 0) {
          console.log(`Encontrados ${produtosSemCodigo.length} produtos sem código. Atualizando...`)

          // Atualizar códigos sequencialmente
          let contador = 1
          const ultimoProdutoComCodigo = produtosData
            .filter((p) => p.codigo)
            .sort((a, b) => {
              const numA = a.codigo ? Number.parseInt(a.codigo.replace(/\D/g, "")) : 0
              const numB = b.codigo ? Number.parseInt(b.codigo.replace(/\D/g, "")) : 0
              return numB - numA
            })[0]

          if (ultimoProdutoComCodigo && ultimoProdutoComCodigo.codigo) {
            const match = ultimoProdutoComCodigo.codigo.match(/^P(\d+)$/)
            if (match && match[1]) {
              contador = Number.parseInt(match[1], 10) + 1
            }
          }

          // Atualizar cada produto sem código
          for (const produto of produtosSemCodigo) {
            const novoCodigo = "P" + String(contador).padStart(4, "0")
            contador++

            await supabase.from("produtos").update({ codigo: novoCodigo }).eq("id", produto.id)

            // Atualizar o código no objeto local
            produto.codigo = novoCodigo
          }
        }

        // Para cada produto, buscar seus tecidos
        const produtosCompletos = await Promise.all(
          produtosData.map(async (produto) => {
            // Buscar tecidos do produto
            const { data: tecidosData, error: tecidosError } = await supabase
              .from("tecidos")
              .select("*")
              .eq("produto_id", produto.id)

            if (tecidosError) {
              console.error("Erro ao listar tecidos do produto:", tecidosError)
              return {
                id: produto.id,
                codigo: produto.codigo || `P${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`, // Código aleatório se não existir
                nome: produto.nome,
                valorBase: Number(produto.valor_base),
                tecidos: [],
                cores: produto.cores || [],
                tamanhosDisponiveis: produto.tamanhos_disponiveis || [],
                categoria: produto.categoria || "Outros",
              }
            }

            // Converter para o formato da aplicação
            return {
              id: produto.id,
              codigo: produto.codigo || `P${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`, // Código aleatório se não existir
              nome: produto.nome,
              valorBase: Number(produto.valor_base),
              tecidos: tecidosData
                ? tecidosData.map((t) => ({
                    nome: t.nome,
                    composicao: t.composicao || "",
                  }))
                : [],
              cores: produto.cores || [],
              tamanhosDisponiveis: produto.tamanhos_disponiveis || [],
              categoria: produto.categoria || "Outros",
            } as Produto
          }),
        )

        setProdutos(produtosCompletos)
      } else if (produtos.length === 0) {
        // Adicionar códigos aos produtos mock
        const produtosComCodigo = mockProdutos.map((p, index) => ({
          ...p,
          codigo: `P${String(index + 1).padStart(4, "0")}`,
        }))
        setProdutos(produtosComCodigo)
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      if (produtos.length === 0) {
        // Adicionar códigos aos produtos mock
        const produtosComCodigo = mockProdutos.map((p, index) => ({
          ...p,
          codigo: `P${String(index + 1).padStart(4, "0")}`,
        }))
        setProdutos(produtosComCodigo)
      }
    }
  }

  // Esconder feedback após 3 segundos
  useEffect(() => {
    if (feedbackSalvamento.visivel) {
      const timer = setTimeout(() => {
        setFeedbackSalvamento((prev) => ({ ...prev, visivel: false }))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [feedbackSalvamento.visivel])

  // Vamos também melhorar a função handlePrint para garantir consistência

  // Substitua a função handlePrint por esta versão atualizada:
  const handlePrint = () => {
    setIsPrinting(true)

    // Adicionar estilos de impressão dinamicamente
    const style = document.createElement("style")
    style.id = "print-styles"
    style.innerHTML = `
  @media print {
    @page {
      size: A4;
      margin: 10mm; /* Adicionar margem de 10mm em todos os lados */
    }
    
    body * {
      visibility: hidden;
    }
    
    #print-container, #print-container * {
      visibility: visible;
    }
    
    #print-container {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 10mm; /* Adicionar padding interno */
    }
    
    /* Preservar cores e fundos na impressão */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* Garantir que os gradientes e cores de fundo sejam impressos */
    .bg-gradient-to-r, .bg-primary, .bg-accent, .bg-white, .bg-white\\/10 {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    /* Garantir que o texto branco permaneça branco */
    .text-white {
      color: white !important;
    }
    
    /* Garantir que as bordas sejam impressas */
    .border, .border-t, .border-b, .border-l, .border-r {
      border-color: inherit !important;
    }
    
    /* Remover bordas arredondadas na impressão */
    .rounded-md, .rounded-lg, .rounded-tl-md, .rounded-tr-md {
      border-radius: 0 !important;
    }
    
    /* Ajustar espaçamentos para impressão */
    .p-6 {
      padding: 1rem !important;
    }
    
    .space-y-6 > * + * {
      margin-top: 1rem !important;
    }
    
    .page-break-inside-avoid {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    .page-break-before {
      page-break-before: always !important;
      break-before: always !important;
    }
    
    table {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    h3, h4 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    img {
      max-height: 350px;
      max-width: 100%;
      object-fit: contain;
    }
    
    .ficha-tecnica {
      page-break-before: always !important;
      break-before: always !important;
    }
    
    /* Garantir que cada ficha técnica comece em uma nova página */
    .ficha-tecnica:not(:first-child) {
      margin-top: 20px;
    }
    
    /* Ajustar layout da tabela de tamanhos */
    .tamanhos-container {
      max-height: none !important;
      overflow: visible !important;
      display: flex;
      flex-wrap: wrap;
    }
    
    .tamanho-texto {
      margin-right: 8px !important;
      white-space: nowrap !important;
      font-size: 0.8rem !important;
      padding: 1px 0 !important;
    }
  }
  `
    document.head.appendChild(style)

    // Criar um container temporário para impressão
    const printContainer = document.createElement("div")
    printContainer.id = "print-container"

    if (documentoRef.current) {
      // Clonar o conteúdo do documento
      const clonedContent = documentoRef.current.cloneNode(true)

      // Ajustar estilos do clone para impressão
      const elementosArredondados = (clonedContent as HTMLElement).querySelectorAll(
        ".rounded-md, .rounded-lg, .rounded-tl-md, .rounded-tr-md",
      )
      elementosArredondados.forEach((el) => {
        ;(el as HTMLElement).style.borderRadius = "0"
      })

      const elementosComPadding = (clonedContent as HTMLElement).querySelectorAll(".p-6")
      elementosComPadding.forEach((el) => {
        ;(el as HTMLElement).style.padding = "1rem"
      })

      printContainer.appendChild(clonedContent)
      document.body.appendChild(printContainer)

      // Imprimir
      setTimeout(() => {
        window.print()

        // Limpar após a impressão
        document.body.removeChild(printContainer)
        document.head.removeChild(style)
        setIsPrinting(false)
      }, 500)
    } else {
      setIsPrinting(false)
    }
  }

  // Nova implementação da função handleGeneratePDF que realmente gera e faz download do PDF
  const handleGeneratePDF = async () => {
    try {
      setIsLoading(true)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Gerando PDF, aguarde...",
      })

      if (!documentoRef.current) {
        throw new Error("Elemento do documento não encontrado")
      }

      // Nome do arquivo baseado no número do orçamento e cliente
      const numeroOrcamento = orcamento.numero.split(" - ")[0]
      const nomeCliente = orcamento.cliente
        ? orcamento.cliente.nome.replace(/\s+/g, "_").substring(0, 20)
        : "sem_cliente"
      const nomeContato = orcamento.nomeContato
        ? orcamento.nomeContato.replace(/\s+/g, "_").substring(0, 20)
        : "sem_contato"
      const nomeArquivo = `01 - ORCAMENTO_${numeroOrcamento}_${nomeCliente.toUpperCase()}_${nomeContato.toUpperCase()}.pdf`

      // Importar a função generatePDF dinamicamente
      const { generatePDF } = await import("@/lib/pdf-utils")

      // Gerar o PDF usando a função atualizada
      await generatePDF(documentoRef.current, nomeArquivo)

      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: `PDF "${nomeArquivo}" gerado e baixado com sucesso!`,
      })
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao gerar PDF: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const adicionarCliente = (cliente: Cliente) => {
    setClientes([...clientes, cliente])
  }

  const adicionarProduto = (produto: Produto) => {
    setProdutos([...produtos, produto])
  }

  // Função para salvar orçamento (função original - vou remover e usar a nova)
  const salvarOrcamentoOriginal = async () => {
    if (!orcamento.cliente) {
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: "Selecione um cliente antes de salvar o orçamento",
      })
      return
    }

    try {
      setIsLoading(true)

      // Verificar se o cliente existe no banco de dados
      const { data: clienteExiste, error: clienteError } = await supabase
        .from("clientes")
        .select("id")
        .eq("id", orcamento.cliente.id)
        .single()

      if (clienteError || !clienteExiste) {
        // Se o cliente não existir no banco de dados, tente criá-lo
        const { data: novoCliente, error: novoClienteError } = await supabase
          .from("clientes")
          .insert({
            id: orcamento.cliente.id,
            nome: orcamento.cliente.nome,
            cnpj: orcamento.cliente.cnpj || null,
            endereco: orcamento.cliente.endereco || null,
            telefone: orcamento.cliente.telefone || null,
            email: orcamento.cliente.email || null,
            contato: orcamento.cliente.contato || null,
          })
          .select()

        if (novoClienteError) {
          throw new Error(`Cliente não encontrado no banco de dados: ${novoClienteError.message}`)
        }
      }

      // Formatar o número do orçamento com os dados do cliente e do primeiro item
      const numeroBase = orcamento.numero.split(" - ")[0] // Usar o número já carregado
      const itemDescricao = orcamento.itens.length > 0 ? orcamento.itens[0].produto?.nome || "Item" : "Item"
      const novoNumero = `${numeroBase} - ${itemDescricao} ${orcamento.cliente.nome} ${orcamento.cliente.contato}`

      // Criar um objeto com metadados adicionais para incluir no JSON
      const metadados = {
        valorFrete: orcamento.valorFrete || 0,
        nomeContato: orcamento.nomeContato || "",
        telefoneContato: orcamento.telefoneContato || "",
      }

      const { data, error } = await supabase
        .from("orcamentos")
        .insert({
          numero: novoNumero,
          data: orcamento.data,
          cliente_id: orcamento.cliente.id,
          observacoes: orcamento.observacoes,
          condicoes_pagamento: orcamento.condicoesPagamento,
          prazo_entrega: orcamento.prazoEntrega,
          validade_orcamento: orcamento.validadeOrcamento,
          status: orcamento.status || "proposta", // Adicionar status
          // Incluir metadados junto com os itens no JSON
          itens: JSON.stringify({
            items: orcamento.itens || [],
            metadados: metadados,
          }),
          // Remove these fields as they don't exist in the database
          // nome_contato: orcamento.nomeContato,
          // telefone_contato: orcamento.telefoneContato,
        })
        .select()

      if (error) throw error

      if (data && data[0]) {
        const novoOrcamentoId = data[0].id

        // Salvar os itens do orçamento com posição
        for (let index = 0; index < orcamento.itens.length; index++) {
          const item = orcamento.itens[index]
          // Verificar se o produto existe no banco de dados
          const { data: produtoExiste, error: produtoError } = await supabase
            .from("produtos")
            .select("id")
            .eq("id", item.produtoId)

          if (produtoError || !produtoExiste || produtoExiste.length === 0) {
            // Se o produto não existir e tivermos os dados completos, tente criá-lo
            if (item.produto) {
              await supabase.from("produtos").insert({
                id: item.produtoId,
                nome: item.produto.nome,
                valor_base: item.produto.valorBase,
                cores: item.produto.cores || [],
                tamanhos_disponiveis: item.produto.tamanhosDisponiveis || [],
              })

              // Inserir tecidos do produto se existirem
              if (item.produto.tecidos && item.produto.tecidos.length > 0) {
                const tecidosParaInserir = item.produto.tecidos.map((tecido) => ({
                  nome: tecido.nome,
                  composicao: tecido.composicao,
                  produto_id: item.produtoId,
                }))

                await supabase.from("tecidos").insert(tecidosParaInserir)
              }
            }
          }

          // Inserir o item com um novo ID e posição
          const novoItemId = generateUUID()
          const { data: itemInserido, error: itemError } = await supabase
            .from("itens_orcamento")
            .insert({
              id: novoItemId,
              orcamento_id: novoOrcamentoId,
              produto_id: item.produtoId,
              quantidade: item.quantidade,
              valor_unitario: item.valorUnitario,
              tecido_nome: item.tecidoSelecionado?.nome,
              tecido_composicao: item.tecidoSelecionado?.composicao,
              cor_selecionada: item.corSelecionada,
              tamanhos: item.tamanhos,
              imagem: item.imagem,
              posicao: index + 1, // Adicionar posição baseada no índice do array
              // Remover o campo observacao que está causando o erro
            })
            .select()

          if (itemError) throw itemError

          // Inserir as estampas do item - CORRIGIDO: Sempre gerar novos IDs para as estampas
          if (item.estampas && item.estampas.length > 0) {
            const estampasParaInserir = item.estampas.map((estampa) => ({
              id: generateUUID(), // Sempre gerar um novo ID para evitar conflitos
              item_orcamento_id: novoItemId,
              posicao: estampa.posicao,
              tipo: estampa.tipo,
              largura: estampa.largura,
              comprimento: estampa.comprimento,
            }))

            const { error: estampasError } = await supabase.from("estampas").insert(estampasParaInserir)

            if (estampasError) throw estampasError
          }
        }

        // Atualizar o estado com o novo orçamento
        setOrcamento({
          ...orcamento,
          id: novoOrcamentoId,
          numero: novoNumero,
        })
        setOrcamentoOriginal({
          ...orcamento,
          id: novoOrcamentoId,
          numero: novoNumero,
        })
        setOrcamentoSalvo(novoOrcamentoId)
        setCriandoNovoOrcamento(false)

        // Mostrar feedback de sucesso
        setFeedbackSalvamento({
          visivel: true,
          sucesso: true,
          mensagem: "Novo orçamento salvo com sucesso!",
        })
      }
    } catch (error) {
      console.error("Erro ao salvar novo orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao salvar o orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para atualizar orçamento existente (função original - vou renomear)
  const atualizarOrcamentoOriginal = async () => {
    if (!orcamento.cliente || !orcamentoSalvo) {
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: "Selecione um cliente antes de atualizar o orçamento",
      })
      return
    }

    try {
      setIsLoading(true)

      // Verificar se o cliente existe no banco de dados
      const { data: clienteExiste, error: clienteError } = await supabase
        .from("clientes")
        .select("id")
        .eq("id", orcamento.cliente.id)
        .single()

      if (clienteError) {
        // Se o cliente não existir no banco de dados, tente criá-lo
        const { data: novoCliente, error: novoClienteError } = await supabase
          .from("clientes")
          .insert({
            id: orcamento.cliente.id,
            nome: orcamento.cliente.nome,
            cnpj: orcamento.cliente.cnpj || null,
            endereco: orcamento.cliente.endereco || null,
            telefone: orcamento.cliente.telefone || null,
            email: orcamento.cliente.email || null,
            contato: orcamento.cliente.contato || null,
          })
          .select()

        if (novoClienteError) {
          throw new Error(`Cliente não encontrado no banco de dados: ${novoClienteError.message}`)
        }
      }

      // Criar um objeto com metadados adicionais para incluir no JSON
      const metadados = {
        valorFrete: orcamento.valorFrete || 0,
        nomeContato: orcamento.nomeContato || "",
        telefoneContato: orcamento.telefoneContato || "",
      }

      const { error } = await supabase
        .from("orcamentos")
        .update({
          numero: orcamento.numero,
          data: orcamento.data,
          cliente_id: orcamento.cliente.id,
          observacoes: orcamento.observacoes,
          condicoes_pagamento: orcamento.condicoesPagamento,
          prazo_entrega: orcamento.prazoEntrega,
          validade_orcamento: orcamento.validadeOrcamento,
          status: orcamento.status || "proposta", // Adicionar status
          // Incluir metadados junto com os itens no JSON
          itens: JSON.stringify({
            items: orcamento.itens || [],
            metadados: metadados,
          }),
          updated_at: new Date().toISOString(),
          // Remove these fields as they don't exist in the database
          // nome_contato: orcamento.nomeContato,
          // telefone_contato: orcamento.telefoneContato,
        })
        .eq("id", orcamentoSalvo)

      if (error) throw error

      // Atualizar o orcamentoOriginal após salvar com sucesso
      setOrcamentoOriginal({ ...orcamento })

      // Mostrar feedback de sucesso
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento atualizado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao atualizar orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao atualizar orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Modificar a função atualizarOrcamento para salvar a ordem dos itens no Supabase

  // Localizar a função atualizarOrcamento e modificar a parte onde os itens são salvos
  // Aproximadamente na linha 1000-1100

  // Substituir o trecho que atualiza o orçamento no Supabase por:

  const atualizarOrcamento = (novoOrcamento: Partial<Orcamento>) => {
    const orcamentoAtualizado = { ...orcamento, ...novoOrcamento }
    setOrcamento(orcamentoAtualizado)
  }

  const adicionarItem = async (item: ItemOrcamento) => {
    const itensAtualizados = [...orcamento.itens, item]

    // Atualizar o número do orçamento com o nome do primeiro item
    let novoNumero = orcamento.numero
    if (itensAtualizados.length === 1 && orcamento.cliente) {
      const numeroBase = orcamento.numero.split(" - ")[0]
      const itemDescricao = item.produto?.nome || "Item"
      novoNumero = `${numeroBase} - ${itemDescricao} ${orcamento.cliente.nome} ${orcamento.cliente.contato || ""}`
    }

    setOrcamento({
      ...orcamento,
      itens: itensAtualizados,
      numero: novoNumero,
    })
  }

  const removerItem = (id: string) => {
    const itensAtualizados = orcamento.itens.filter((item) => item.id !== id)
    setOrcamento({
      ...orcamento,
      itens: itensAtualizados,
    })
  }

  const duplicarItem = async (id: string) => {
    const itemOriginal = orcamento.itens.find((item) => item.id === id)
    if (!itemOriginal) {
      console.error("Item não encontrado para duplicação")
      return
    }

    try {
      // Criar uma cópia do item com novo ID
      const itemDuplicado: ItemOrcamento = {
        ...itemOriginal,
        id: generateUUID(), // Novo ID único
        // Duplicar estampas com novos IDs se existirem
        estampas: itemOriginal.estampas?.map((estampa) => ({
          ...estampa,
          id: generateUUID(), // Novo ID único para cada estampa
        })) || [],
      }

      // Adicionar o item duplicado à lista
      const itensAtualizados = [...orcamento.itens, itemDuplicado]
      setOrcamento({
        ...orcamento,
        itens: itensAtualizados,
      })

      // Salvar no Supabase se houver orçamento salvo
      if (orcamentoSalvo) {
        setIsLoading(true)

        // Inserir o item duplicado no banco de dados
        const { data: itemInserido, error: itemError } = await supabase
          .from("itens_orcamento")
          .insert({
            id: itemDuplicado.id,
            orcamento_id: orcamentoSalvo,
            produto_id: itemDuplicado.produtoId,
            quantidade: itemDuplicado.quantidade,
            valor_unitario: itemDuplicado.valorUnitario,
            tecido_nome: itemDuplicado.tecidoSelecionado?.nome,
            tecido_composicao: itemDuplicado.tecidoSelecionado?.composicao,
            cor_selecionada: itemDuplicado.corSelecionada,
            tamanhos: itemDuplicado.tamanhos,
            imagem: itemDuplicado.imagem,
            observacao_comercial: itemDuplicado.observacaoComercial,
            observacao_tecnica: itemDuplicado.observacaoTecnica,
          })
          .select()

        if (itemError) throw itemError

        // Inserir as estampas duplicadas se existirem
        if (itemDuplicado.estampas && itemDuplicado.estampas.length > 0) {
          try {
            const estampasValidas = itemDuplicado.estampas.filter(estampa => 
              estampa.id && 
              (estampa.posicao || estampa.tipo || estampa.largura)
            )

            if (estampasValidas.length > 0) {
              const estampasParaInserir = estampasValidas.map((estampa) => ({
                id: estampa.id,
                item_orcamento_id: itemDuplicado.id,
                posicao: estampa.posicao || null,
                tipo: estampa.tipo || null,
                largura: estampa.largura ? Number(estampa.largura) : null,
                comprimento: estampa.comprimento ? Number(estampa.comprimento) : null,
              }))

              const { error: estampasError } = await supabase.from("estampas").insert(estampasParaInserir)

              if (estampasError) {
                console.error("Erro ao inserir estampas duplicadas:", estampasError)
                // Não interromper o processo por causa das estampas
              }
            }
          } catch (estampaErr) {
            console.error("Erro ao processar estampas duplicadas:", estampaErr)
            // Continue mesmo se as estampas falharem
          }
        }

        // Mostrar feedback de sucesso
        setFeedbackSalvamento({
          visivel: true,
          sucesso: true,
          mensagem: "Item duplicado com sucesso!",
        })
        
        // Atualizar o orcamentoOriginal após duplicar item com sucesso
        setOrcamentoOriginal({
          ...orcamento,
          itens: [...orcamento.itens, itemDuplicado],
        })
      } else {
        // Mostrar feedback para item duplicado em orçamento não salvo
        setFeedbackSalvamento({
          visivel: true,
          sucesso: true,
          mensagem: "Item duplicado! Salve o orçamento para persistir as alterações.",
        })
      }
    } catch (error) {
      console.error("Erro ao duplicar item:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao duplicar item: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      if (orcamentoSalvo) {
        setIsLoading(false)
      }
    }
  }

  // Update the atualizarItem function to include both observation fields
  const atualizarItem = (id: string, novoItem: Partial<ItemOrcamento>) => {
    const itensAtualizados = orcamento.itens.map((item) => (item.id === id ? { ...item, ...novoItem } : item))
    setOrcamento({
      ...orcamento,
      itens: itensAtualizados,
    })

    // NÃO salvar automaticamente - apenas atualizar o estado local
    // O salvamento deve ser manual através do botão "Salvar"
  }

  const calcularTotal = () => {
    return orcamento.itens.reduce((total, item) => {
      return total + item.quantidade * item.valorUnitario
    }, 0)
  }

  // Adicionar a função para carregar um orçamento específico
  const carregarOrcamento = async (orcamentoId: string) => {
    try {
      setIsLoading(true)
      setCarregandoOrcamento(true) // Sinalizar que está carregando orçamento
      console.log('Iniciando carregamento do orçamento ID:', orcamentoId)

      const { data, error } = await supabase
        .from("orcamentos")
        .select("*, cliente:cliente_id(*)")
        .eq("id", orcamentoId)
        .single()

      if (error) throw error
      
      console.log('Dados do orçamento obtidos do banco:', {
        id: data.id,
        numero: data.numero,
        cliente: data.cliente?.nome
      })

      // Verificar se o cliente existe
      if (!data.cliente) {
        throw new Error("Cliente não encontrado para este orçamento")
      }

      // Carregar itens do orçamento ordenados por posição
      const { data: itensData, error: itensError } = await supabase
        .from("itens_orcamento")
        .select("*, produto:produto_id(*)")
        .eq("orcamento_id", orcamentoId)
        .order("posicao", { ascending: true })

      if (itensError) throw itensError

      // Converter para o formato da aplicação
      let itensFormatados: ItemOrcamento[] = await Promise.all(
        itensData
          ? itensData.map(async (item) => {
              // Buscar o produto completo com tecidos
              let produto: Produto | undefined = undefined
              if (item.produto) {
                const { data: tecidosData, error: tecidosError } = await supabase
                  .from("tecidos")
                  .select("*")
                  .eq("produto_id", item.produto.id)

                if (tecidosError) throw tecidosError

                produto = {
                  id: item.produto.id,
                  nome: item.produto.nome,
                  valorBase: Number(item.produto.valor_base),
                  tecidos: tecidosData
                    ? tecidosData.map((t) => ({
                        nome: t.nome,
                        composicao: t.composicao || "",
                      }))
                    : [],
                  cores: item.produto.cores || [],
                  tamanhosDisponiveis: item.produto.tamanhos_disponiveis || [],
                }

                // Adicionar o produto à lista de produtos se ainda não existir
                if (!produtos.some((p) => p.id === produto?.id)) {
                  setProdutos((prevProdutos) => [...prevProdutos, produto!])
                }
              }

              // Carregar estampas do item
              const { data: estampasData, error: estampasError } = await supabase
                .from("estampas")
                .select("*")
                .eq("item_orcamento_id", item.id)

              if (estampasError) {
                console.error("Erro ao listar estampas do item:", estampasError)
                throw estampasError
              }

              // Converter estampas para o formato da aplicação
              const estampas: Estampa[] = estampasData
                ? estampasData.map((estampa) => ({
                    id: estampa.id,
                    posicao: estampa.posicao || undefined,
                    tipo: estampa.tipo || undefined,
                    largura: estampa.largura || undefined,
                    comprimento: estampa.comprimento || undefined,
                  }))
                : []

              // Inside the carregarOrcamento function, in the itensFormatados mapping:
              return {
                id: item.id,
                produtoId: item.produto_id || "",
                produto,
                quantidade: item.quantidade,
                valorUnitario: Number(item.valor_unitario),
                tecidoSelecionado: item.tecido_nome
                  ? {
                      nome: item.tecido_nome,
                      composicao: item.tecido_composicao || "",
                    }
                  : undefined,
                corSelecionada: item.cor_selecionada || undefined,
                estampas: estampas,
                tamanhos: (item.tamanhos as ItemOrcamento["tamanhos"]) || {},
                imagem: item.imagem || undefined,
                observacaoComercial: item.observacao_comercial || undefined,
                observacaoTecnica: item.observacao_tecnica || undefined,
              }
            })
          : [],
      )

      // Agora, precisamos modificar a função carregarOrcamento para garantir que a ordem dos itens seja respeitada
      // Localizar a função carregarOrcamento e adicionar o código para ordenar os itens conforme a ordem salva

      // Adicionar este trecho de código dentro da função carregarOrcamento, após a linha onde os itensFormatados são criados:
      // Aproximadamente na linha 1500-1600, após a criação de itensFormatados

      // Extrair metadados e ordem dos itens do JSON
      let _valorFrete = 0
      let _nomeContato = ""
      let _telefoneContato = ""
      let ordemItens: string[] = [] // Array para armazenar a ordem dos IDs dos itens

      try {
        if (data.itens && typeof data.itens === "object") {
          // Se itens já é um objeto (parseado automaticamente)
          if (data.itens.metadados) {
            if (data.itens.metadados.valorFrete !== undefined) {
              _valorFrete = Number(data.itens.metadados.valorFrete)
            }
            if (data.itens.metadados.nomeContato !== undefined) {
              _nomeContato = data.itens.metadados.nomeContato
            }
            if (data.itens.metadados.telefoneContato !== undefined) {
              _telefoneContato = data.itens.metadados.telefoneContato
            }
          }
          // Extrair a ordem dos itens, se existir
          if (data.itens.items && Array.isArray(data.itens.items)) {
            ordemItens = data.itens.items.map((item) => item.id)
          }
        } else if (data.itens && typeof data.itens === "string") {
          // Se itens é uma string JSON
          const itensObj = JSON.parse(data.itens)
          if (itensObj.metadados) {
            if (itensObj.metadados.valorFrete !== undefined) {
              _valorFrete = Number(itensObj.metadados.valorFrete)
            }
            if (itensObj.metadados.nomeContato !== undefined) {
              _nomeContato = itensObj.metadados.nomeContato
            }
            if (itensObj.metadados.telefoneContato !== undefined) {
              _telefoneContato = itensObj.metadados.telefoneContato
            }
          }
          // Extrair a ordem dos itens, se existir
          if (itensObj.items && Array.isArray(itensObj.items)) {
            ordemItens = itensObj.items.map((item) => item.id)
          }
        }
      } catch (e) {
        console.error("Erro ao extrair metadados do JSON:", e)
      }

      // Ordenar os itens conforme a ordem salva no JSON
      if (ordemItens.length > 0) {
        // Criar um mapa para facilitar a busca por ID
        const itensMap = new Map(itensFormatados.map((item) => [item.id, item]))

        // Criar um novo array ordenado
        const itensOrdenados: ItemOrcamento[] = []

        // Adicionar os itens na ordem salva
        ordemItens.forEach((id) => {
          const item = itensMap.get(id)
          if (item) {
            itensOrdenados.push(item)
            itensMap.delete(id) // Remover do mapa para não duplicar
          }
        })

        // Adicionar quaisquer itens restantes que não estavam na ordem salva
        itensMap.forEach((item) => {
          itensOrdenados.push(item)
        })

        // Substituir o array original pelo ordenado
        itensFormatados = itensOrdenados
      }

      // Converter cliente
      const clienteFormatado = {
        id: data.cliente.id,
        nome: data.cliente.nome,
        cnpj: data.cliente.cnpj || "",
        endereco: data.cliente.endereco || "",
        telefone: data.cliente.telefone || "",
        email: data.cliente.email || "",
        contato: data.cliente.contato || "",
      }

      // Adicionar o cliente à lista de clientes se ainda não existir
      if (!clientes.some((c) => c.id === clienteFormatado.id)) {
        setClientes((prevClientes) => [...prevClientes, clienteFormatado])
      }

      // Extrair metadados do JSON de itens, se existirem
      let valorFrete = 0
      let nomeContato = ""
      let telefoneContato = ""

      try {
        if (data.itens && typeof data.itens === "object") {
          // Se itens já é um objeto (parseado automaticamente)
          if (data.itens.metadados) {
            if (data.itens.metadados.valorFrete !== undefined) {
              valorFrete = Number(data.itens.metadados.valorFrete)
            }
            if (data.itens.metadados.nomeContato !== undefined) {
              nomeContato = data.itens.metadados.nomeContato
            }
            if (data.itens.metadados.telefoneContato !== undefined) {
              telefoneContato = data.itens.metadados.telefoneContato
            }
          }
        } else if (data.itens && typeof data.itens === "string") {
          // Se itens é uma string JSON
          const itensObj = JSON.parse(data.itens)
          if (itensObj.metadados) {
            if (itensObj.metadados.valorFrete !== undefined) {
              valorFrete = Number(itensObj.metadados.valorFrete)
            }
            if (itensObj.metadados.nomeContato !== undefined) {
              nomeContato = itensObj.metadados.nomeContato
            }
            if (itensObj.metadados.telefoneContato !== undefined) {
              telefoneContato = itensObj.metadados.telefoneContato
            }
          }
        }
      } catch (e) {
        console.error("Erro ao extrair metadados do JSON:", e)
      }

      // Atualizar o estado do orçamento - PRESERVAR O NÚMERO ORIGINAL
      console.log('Carregando orçamento com número:', data.numero)
      
      setOrcamento({
        id: data.id,
        numero: data.numero, // PRESERVAR o número original do banco de dados
        data: data.data,
        cliente: clienteFormatado,
        itens: itensFormatados,
        observacoes: data.observacoes || "",
        condicoesPagamento: data.condicoes_pagamento || "À vista",
        prazoEntrega: data.prazo_entrega || "15 dias",
        validadeOrcamento: data.validade_orcamento || "15 dias",
        status: data.status || "proposta",
        valorFrete: valorFrete,
        nomeContato: nomeContato,
        telefoneContato: telefoneContato,
      })

      // Definir como orçamento original para controle de alterações
      setOrcamentoOriginal({
        id: data.id,
        numero: data.numero,
        data: data.data,
        cliente: clienteFormatado,
        itens: itensFormatados,
        observacoes: data.observacoes || "",
        condicoesPagamento: data.condicoes_pagamento || "À vista",
        prazoEntrega: data.prazo_entrega || "15 dias",
        validadeOrcamento: data.validade_orcamento || "15 dias",
        status: data.status || "proposta",
        valorFrete: valorFrete,
        nomeContato: nomeContato,
        telefoneContato: telefoneContato,
      })

      setOrcamentoSalvo(data.id)
      setCriandoNovoOrcamento(false)
      setOrcamentoJaCarregado(true) // Marcar que um orçamento foi carregado
      
      console.log('Orçamento carregado com sucesso. Número final:', data.numero)
      console.log('Estado orcamentoJaCarregado definido como true')

      // Mudar para a aba de orçamento
      setAbaAtiva("orcamento")

      // Ativar detecção de alterações após carregar
      setTimeout(() => {
        setCarregandoOrcamento(false) // Finalizar carregamento
        setInicializacaoCompleta(true)
      }, 1000) // Aumentado para 1 segundo

      // Mostrar feedback
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento carregado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao carregar orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao carregar orçamento: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
      // Garantir que a flag seja resetada mesmo em caso de erro
      setTimeout(() => {
        setCarregandoOrcamento(false)
      }, 1100) // Pouco maior que o timeout principal
    }
  }

  const handleClienteSelection = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId) || null

    if (cliente) {
      // Verificar se o cliente existe no banco de dados
      supabase
        .from("clientes")
        .select("id")
        .eq("id", clienteId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.warn("Cliente não encontrado no banco de dados, será criado ao salvar o orçamento")
          }
        })

      // Atualizar o número do orçamento com os dados do cliente
      const numeroBase = orcamento.numero.split(" - ")[0]
      const itemDescricao = orcamento.itens.length > 0 ? orcamento.itens[0].produto?.nome || "Item" : "Item"
      const novoNumero = `${numeroBase} - ${itemDescricao} ${cliente.nome} ${cliente.contato}`

      atualizarOrcamento({
        cliente,
        numero: novoNumero,
      })
    } else {
      atualizarOrcamento({ cliente })
    }
  }

  // Adicionar a função para excluir um orçamento
  // Modificar a função excluirOrcamento para mover para a lixeira em vez de excluir permanentemente
  const excluirOrcamento = async (orcamentoId: string) => {
    try {
      setIsLoading(true)

      // Em vez de excluir, apenas marcar como "na lixeira"
      const { error } = await supabase
        .from("orcamentos")
        .update({
          deleted_at: new Date().toISOString(),
          status: "lixeira", // Adicionar um status especial para itens na lixeira
        })
        .eq("id", orcamentoId)

      if (error) {
        console.error("Erro ao mover orçamento para a lixeira:", error)
        throw error
      }

      // Se o orçamento excluído for o atual, criar um novo
      if (orcamentoSalvo === orcamentoId) {
        criarNovoOrcamento()
      }

      // Mostrar feedback
      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento movido para a lixeira com sucesso!",
      })

      // Recarregar a lista de orçamentos usando a função exposta pelo componente ListaOrcamentos
      if (recarregarOrcamentosRef.current) {
        await recarregarOrcamentosRef.current()
      }
    } catch (error) {
      console.error("Erro ao mover orçamento para a lixeira:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao mover orçamento para a lixeira: ${error instanceof Error ? error.message : "Tente novamente"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para abrir orçamento na visualização otimizada
  const abrirOrcamentoOtimizado = (orcamentoId: string) => {
    setOrcamentoOtimizadoId(orcamentoId)
    setAbaAtiva("orcamento-otimizado")
  }

  // Adicionar uma nova função para excluir permanentemente
  const excluirOrcamentoPermanentemente = async (orcamentoId) => {
    try {
      setIsLoading(true)

      const { error } = await supabase.from("orcamentos").delete().eq("id", orcamentoId)

      if (error) throw error

      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento excluído permanentemente!",
      })

      if (recarregarLixeiraRef.current) {
        await recarregarLixeiraRef.current()
      }
    } catch (error) {
      console.error("Erro ao excluir orçamento permanentemente:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao excluir orçamento permanentemente: ${error.message}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Adicionar uma função para restaurar orçamento da lixeira
  const restaurarOrcamento = async (orcamentoId) => {
    try {
      setIsLoading(true)

      const { error } = await supabase
        .from("orcamentos")
        .update({
          deleted_at: null,
          status: "5", // Restaurar como "Proposta"
        })
        .eq("id", orcamentoId)

      if (error) throw error

      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Orçamento restaurado com sucesso!",
      })

      if (recarregarLixeiraRef.current) {
        await recarregarLixeiraRef.current()
      }
    } catch (error) {
      console.error("Erro ao restaurar orçamento:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao restaurar orçamento: ${error.message}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Adicionar após a função excluirOrcamento
  const atualizarStatusOrcamento = async (orcamentoId: string, novoStatus: string) => {
    try {
      setIsLoading(true)

      const { error } = await supabase.from("orcamentos").update({ status: novoStatus }).eq("id", orcamentoId)

      if (error) {
        console.error("Erro ao atualizar status do orçamento:", error)
        setFeedbackSalvamento({
          visivel: true,
          sucesso: false,
          mensagem: `Erro ao atualizar status: ${error.message}`,
        })
        return
      }

      // Se o orçamento atual for o que está sendo atualizado, atualizar o estado
      if (orcamento.id === orcamentoId) {
        setOrcamento({
          ...orcamento,
          status: novoStatus,
        })
      }

      setFeedbackSalvamento({
        visivel: true,
        sucesso: true,
        mensagem: "Status atualizado com sucesso!",
      })

      // Recarregar a lista de orçamentos
      if (recarregarOrcamentosRef.current) {
        await recarregarOrcamentosRef.current()
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      setFeedbackSalvamento({
        visivel: true,
        sucesso: false,
        mensagem: `Erro ao atualizar status: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para trocar aba com verificação de alterações
  const trocarAba = (novaAba: string) => {
    if (temAlteracoes && abaAtiva === "orcamento" && novaAba !== "orcamento") {
      // Se há alterações e estamos saindo da aba de orçamento, perguntar se quer salvar
      abrirModalConfirmacao(() => {
        setAbaAtiva(novaAba)
      })
    } else {
      setAbaAtiva(novaAba)
    }
  }

  // Função segura para criar novo orçamento com verificação de alterações
  const criarNovoOrcamentoSeguro = () => {
    if (temAlteracoes && abaAtiva === "orcamento") {
      abrirModalConfirmacao(() => {
        criarNovoOrcamento()
      })
    } else {
      criarNovoOrcamento()
    }
  }

  // Mapeamento de abas para filtros de status
  const statusMap: { [key: string]: string | undefined } = {
    "orcamentos": "todos",
    "orcamentos-finalizados": "1",
    "orcamentos-entregues": "2",
    "orcamentos-cobranca": "3",
    "orcamentos-execucao": "4",
    "orcamentos-propostas": "5",
    "orcamentos-recusados": "6",
  };

  const isOrcamentosList = Object.keys(statusMap).includes(abaAtiva);

  // Títulos para as abas
  const titulosAbas: { [key: string]: { title: string; subtitle: string } } = {
    orcamento: { title: "Gerador de Orçamento", subtitle: "Crie orçamentos profissionais para uniformes industriais" },
    "orcamento-otimizado": { title: "Gerador de Orçamento", subtitle: "Crie orçamentos profissionais para uniformes industriais" },
    orcamentos: { title: "Todos os Orçamentos", subtitle: "Visualize e gerencie todos os seus orçamentos" },
    "orcamentos-propostas": { title: "Propostas", subtitle: "Visualize e gerencie suas propostas comerciais" },
    "orcamentos-execucao": { title: "Orçamentos em Execução", subtitle: "Acompanhe os orçamentos que estão em produção" },
    "orcamentos-finalizados": { title: "Orçamentos Finalizados", subtitle: "Consulte o histórico de orçamentos finalizados" },
    "orcamentos-entregues": { title: "Orçamentos Entregues", subtitle: "Acompanhe os orçamentos que já foram entregues" },
    "orcamentos-cobranca": { title: "Orçamentos em Cobrança", subtitle: "Gerencie os orçamentos pendentes de pagamento" },
    "orcamentos-recusados": { title: "Orçamentos Recusados", subtitle: "Analise os orçamentos que foram recusados" },
    clientes: { title: "Gerenciador de Clientes", subtitle: "Gerencie seus clientes" },
    produtos: { title: "Gerenciador de Produtos", subtitle: "Gerencie seus produtos" },
    categorias: { title: "Gerenciador de Categorias", subtitle: "Gerencie as categorias de produtos" },
    materiais: { title: "Gerenciador de Materiais", subtitle: "Gerencie os materiais disponíveis" },
    empresa: { title: "Gerenciador de Empresa", subtitle: "Gerencie os dados da sua empresa" },
    lixeira: { title: "Lixeira de Orçamentos", subtitle: "Gerencie orçamentos excluídos e restaure-os se necessário" },
    "produtos-tabela": { title: "Tabela de Produtos", subtitle: "Visualize e edite seus produtos em formato de tabela" },
  };

  const { title, subtitle } = titulosAbas[abaAtiva] || titulosAbas.orcamento;

  // Substituir o return do componente por:
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)]">
      <AppSidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={trocarAba}
        criandoNovoOrcamento={criandoNovoOrcamento}
        criarNovoOrcamento={criarNovoOrcamentoSeguro}
      />
      <SidebarInset className="bg-gray-50 overflow-auto flex-1 w-full">
        <div className="p-2 md:p-4 space-y-2 md:space-y-3">
          {/* Alerta de alterações não salvas */}
          {temAlteracoes && abaAtiva === "orcamento" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
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
                onClick={orcamentoSalvo ? atualizarOrcamentoExistente : salvarNovoOrcamento}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          )}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-2 md:p-4 rounded-lg shadow-sm gap-2 border border-gray-100">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-primary">{title}</h1>
              <p className="text-gray-500 mt-0.5 text-xs md:text-sm">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-start md:justify-end">
              {abaAtiva === "orcamento" && (
                <>
                  <Button
                    onClick={orcamentoSalvo ? copiarOrcamento : salvarNovoOrcamento}
                    disabled={isLoading || !orcamento.cliente}
                    className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {orcamentoSalvo ? "Copiar" : "Salvar"}
                  </Button>

                  {orcamentoSalvo && (
                    <Button
                      onClick={atualizarOrcamentoExistente}
                      disabled={isLoading || !orcamento.cliente}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? "Atualizando..." : "Atualizar"}
                    </Button>
                  )}

                  <Button
                    onClick={async () => {
                      if (orcamento.id) {
                        await exportarOrcamento(orcamento.id, "completo")
                      }
                    }}
                    disabled={isLoading || !orcamento.cliente || orcamento.itens.length === 0}
                    className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
                  >
                    <FileDown className="h-4 w-4" />
                    {isLoading ? "Gerando..." : "PDF Orçamento"}
                  </Button>

                  <Button
                    onClick={async () => {
                      if (orcamento.id) {
                        await exportarOrcamento(orcamento.id, "ficha")
                      }
                    }}
                    disabled={isLoading || !orcamento.cliente || orcamento.itens.length === 0}
                    className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
                  >
                    <FileDown className="h-4 w-4" />
                    {isLoading ? "Gerando..." : "PDF Ficha"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Feedback de salvamento */}
          {feedbackSalvamento.visivel && (
            <div
              className={`p-2 md:p-3 rounded-md ${
                feedbackSalvamento.sucesso ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              } flex items-center gap-2 animate-in fade-in slide-in-from-top-5 duration-300 text-xs md:text-sm`}
            >
              {feedbackSalvamento.sucesso ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <p>{feedbackSalvamento.mensagem}</p>
            </div>
          )}

          {/* Conteúdo principal baseado na aba ativa */}
          {(() => {
            if (isOrcamentosList) {
              return (
                <Card className="shadow-sm border border-gray-200">
                  <CardContent className="p-3 md:p-4">
                    <ListaOrcamentos
                      onSelectOrcamento={carregarOrcamento}
                      onNovoOrcamento={() => {
                        setOrcamentoJaCarregado(false)
                        criarNovoOrcamentoSeguro()
                      }}
                      onDeleteOrcamento={excluirOrcamento}
                      onUpdateStatus={atualizarStatusOrcamento}
                      onExportOrcamento={exportarOrcamento}
                      onAbrirOtimizado={abrirOrcamentoOtimizado}
                      reloadRef={recarregarOrcamentosRef}
                      filtroStatus={statusMap[abaAtiva]}
                    />
                  </CardContent>
                </Card>
              )
            }

            switch (abaAtiva) {
              case "orcamento-rapido":
                return <OrcamentoRapido />
              case "orcamento-otimizado":
                return (
                  <div className="h-full overflow-hidden">
                    <OrcamentoOtimizado id={orcamentoOtimizadoId || undefined} />
                  </div>
                )
              case "orcamento":
                return (
                  <div className="space-y-3">
                    {/* Formulário ocupando toda a largura */}
                    <Card className="shadow-sm border border-gray-200">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h2 className="text-lg md:text-xl font-semibold text-primary">Dados do Orçamento</h2>
                          <Dialog open={modalVisualizacaoAberto} onOpenChange={setModalVisualizacaoAberto}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="flex items-center gap-1.5 border-primary text-primary hover:bg-primary hover:text-white text-xs px-2 py-1 md:px-3 md:py-2 h-8 md:h-9"
                              >
                                <Eye className="h-4 w-4" />
                                Visualizar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
                              <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                                <DialogTitle className="text-primary">
                                  Visualização do Documento - {orcamento.numero}
                                </DialogTitle>
                                <Button
                                  onClick={exportarPDFCanvas}
                                  disabled={gerandoPDFProfissional || !orcamento.numero}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  {gerandoPDFProfissional ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <FileDown className="h-3 w-3 mr-1" />
                                  )}
                                  {gerandoPDFProfissional ? 'Gerando...' : 'Exportar PDF Pro'}
                                </Button>
                              </DialogHeader>
                              <div className="flex-1 overflow-auto p-2 md:p-4 bg-gray-50">
                                <div className="max-w-[210mm] mx-auto bg-white shadow-lg">
                                  <div ref={documentoRef}>
                                    <VisualizacaoDocumento
                                      orcamento={orcamento}
                                      calcularTotal={calcularTotal}
                                      dadosEmpresa={dadosEmpresa || undefined}
                                    />
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <FormularioOrcamento
                          orcamento={orcamento}
                          clientes={clientes}
                          produtos={produtos}
                          atualizarOrcamento={atualizarOrcamento}
                          adicionarItem={adicionarItem}
                          removerItem={removerItem}
                          duplicarItem={duplicarItem}
                          atualizarItem={atualizarItem}
                          calcularTotal={calcularTotal}
                          handleClienteChange={handleClienteSelection}
                          salvarNovoOrcamento={salvarNovoOrcamento}
                          atualizarOrcamentoExistente={atualizarOrcamentoExistente}
                          orcamentoSalvo={orcamentoSalvo}
                          isLoading={isLoading}
                          temAlteracoes={temAlteracoes}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )
              case "produtos-tabela":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <TabelaProdutos />
                    </CardContent>
                  </Card>
                )
              case "clientes":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <GerenciadorClientes
                        clientes={clientes}
                        adicionarCliente={adicionarCliente}
                        setClientes={setClientes}
                      />
                    </CardContent>
                  </Card>
                )
              case "produtos":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <GerenciadorProdutos
                        produtos={produtos}
                        adicionarProduto={adicionarProduto}
                        setProdutos={setProdutos}
                      />
                    </CardContent>
                  </Card>
                )
              case "categorias":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <GerenciadorCategorias />
                    </CardContent>
                  </Card>
                )
              case "materiais":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <GerenciadorMateriais />
                    </CardContent>
                  </Card>
                )
              case "empresa":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <GerenciadorEmpresa />
                    </CardContent>
                  </Card>
                )
              case "gastos-receitas":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <GerenciadorGastosReceitas />
                    </CardContent>
                  </Card>
                )
              case "dashboard":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <DashboardFinanceiro />
                    </CardContent>
                  </Card>
                )
              case "lixeira":
                return (
                  <Card className="shadow-sm border border-gray-200">
                    <CardContent className="p-3 md:p-4">
                      <LixeiraOrcamentos
                        onRestaurarOrcamento={restaurarOrcamento}
                        onExcluirPermanentemente={excluirOrcamentoPermanentemente}
                        reloadRef={recarregarLixeiraRef}
                      />
                    </CardContent>
                  </Card>
                )
              default:
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Card className="shadow-sm border border-gray-200">
                      <CardContent className="p-3 md:p-4">
                        <FormularioOrcamento
                          orcamento={orcamento}
                          clientes={clientes}
                          produtos={produtos}
                          atualizarOrcamento={atualizarOrcamento}
                          adicionarItem={adicionarItem}
                          removerItem={removerItem}
                          duplicarItem={duplicarItem}
                          atualizarItem={atualizarItem}
                          calcularTotal={calcularTotal}
                          handleClienteSelection={handleClienteSelection}
                        />
                      </CardContent>
                    </Card>
                    <div className="border rounded-lg overflow-hidden bg-white shadow-sm border-gray-200">
                      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-700">Visualização do Orçamento</h3>
                        <Button
                          onClick={exportarPDFCanvas}
                          disabled={gerandoPDFProfissional || !orcamento.numero}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {gerandoPDFProfissional ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <FileDown className="h-3 w-3 mr-1" />
                          )}
                          {gerandoPDFProfissional ? 'Gerando...' : 'Exportar PDF Pro'}
                        </Button>
                      </div>
                      <div className="p-2 md:p-3 h-[calc(100vh-250px)] overflow-auto">
                        <div ref={documentoRef}>
                          <VisualizacaoDocumento
                            orcamento={orcamento}
                            calcularTotal={calcularTotal}
                            dadosEmpresa={dadosEmpresa || undefined}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
            }
          })()}
        </div>
      </SidebarInset>
      <AssistenteIA
        clientes={clientes}
        produtos={produtos}
        orcamento={orcamento}
        setClientes={setClientes}
        setProdutos={setProdutos}
        setOrcamento={setOrcamento}
        setAbaAtiva={setAbaAtiva}
      />
      
      {/* Modal de confirmação para alterações não salvas */}
      <Dialog open={modalConfirmacaoAberto} onOpenChange={setModalConfirmacaoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Alterações não salvas
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Você tem alterações não salvas neste orçamento. O que deseja fazer?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={salvarEContinuar}
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar e continuar
              </Button>
              <Button 
                variant="outline" 
                onClick={descartarEContinuar}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Descartar alterações
              </Button>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setModalConfirmacaoAberto(false)}
              className="w-full mt-2"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

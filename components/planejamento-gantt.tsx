"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, RefreshCw, Loader2, ZoomIn, ZoomOut, Link2, Calendar, Clock, Package } from "lucide-react"
import { format, addDays, addHours, parseISO, differenceInDays, differenceInHours, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"

// Tipo para as tarefas do Gantt
interface Task {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies: string
  custom_class?: string
}

// Tipo para o estado interno das tarefas com mais detalhes
interface PlanejamentoTask extends Task {
  orcamento_id?: string
  orcamento_numero?: string
  responsavel?: string
  status?: "pendente" | "em_andamento" | "concluida" | "atrasada"
  duracao_horas?: number
  tipo_etapa?: string
  ordem_etapa?: number
  permite_paralelismo?: boolean
}

// Tipo para orçamento simplificado
interface OrcamentoSimples {
  id: string
  numero: string
  cliente_nome: string
  status: string
  prazo_entrega: string
}

// Etapas padrão de produção
const ETAPAS_PADRAO = [
  { nome: "Compra de Matéria Prima", duracao_horas: 48, cor: "gantt-blue", tipo_etapa: "compra", ordem: 1, permite_paralelismo: true },
  { nome: "Preparação e Corte", duracao_horas: 24, cor: "gantt-orange", tipo_etapa: "corte", ordem: 2, permite_paralelismo: true },
  { nome: "Costura", duracao_horas: 72, cor: "gantt-green", tipo_etapa: "costura", ordem: 3, permite_paralelismo: true },
  { nome: "Acabamento", duracao_horas: 24, cor: "gantt-purple", tipo_etapa: "acabamento", ordem: 4, permite_paralelismo: true },
  { nome: "Controle de Qualidade", duracao_horas: 8, cor: "gantt-yellow", tipo_etapa: "qualidade", ordem: 5, permite_paralelismo: false },
  { nome: "Embalagem", duracao_horas: 8, cor: "gantt-pink", tipo_etapa: "embalagem", ordem: 6, permite_paralelismo: false },
  { nome: "Expedição", duracao_horas: 4, cor: "gantt-teal", tipo_etapa: "expedicao", ordem: 7, permite_paralelismo: false }
]

// Mapeamento de cores para status
const STATUS_TO_COLOR: Record<string, string> = {
  "pendente": "gantt-blue",
  "em_andamento": "gantt-orange", 
  "concluida": "gantt-green",
  "atrasada": "gantt-red"
}

const STATUS_TO_LABEL: Record<string, string> = {
  "pendente": "Planejado",
  "em_andamento": "Em Andamento",
  "concluida": "Concluído",
  "atrasada": "Atrasado"
}

export default function PlanejamentoGantt() {
  const ganttRef = useRef<HTMLDivElement>(null)
  const [gantt, setGantt] = useState<any>(null)
  const [GanttChart, setGanttChart] = useState<any>(null)
  const [allTasks, setAllTasks] = useState<PlanejamentoTask[]>([])
  const [displayTasks, setDisplayTasks] = useState<PlanejamentoTask[]>([])
  const [orcamentos, setOrcamentos] = useState<OrcamentoSimples[]>([])
  const [selectedOrcamento, setSelectedOrcamento] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"Quarter Day" | "Half Day" | "Day" | "Week" | "Month">("Day")
  const [agrupamento, setAgrupamento] = useState<"pedido" | "etapa" | "nenhum">("pedido")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { tenantId } = useCurrentUser()
  
  // Carregar Gantt dinamicamente para evitar problemas de SSR
  useEffect(() => {
    import("frappe-gantt").then((module) => {
      setGanttChart(() => module.default)
    })
  }, [])
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<PlanejamentoTask | null>(null)
  
  // Estados para adicionar nova tarefa
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskDuracao, setNewTaskDuracao] = useState(24)
  const [newTaskCor, setNewTaskCor] = useState("gantt-blue")
  
  // Carregar orçamentos e tarefas do Supabase
  useEffect(() => {
    loadOrcamentos()
    loadTasks()
  }, [])
  
  // Filtrar tarefas quando mudar o orçamento selecionado ou agrupamento
  useEffect(() => {
    let tasks = allTasks

    // Filtrar por orçamento se não for "all"
    if (selectedOrcamento !== "all") {
      tasks = tasks.filter(t => t.orcamento_id === selectedOrcamento)
    }

    // Ordenar baseado no agrupamento
    if (agrupamento === "pedido") {
      // Agrupar por pedido e depois por ordem de etapa
      tasks = tasks.sort((a, b) => {
        if (a.orcamento_numero !== b.orcamento_numero) {
          return (a.orcamento_numero || "").localeCompare(b.orcamento_numero || "")
        }
        return (a.ordem_etapa || 0) - (b.ordem_etapa || 0)
      })
    } else if (agrupamento === "etapa") {
      // Agrupar por tipo de etapa e depois por pedido
      tasks = tasks.sort((a, b) => {
        if (a.tipo_etapa !== b.tipo_etapa) {
          const ordemA = a.ordem_etapa || 0
          const ordemB = b.ordem_etapa || 0
          return ordemA - ordemB
        }
        return (a.orcamento_numero || "").localeCompare(b.orcamento_numero || "")
      })
    }

    setDisplayTasks(tasks)
  }, [selectedOrcamento, allTasks, agrupamento])
  
  const loadOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          id,
          numero,
          prazo_entrega,
          status,
          cliente:clientes(nome)
        `)
        .in("status", ["3", "4"]) // 3=Aprovado, 4=Em Execução
        .order("numero", { ascending: false })
      
      if (error) throw error
      
      if (data) {
        const orcamentosFormatados: OrcamentoSimples[] = data.map((orc: any) => ({
          id: orc.id,
          numero: orc.numero,
          cliente_nome: orc.cliente?.nome || "Cliente não encontrado",
          status: orc.status,
          prazo_entrega: orc.prazo_entrega
        }))
        
        setOrcamentos(orcamentosFormatados)
      }
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error)
      toast({
        title: "Erro ao carregar pedidos",
        description: "Não foi possível carregar a lista de pedidos.",
        variant: "destructive"
      })
    }
  }
  
  const loadTasks = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("tarefas_planejamento")
        .select(`
          *,
          orcamento:orcamentos(numero)
        `)
        .order("data_inicio", { ascending: true })
      
      if (error) throw error
      
      if (data && data.length > 0) {
        // Converter dados do Supabase para formato do Gantt
        const convertedTasks: PlanejamentoTask[] = data.map((task: any) => ({
          id: task.id,
          name: `${task.orcamento?.numero || 'Sem Pedido'} - ${task.nome}`,
          start: task.data_inicio,
          end: task.data_fim,
          progress: task.progresso || 0,
          dependencies: task.dependencias ? task.dependencias.join(", ") : "",
          custom_class: task.cor || "gantt-blue",
          status: task.status,
          responsavel: task.responsavel,
          orcamento_id: task.orcamento_id,
          orcamento_numero: task.orcamento?.numero,
          duracao_horas: task.duracao_horas,
          tipo_etapa: task.tipo_etapa,
          ordem_etapa: task.ordem_etapa,
          permite_paralelismo: task.permite_paralelismo
        }))
        
        setAllTasks(convertedTasks)
      } else {
        setAllTasks([])
      }
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error)
      toast({
        title: "Erro ao carregar tarefas",
        description: "Não foi possível carregar as tarefas do banco de dados.",
        variant: "destructive"
      })
      setAllTasks([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Gerar etapas padrão para um orçamento
  const handleGerarEtapasPadrao = async () => {
    if (selectedOrcamento === "all") {
      toast({
        title: "Selecione um pedido",
        description: "Escolha um pedido específico para gerar as etapas.",
        variant: "destructive"
      })
      return
    }
    
    const orcamento = orcamentos.find(o => o.id === selectedOrcamento)
    if (!orcamento) return
    
    // Verificar se já existem tarefas para este orçamento
    const tarefasExistentes = allTasks.filter(t => t.orcamento_id === selectedOrcamento)
    if (tarefasExistentes.length > 0) {
      const confirmacao = confirm(`Este pedido já possui ${tarefasExistentes.length} tarefa(s). Deseja adicionar as etapas padrão mesmo assim?`)
      if (!confirmacao) return
    }
    
    setIsSaving(true)
    try {
      if (!tenantId) {
        throw new Error("Tenant ID não encontrado")
      }
      
      // Calcular datas começando de hoje
      let dataAtual = startOfDay(new Date())
      const novasTarefas: any[] = []
      let tarefaAnteriorId: string | null = null
      
      for (const etapa of ETAPAS_PADRAO) {
        const dataFim = addHours(dataAtual, etapa.duracao_horas)
        
        const novaTarefa = {
          tenant_id: tenantId,
          orcamento_id: selectedOrcamento,
          nome: etapa.nome,
          data_inicio: format(dataAtual, "yyyy-MM-dd"),
          data_fim: format(dataFim, "yyyy-MM-dd"),
          progresso: 0,
          dependencias: tarefaAnteriorId ? [tarefaAnteriorId] : [],
          cor: etapa.cor,
          status: "pendente",
          duracao_horas: etapa.duracao_horas,
          tipo_etapa: etapa.tipo_etapa,
          ordem_etapa: etapa.ordem,
          permite_paralelismo: etapa.permite_paralelismo
        }
        
        novasTarefas.push(novaTarefa)
        dataAtual = dataFim
      }
      
      const { data, error } = await supabase
        .from("tarefas_planejamento")
        .insert(novasTarefas)
        .select()
      
      if (error) throw error
      
      // Atualizar dependências com IDs reais
      if (data && data.length > 1) {
        const updates = data.slice(1).map((tarefa, index) => ({
          id: tarefa.id,
          dependencias: [data[index].id]
        }))
        
        for (const update of updates) {
          await supabase
            .from("tarefas_planejamento")
            .update({ dependencias: update.dependencias })
            .eq("id", update.id)
        }
      }
      
      toast({
        title: "Etapas criadas com sucesso",
        description: `${ETAPAS_PADRAO.length} etapas foram adicionadas ao pedido ${orcamento.numero}.`
      })
      
      await loadTasks()
    } catch (error) {
      console.error("Erro ao gerar etapas:", error)
      toast({
        title: "Erro ao gerar etapas",
        description: "Não foi possível criar as etapas padrão.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Salvar todas as tarefas no Supabase
  const handleSaveTasks = async () => {
    setIsSaving(true)
    try {
      if (!tenantId) {
        throw new Error("Tenant ID não encontrado")
      }
      
      // Atualizar tarefas existentes
      for (const task of displayTasks) {
        // Normaliza dependencies para sempre ser um array
        const dependencias = Array.isArray(task.dependencies) 
          ? task.dependencies 
          : (task.dependencies ? String(task.dependencies).split(",").map(d => d.trim()).filter(Boolean) : [])
        
        const { error } = await supabase
          .from("tarefas_planejamento")
          .update({
            nome: task.name,
            data_inicio: task.start,
            data_fim: task.end,
            progresso: task.progress,
            dependencias,
            cor: task.custom_class || "gantt-blue",
            status: task.status || "pendente",
            responsavel: task.responsavel
          })
          .eq("id", task.id)
        
        if (error) throw error
      }
      
      toast({
        title: "Tarefas salvas com sucesso",
        description: `${displayTasks.length} tarefa(s) foi(ram) atualizada(s).`
      })
      
      await loadTasks()
    } catch (error) {
      console.error("Erro ao salvar tarefas:", error)
      toast({
        title: "Erro ao salvar tarefas",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Inicializar o Gantt
  useEffect(() => {
    if (ganttRef.current && displayTasks.length > 0 && GanttChart) {
      ganttRef.current.innerHTML = ""
      
      try {
        const newGantt = new GanttChart(ganttRef.current, displayTasks, {
          header_height: 50,
          column_width: 30,
          step: 24,
          view_modes: ["Quarter Day", "Half Day", "Day", "Week", "Month"],
          bar_height: 30,
          bar_corner_radius: 3,
          readonly: false,
          arrow_curve: 5,
          padding: 18,
          view_mode: viewMode,
          language: "pt-br",
          on_date_change: (task: any, start: string, end: string) => {
            console.log("MOVENDO TAREFA:", task.id, start, end);
            setAllTasks(prev => prev.map(t => {
              if (t.id === task.id) {
                return { ...t, start, end };
              }
              return t;
            }));
            toast({
              title: "Data atualizada",
              description: `${task.name} movida para ${format(parseISO(start), "dd/MM/yyyy", { locale: ptBR })}`,
            });
          },
          on_progress_change: (task: any, progress: number) => {
            handleProgressChange(task.id, progress)
          },
        })
        
        setGantt(newGantt)
      } catch (error) {
        console.error("Erro ao inicializar Gantt:", error)
      }
    }
  }, [displayTasks, viewMode, GanttChart])

  // Atualizar quando mudar o modo de visualização
  const handleViewModeChange = (mode: "Quarter Day" | "Half Day" | "Day" | "Week" | "Month") => {
    setViewMode(mode)
    if (gantt) {
      gantt.change_view_mode(mode)
    }
  }

  // Lidar com mudança de datas (arrastar e soltar no gráfico)
  const handleDateChange = (taskId: string, start: Date, end: Date) => {
    setAllTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) {
        const duracaoHoras = differenceInHours(end, start)
        return {
          ...t,
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          duracao_horas: duracaoHoras
        }
      }
      return t
    }))
  }

  // Lidar com mudança de progresso
  const handleProgressChange = (taskId: string, progress: number) => {
    setAllTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) {
        // Auto-atualizar status baseado no progresso
        let status = t.status
        if (progress === 100) status = "concluida"
        else if (progress > 0) status = "em_andamento"
        
        return {
          ...t,
          progress,
          status
        }
      }
      return t
    }))
  }

  // Adicionar nova tarefa manual
  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      toast({
        title: "Nome da tarefa obrigatório",
        description: "Digite um nome para a tarefa.",
        variant: "destructive"
      })
      return
    }
    
    if (selectedOrcamento === "all") {
      toast({
        title: "Selecione um pedido",
        description: "Escolha um pedido específico para adicionar a tarefa.",
        variant: "destructive"
      })
      return
    }
    
    setIsSaving(true)
    try {
      if (!tenantId) {
        throw new Error("Tenant ID não encontrado")
      }
      
      // Calcular datas
      const tarefasOrcamento = displayTasks.filter(t => t.orcamento_id === selectedOrcamento)
      let dataInicio = startOfDay(new Date())
      
      if (tarefasOrcamento.length > 0) {
        // Começar após a última tarefa
        const ultimaTarefa = tarefasOrcamento[tarefasOrcamento.length - 1]
        dataInicio = addDays(parseISO(ultimaTarefa.end), 1)
      }
      
      const dataFim = addHours(dataInicio, newTaskDuracao)
      
      const novaTarefa = {
        tenant_id: tenantId,
        orcamento_id: selectedOrcamento,
        nome: newTaskName,
        data_inicio: format(dataInicio, "yyyy-MM-dd"),
        data_fim: format(dataFim, "yyyy-MM-dd"),
        progresso: 0,
        dependencias: [],
        cor: newTaskCor,
        status: "pendente",
        duracao_horas: newTaskDuracao
      }
      
      const { error } = await supabase
        .from("tarefas_planejamento")
        .insert(novaTarefa)
      
      if (error) throw error
      
      toast({
        title: "Tarefa adicionada",
        description: "A tarefa foi criada com sucesso."
      })
      
      setNewTaskName("")
      setNewTaskDuracao(24)
      setIsAddDialogOpen(false)
      await loadTasks()
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error)
      toast({
        title: "Erro ao adicionar tarefa",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Atualizar tarefa via diálogo
  const handleUpdateTask = () => {
    if (!currentTask) return

    setAllTasks(prevTasks => prevTasks.map(t => {
      if (t.id === currentTask.id) {
        return currentTask
      }
      return t
    }))
    setIsDialogOpen(false)
    
    toast({
      title: "Tarefa atualizada",
      description: "As alterações foram aplicadas. Clique em 'Salvar' para persistir."
    })
  }

  // Remover tarefa
  const handleDeleteTask = async () => {
    if (!currentTask) return
    
    const confirmacao = confirm(`Deseja realmente excluir a tarefa "${currentTask.name}"?`)
    if (!confirmacao) return
    
    try {
      const { error } = await supabase
        .from("tarefas_planejamento")
        .delete()
        .eq("id", currentTask.id)
      
      if (error) throw error
      
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida com sucesso."
      })
      
      setIsDialogOpen(false)
      await loadTasks()
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error)
      toast({
        title: "Erro ao excluir tarefa",
        description: "Não foi possível remover a tarefa.",
        variant: "destructive"
      })
    }
  }

  // Calcular estatísticas
  const calcularEstatisticas = () => {
    if (displayTasks.length === 0) {
      return {
        totalTarefas: 0,
        duracaoTotal: 0,
        duracaoTotalHoras: 0,
        dataInicio: null,
        dataFim: null,
        progressoMedio: 0,
        tarefasConcluidas: 0,
        tarefasEmAndamento: 0,
        pedidosUnicos: 0,
        etapasUnicas: 0,
        tarefasParalelas: 0
      }
    }
    
    const startDates = displayTasks.map(t => parseISO(t.start).getTime())
    const endDates = displayTasks.map(t => parseISO(t.end).getTime())
    
    const minDate = new Date(Math.min(...startDates))
    const maxDate = new Date(Math.max(...endDates))
    
    const duracaoTotal = differenceInDays(maxDate, minDate)
    const duracaoTotalHoras = displayTasks.reduce((acc, t) => acc + (t.duracao_horas || 0), 0)
    const progressoMedio = displayTasks.reduce((acc, t) => acc + t.progress, 0) / displayTasks.length
    const tarefasConcluidas = displayTasks.filter(t => t.status === "concluida").length
    const tarefasEmAndamento = displayTasks.filter(t => t.status === "em_andamento").length
    
    // Estatísticas de agrupamento
    const pedidosUnicos = new Set(displayTasks.map(t => t.orcamento_id).filter(Boolean)).size
    const etapasUnicas = new Set(displayTasks.map(t => t.tipo_etapa).filter(Boolean)).size
    const tarefasParalelas = displayTasks.filter(t => t.permite_paralelismo).length
    
    return {
      totalTarefas: displayTasks.length,
      duracaoTotal,
      duracaoTotalHoras,
      dataInicio: minDate,
      dataFim: maxDate,
      progressoMedio: Math.round(progressoMedio),
      tarefasConcluidas,
      tarefasEmAndamento,
      pedidosUnicos,
      etapasUnicas,
      tarefasParalelas
    }
  }
  
  const stats = calcularEstatisticas()

  // Função para otimizar o planejamento agrupando tarefas paralelas
  const otimizarPlanejamento = () => {
    if (displayTasks.length === 0) return

    const tarefasOtimizadas = [...displayTasks]
    
    // Agrupar por tipo de etapa que permite paralelismo
    const etapasPorTipo = tarefasOtimizadas.reduce((acc, task) => {
      if (task.tipo_etapa && task.permite_paralelismo) {
        if (!acc[task.tipo_etapa]) acc[task.tipo_etapa] = []
        acc[task.tipo_etapa].push(task)
      }
      return acc
    }, {} as Record<string, PlanejamentoTask[]>)

    // Para cada grupo, alinhar as datas de início para permitir execução paralela
    Object.values(etapasPorTipo).forEach(grupo => {
      if (grupo.length > 1) {
        // Encontrar a primeira data disponível
        const datasInicio = grupo.map(t => parseISO(t.start))
        const dataInicioMaisProxima = new Date(Math.min(...datasInicio.map(d => d.getTime())))
        
        toast({
          title: "Oportunidade de Paralelismo Detectada",
          description: `${grupo.length} tarefas de "${grupo[0].nome}" podem ser executadas em paralelo.`,
          duration: 5000
        })
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Planejamento de Produção</h2>
          <p className="text-muted-foreground">
            Gerencie cronogramas, etapas e prazos de cada pedido.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={viewMode} onValueChange={(v: any) => handleViewModeChange(v)}>
            <SelectTrigger className="w-[140px]">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quarter Day">6 horas</SelectItem>
              <SelectItem value="Half Day">12 horas</SelectItem>
              <SelectItem value="Day">Diário</SelectItem>
              <SelectItem value="Week">Semanal</SelectItem>
              <SelectItem value="Month">Mensal</SelectItem>
            </SelectContent>
          </Select>

          {selectedOrcamento === "all" && displayTasks.length > 1 && (
            <Button variant="outline" onClick={otimizarPlanejamento}>
              <ZoomIn className="mr-2 h-4 w-4" />
              Analisar Paralelismo
            </Button>
          )}
          
          <Button variant="outline" onClick={loadTasks} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          
          <Button onClick={handleSaveTasks} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Filtro de Pedidos e Agrupamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Filtros e Visualização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="orcamento-select">Pedido / Orçamento</Label>
              <Select value={selectedOrcamento} onValueChange={setSelectedOrcamento}>
                <SelectTrigger id="orcamento-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todos os Pedidos (Multi-Visualização)</SelectItem>
                  <Separator className="my-2" />
                  {orcamentos.map(orc => (
                    <SelectItem key={orc.id} value={orc.id}>
                      #{orc.numero} - {orc.cliente_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agrupamento-select">Modo de Agrupamento</Label>
              <Select value={agrupamento} onValueChange={(v: any) => setAgrupamento(v)}>
                <SelectTrigger id="agrupamento-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedido">
                    📦 Por Pedido (cada pedido agrupado)
                  </SelectItem>
                  <SelectItem value="etapa">
                    🔄 Por Etapa (agrupar etapas similares)
                  </SelectItem>
                  <SelectItem value="nenhum">
                    📋 Lista Simples (sem agrupamento)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {agrupamento === "pedido" && "Visualize cada pedido separadamente com suas etapas"}
                {agrupamento === "etapa" && "Agrupe tarefas similares de diferentes pedidos (ex: todos os cortes juntos)"}
                {agrupamento === "nenhum" && "Visualização linear de todas as tarefas"}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleGerarEtapasPadrao} 
              disabled={selectedOrcamento === "all" || isSaving}
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Gerar Etapas Padrão
            </Button>
            
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              disabled={selectedOrcamento === "all"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Etapa Manual
            </Button>
          </div>

          {agrupamento === "etapa" && selectedOrcamento === "all" && displayTasks.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Dica:</strong> No modo "Por Etapa", tarefas similares de diferentes pedidos aparecem juntas. 
                Isso facilita a execução paralela de etapas idênticas (ex: cortar camisas dos pedidos 206 e 208 ao mesmo tempo).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico Gantt e Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Gantt Chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cronograma de Produção</CardTitle>
                <CardDescription>
                  {agrupamento === "pedido" && "Visualização agrupada por pedido - arraste as barras para ajustar."}
                  {agrupamento === "etapa" && "Visualização por tipo de etapa - identifique facilmente tarefas paralelas."}
                  {agrupamento === "nenhum" && "Visualização linear - arraste as barras para ajustar datas."}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedOrcamento !== "all" && (
                  <Badge variant="secondary">
                    {orcamentos.find(o => o.id === selectedOrcamento)?.numero}
                  </Badge>
                )}
                {selectedOrcamento === "all" && displayTasks.length > 0 && (
                  <Badge variant="default">
                    {orcamentos.length} Pedidos
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-x-auto min-h-[450px] border rounded-md p-4 bg-background">
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : displayTasks.length > 0 ? (
                <div className="gantt-target" ref={ganttRef}></div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-center">
                    {selectedOrcamento === "all" 
                      ? "Nenhuma tarefa cadastrada. Selecione um pedido e gere as etapas." 
                      : "Nenhuma etapa definida para este pedido. Clique em 'Gerar Etapas Padrão' ou 'Adicionar Etapa Manual'."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Painel de Estatísticas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Total de Etapas</span>
                <span className="font-bold text-lg">{stats.totalTarefas}</span>
              </div>
              
              {selectedOrcamento === "all" && (
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Pedidos Ativos</span>
                  <span className="font-bold text-lg">{stats.pedidosUnicos}</span>
                </div>
              )}

              {agrupamento === "etapa" && (
                <>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Tipos de Etapa</span>
                    <span className="font-bold">{stats.etapasUnicas}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Tarefas Paralelizáveis</span>
                    <span className="font-bold text-green-600">{stats.tarefasParalelas}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Duração Total</span>
                <div className="text-right">
                  <span className="font-bold block">{stats.duracaoTotal} dias</span>
                  <span className="text-xs text-muted-foreground">{stats.duracaoTotalHoras}h</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Progresso Médio</span>
                <span className="font-bold">{stats.progressoMedio}%</span>
              </div>
              
              {stats.dataInicio && (
                <>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Início</span>
                    <span className="font-medium text-sm">
                      {format(stats.dataInicio, "dd/MM/yyyy")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Entrega Prevista</span>
                    <span className="font-medium text-sm text-green-600">
                      {format(stats.dataFim, "dd/MM/yyyy")}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status das Tarefas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Concluídas</span>
                </div>
                <span className="font-bold">{stats.tarefasConcluidas}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm">Em Andamento</span>
                </div>
                <span className="font-bold">{stats.tarefasEmAndamento}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Pendentes</span>
                </div>
                <span className="font-bold">
                  {stats.totalTarefas - stats.tarefasConcluidas - stats.tarefasEmAndamento}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legenda de Cores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-sm">Matéria Prima</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500"></div>
                <span className="text-sm">Preparação/Corte</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm">Costura</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500"></div>
                <span className="text-sm">Acabamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                <span className="text-sm">Qualidade</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-pink-500"></div>
                <span className="text-sm">Embalagem</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-teal-500"></div>
                <span className="text-sm">Expedição</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm">Atrasado</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Edição de Tarefa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          
          {currentTask && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-name">Nome da Etapa</Label>
                  <Input 
                    id="edit-name" 
                    value={currentTask.name} 
                    onChange={(e) => setCurrentTask({...currentTask, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-start">Data Início</Label>
                  <Input 
                    id="edit-start" 
                    type="date"
                    value={currentTask.start} 
                    onChange={(e) => setCurrentTask({...currentTask, start: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-end">Data Término</Label>
                  <Input 
                    id="edit-end" 
                    type="date"
                    value={currentTask.end} 
                    onChange={(e) => setCurrentTask({...currentTask, end: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-duracao">Duração (horas)</Label>
                  <Input 
                    id="edit-duracao" 
                    type="number"
                    min="1"
                    value={currentTask.duracao_horas || 24} 
                    onChange={(e) => {
                      const horas = parseInt(e.target.value) || 24
                      const novaDataFim = addHours(parseISO(currentTask.start), horas)
                      setCurrentTask({
                        ...currentTask, 
                        duracao_horas: horas,
                        end: format(novaDataFim, "yyyy-MM-dd")
                      })
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-progress">Progresso: {currentTask.progress}%</Label>
                  <input 
                    id="edit-progress" 
                    type="range" 
                    min="0" 
                    max="100" 
                    className="w-full"
                    value={currentTask.progress} 
                    onChange={(e) => {
                      const progress = parseInt(e.target.value)
                      let status = currentTask.status
                      if (progress === 100) status = "concluida"
                      else if (progress > 0) status = "em_andamento"
                      else status = "pendente"
                      
                      setCurrentTask({...currentTask, progress, status})
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-responsavel">Responsável</Label>
                  <Input 
                    id="edit-responsavel" 
                    value={currentTask.responsavel || ""} 
                    placeholder="Nome do responsável"
                    onChange={(e) => setCurrentTask({...currentTask, responsavel: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-tipo-etapa">Tipo de Etapa</Label>
                  <Select 
                    value={currentTask.tipo_etapa || ""} 
                    onValueChange={(v) => setCurrentTask({...currentTask, tipo_etapa: v})}
                  >
                    <SelectTrigger id="edit-tipo-etapa">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra">Compra de Matéria Prima</SelectItem>
                      <SelectItem value="corte">Preparação e Corte</SelectItem>
                      <SelectItem value="costura">Costura</SelectItem>
                      <SelectItem value="acabamento">Acabamento</SelectItem>
                      <SelectItem value="qualidade">Controle de Qualidade</SelectItem>
                      <SelectItem value="embalagem">Embalagem</SelectItem>
                      <SelectItem value="expedicao">Expedição</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={currentTask.status || "pendente"} 
                    onValueChange={(v: any) => setCurrentTask({...currentTask, status: v})}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="atrasada">Atrasada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="edit-paralelismo"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={currentTask.permite_paralelismo || false}
                    onChange={(e) => setCurrentTask({...currentTask, permite_paralelismo: e.target.checked})}
                  />
                  <Label htmlFor="edit-paralelismo" className="text-sm font-normal cursor-pointer">
                    Permite execução paralela com outras tarefas similares
                  </Label>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="edit-dependencies">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Dependências (IDs separados por vírgula)
                    </div>
                  </Label>
                  <Input 
                    id="edit-dependencies" 
                    value={currentTask.dependencies} 
                    placeholder="Ex: task-id-1, task-id-2"
                    onChange={(e) => setCurrentTask({...currentTask, dependencies: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta tarefa só iniciará após as dependências serem concluídas
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-color">Cor da Etapa</Label>
                  <Select 
                    value={currentTask.custom_class || "gantt-blue"} 
                    onValueChange={(v) => setCurrentTask({...currentTask, custom_class: v})}
                  >
                    <SelectTrigger id="edit-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gantt-blue">🔵 Azul (Matéria Prima)</SelectItem>
                      <SelectItem value="gantt-orange">🟠 Laranja (Corte)</SelectItem>
                      <SelectItem value="gantt-green">🟢 Verde (Costura)</SelectItem>
                      <SelectItem value="gantt-purple">🟣 Roxo (Acabamento)</SelectItem>
                      <SelectItem value="gantt-yellow">🟡 Amarelo (Qualidade)</SelectItem>
                      <SelectItem value="gantt-pink">🩷 Rosa (Embalagem)</SelectItem>
                      <SelectItem value="gantt-teal">🩵 Turquesa (Expedição)</SelectItem>
                      <SelectItem value="gantt-red">🔴 Vermelho (Crítico)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleDeleteTask}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
            <Button onClick={handleUpdateTask}>
              Aplicar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Adicionar Tarefa Manual */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Etapa Manual</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="new-name">Nome da Etapa</Label>
              <Input 
                id="new-name" 
                value={newTaskName} 
                placeholder="Ex: Bordado Especial"
                onChange={(e) => setNewTaskName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="new-duracao">Duração (horas)</Label>
              <Input 
                id="new-duracao" 
                type="number"
                min="1"
                value={newTaskDuracao} 
                onChange={(e) => setNewTaskDuracao(parseInt(e.target.value) || 24)}
              />
            </div>
            
            <div>
              <Label htmlFor="new-color">Cor</Label>
              <Select value={newTaskCor} onValueChange={setNewTaskCor}>
                <SelectTrigger id="new-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gantt-blue">🔵 Azul</SelectItem>
                  <SelectItem value="gantt-orange">🟠 Laranja</SelectItem>
                  <SelectItem value="gantt-green">🟢 Verde</SelectItem>
                  <SelectItem value="gantt-purple">🟣 Roxo</SelectItem>
                  <SelectItem value="gantt-yellow">🟡 Amarelo</SelectItem>
                  <SelectItem value="gantt-pink">🩷 Rosa</SelectItem>
                  <SelectItem value="gantt-teal">🩵 Turquesa</SelectItem>
                  <SelectItem value="gantt-red">🔴 Vermelho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTask} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Estilos globais para o Gantt */}
      <style jsx global>{`
        .gantt-container {
          overflow-x: auto;
        }
        .gantt .bar-label {
          fill: #fff;
          font-weight: 500;
          font-size: 12px;
          pointer-events: none;
        }
        .gantt .bar-wrapper {
          cursor: grab;
        }
        .gantt .bar-wrapper:active {
          cursor: grabbing;
        }
        .gantt .bar-progress {
          fill: rgba(255, 255, 255, 0.3);
        }
        
        /* Cores personalizadas */
        .gantt .bar-wrapper.gantt-blue .bar { fill: #3b82f6; }
        .gantt .bar-wrapper.gantt-orange .bar { fill: #f97316; }
        .gantt .bar-wrapper.gantt-green .bar { fill: #22c55e; }
        .gantt .bar-wrapper.gantt-purple .bar { fill: #a855f7; }
        .gantt .bar-wrapper.gantt-yellow .bar { fill: #eab308; }
        .gantt .bar-wrapper.gantt-pink .bar { fill: #ec4899; }
        .gantt .bar-wrapper.gantt-teal .bar { fill: #14b8a6; }
        .gantt .bar-wrapper.gantt-red .bar { fill: #ef4444; }
        
        .gantt .today-highlight {
          fill: rgba(59, 130, 246, 0.1);
          stroke: rgba(59, 130, 246, 0.3);
          stroke-width: 1;
        }
        
        /* Dark mode */
        .dark .gantt text {
          fill: #e5e7eb;
        }
        .dark .gantt .grid-header, .dark .gantt .grid-row {
          fill: #1f2937;
          stroke: #374151;
        }
        .dark .gantt .grid-row:nth-child(even) {
          fill: #111827;
        }
        
        /* Popup */
        .gantt-container .popup-wrapper {
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        /* Melhorar visualização das setas de dependência */
        .gantt .arrow {
          stroke: #94a3b8;
          stroke-width: 1.5;
          fill: none;
        }
      `}</style>
    </div>
  )
}







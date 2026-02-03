"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useCurrentUser } from "@/hooks/use-current-user"
import { toast } from "@/components/ui/use-toast"
import {
  Plus,
  Trash2,
  Edit,
  Loader2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react"
import type { TarefaPlanejamento } from "@/types/types"

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  { value: "em_andamento", label: "Em Andamento", color: "bg-blue-100 text-blue-800" },
  { value: "concluida", label: "Concluída", color: "bg-green-100 text-green-800" },
  { value: "atrasada", label: "Atrasada", color: "bg-red-100 text-red-800" },
]

const getStatusBadge = (status: string) => {
  const option = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
  return <Badge className={`${option.color} font-medium`}>{option.label}</Badge>
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "concluida":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case "em_andamento":
      return <Clock className="h-4 w-4 text-blue-600" />
    case "atrasada":
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-yellow-600" />
  }
}

export default function TodoList() {
  const { tenantId } = useCurrentUser()
  const [tarefas, setTarefas] = useState<TarefaPlanejamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState<TarefaPlanejamento | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [tarefaToDelete, setTarefaToDelete] = useState<TarefaPlanejamento | null>(null)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [busca, setBusca] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    data_inicio: new Date().toISOString().split("T")[0],
    data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    progresso: 0,
    status: "pendente" as "pendente" | "em_andamento" | "concluida" | "atrasada",
    responsavel: "",
    observacoes: "",
    cor: "#3b82f6",
  })

  const carregarTarefas = useCallback(async () => {
    if (!tenantId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("tarefas_planejamento")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("data_inicio", { ascending: true })

      if (error) throw error
      setTarefas(data || [])
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tarefas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    carregarTarefas()
  }, [carregarTarefas])

  const resetForm = () => {
    setFormData({
      nome: "",
      data_inicio: new Date().toISOString().split("T")[0],
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      progresso: 0,
      status: "pendente",
      responsavel: "",
      observacoes: "",
      cor: "#3b82f6",
    })
    setEditingTarefa(null)
  }

  const abrirNovoDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const abrirEditarDialog = (tarefa: TarefaPlanejamento) => {
    setEditingTarefa(tarefa)
    setFormData({
      nome: tarefa.nome,
      data_inicio: tarefa.data_inicio,
      data_fim: tarefa.data_fim,
      progresso: tarefa.progresso,
      status: tarefa.status || "pendente",
      responsavel: tarefa.responsavel || "",
      observacoes: tarefa.observacoes || "",
      cor: tarefa.cor || "#3b82f6",
    })
    setDialogOpen(true)
  }

  const salvarTarefa = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da tarefa é obrigatório.",
        variant: "destructive",
      })
      return
    }

    if (!tenantId) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      const tarefaData = {
        nome: formData.nome,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        progresso: formData.progresso,
        status: formData.status,
        responsavel: formData.responsavel || null,
        observacoes: formData.observacoes || null,
        cor: formData.cor,
        tenant_id: tenantId,
      }

      if (editingTarefa) {
        // Atualizar tarefa existente
        const { error } = await supabase
          .from("tarefas_planejamento")
          .update(tarefaData as any)
          .eq("id", editingTarefa.id)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Tarefa atualizada com sucesso!",
        })
      } else {
        // Criar nova tarefa
        const { error } = await supabase
          .from("tarefas_planejamento")
          .insert(tarefaData as any)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Tarefa criada com sucesso!",
        })
      }

      setDialogOpen(false)
      resetForm()
      carregarTarefas()
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a tarefa.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmarExclusao = (tarefa: TarefaPlanejamento) => {
    setTarefaToDelete(tarefa)
    setDeleteConfirmOpen(true)
  }

  const excluirTarefa = async () => {
    if (!tarefaToDelete) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("tarefas_planejamento")
        .delete()
        .eq("id", tarefaToDelete.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      })

      setDeleteConfirmOpen(false)
      setTarefaToDelete(null)
      carregarTarefas()
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a tarefa.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtrar tarefas
  const tarefasFiltradas = tarefas.filter((tarefa) => {
    const matchStatus = filtroStatus === "todos" || tarefa.status === filtroStatus
    const matchBusca = busca === "" ||
      tarefa.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (tarefa.responsavel && tarefa.responsavel.toLowerCase().includes(busca.toLowerCase()))
    return matchStatus && matchBusca
  })

  const formatarData = (data: string) => {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando tarefas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={abrirNovoDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Lista de tarefas */}
      {tarefasFiltradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhuma tarefa encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {busca || filtroStatus !== "todos"
                ? "Tente ajustar os filtros ou a busca."
                : "Clique em 'Nova Tarefa' para começar."}
            </p>
            {!busca && filtroStatus === "todos" && (
              <Button onClick={abrirNovoDialog} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira tarefa
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tarefasFiltradas.map((tarefa) => (
            <Card
              key={tarefa.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Indicador de cor */}
                  <div
                    className="w-1 h-16 rounded-full shrink-0"
                    style={{ backgroundColor: tarefa.cor || "#3b82f6" }}
                  />

                  {/* Conteúdo principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(tarefa.status || "pendente")}
                      <h3 className="font-semibold text-foreground truncate">{tarefa.nome}</h3>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {formatarData(tarefa.data_inicio)} - {formatarData(tarefa.data_fim)}
                        </span>
                      </div>
                      {tarefa.responsavel && (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>{tarefa.responsavel}</span>
                        </div>
                      )}
                    </div>

                    {/* Barra de progresso */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{tarefa.progresso}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${tarefa.progresso}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status e ações */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getStatusBadge(tarefa.status || "pendente")}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirEditarDialog(tarefa)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmarExclusao(tarefa)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTarefa ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Tarefa *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Comprar matéria-prima"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim *</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "pendente" | "em_andamento" | "concluida" | "atrasada") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="progresso">Progresso ({formData.progresso}%)</Label>
                <Input
                  id="progresso"
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progresso}
                  onChange={(e) => setFormData({ ...formData, progresso: parseInt(e.target.value) })}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="cor"
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Notas adicionais sobre a tarefa..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarTarefa} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTarefa ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a tarefa{" "}
            <strong>"{tarefaToDelete?.nome}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluirTarefa} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

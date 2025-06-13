"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Ruler, 
  Tag, 
  AlertCircle,
  Check,
  Loader2,
  RefreshCw
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { tipoTamanhoService, type TipoTamanho } from "@/lib/services-materiais"

interface GerenciadorTiposTamanhoProps {
  onTipoTamanhoChange?: () => void
}

export default function GerenciadorTiposTamanho({ onTipoTamanhoChange }: GerenciadorTiposTamanhoProps) {
  const [tipos, setTipos] = useState<TipoTamanho[]>([])
  const [loading, setLoading] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<TipoTamanho | null>(null)
  const [novoTipo, setNovoTipo] = useState({
    nome: "",
    descricao: "",
    tamanhosTexto: ""
  })

  // Carregar tipos de tamanho
  const carregarTipos = async () => {
    try {
      setLoading(true)
      
      // Forçar nova verificação da tabela
      await tipoTamanhoService.recarregarVerificacaoTabela()
      
      const tiposData = await tipoTamanhoService.listarTodos()
      
      // Debug: verificar duplicações
      const nomesTypes = tiposData.map(t => t.nome)
      const duplicados = nomesTypes.filter((nome, index) => nomesTypes.indexOf(nome) !== index)
      
      if (duplicados.length > 0) {
        console.warn("⚠️ Tipos duplicados detectados:", duplicados)
        // Remover duplicações mantendo apenas a primeira ocorrência
        const tiposSemDuplicados = tiposData.filter((tipo, index, arr) => 
          arr.findIndex(t => t.nome === tipo.nome) === index
        )
        setTipos(tiposSemDuplicados)
        console.log("✅ Duplicações removidas, tipos únicos:", tiposSemDuplicados.length)
      } else {
        setTipos(tiposData)
        console.log("✅ Tipos carregados sem duplicações:", tiposData.length)
      }
      
    } catch (error) {
      console.error("Erro ao carregar tipos de tamanho:", error)
      toast({
        title: "Erro ao carregar tipos",
        description: "Não foi possível carregar os tipos de tamanho.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Carregar tipos ao montar o componente
  useEffect(() => {
    carregarTipos()
  }, [])

  // Adicionar novo tipo
  const adicionarTipo = async () => {
    if (!novoTipo.nome.trim() || !novoTipo.tamanhosTexto.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e tamanhos são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Converter texto dos tamanhos em array
      const tamanhosArray = novoTipo.tamanhosTexto
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0)

      if (tamanhosArray.length === 0) {
        toast({
          title: "Tamanhos inválidos",
          description: "Adicione pelo menos um tamanho válido.",
          variant: "destructive",
        })
        return
      }

      await tipoTamanhoService.adicionar({
        nome: novoTipo.nome,
        descricao: novoTipo.descricao,
        tamanhos: tamanhosArray
      })

      // Limpar formulário
      setNovoTipo({
        nome: "",
        descricao: "",
        tamanhosTexto: ""
      })
      setModalAberto(false)

      // Recarregar lista
      await carregarTipos()
      
      // Notificar componente pai
      onTipoTamanhoChange?.()

      toast({
        title: "Tipo criado",
        description: "Novo tipo de tamanho criado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao adicionar tipo:", error)
      toast({
        title: "Erro ao criar tipo",
        description: "Não foi possível criar o tipo de tamanho.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Editar tipo existente
  const editarTipo = async () => {
    if (!editando) return

    try {
      setLoading(true)

      // Converter texto dos tamanhos em array
      const tamanhosArray = novoTipo.tamanhosTexto
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0)

      if (tamanhosArray.length === 0) {
        toast({
          title: "Tamanhos inválidos",
          description: "Adicione pelo menos um tamanho válido.",
          variant: "destructive",
        })
        return
      }

      await tipoTamanhoService.atualizar({
        ...editando,
        nome: novoTipo.nome,
        descricao: novoTipo.descricao,
        tamanhos: tamanhosArray
      })

      // Limpar formulário
      setNovoTipo({
        nome: "",
        descricao: "",
        tamanhosTexto: ""
      })
      setEditando(null)
      setModalAberto(false)

      // Recarregar lista
      await carregarTipos()
      
      // Notificar componente pai
      onTipoTamanhoChange?.()

      toast({
        title: "Tipo atualizado",
        description: "Tipo de tamanho atualizado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao editar tipo:", error)
      toast({
        title: "Erro ao editar tipo",
        description: error instanceof Error ? error.message : "Não foi possível editar o tipo de tamanho.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Remover tipo
  const removerTipo = async (tipo: TipoTamanho) => {
    if (window.confirm(`Tem certeza que deseja remover o tipo "${tipo.nome}"?`)) {
      try {
        setLoading(true)
        await tipoTamanhoService.remover(tipo.id)
        
        // Recarregar lista
        await carregarTipos()
        
        // Notificar componente pai
        onTipoTamanhoChange?.()

        toast({
          title: "Tipo removido",
          description: "Tipo de tamanho removido com sucesso!",
        })
      } catch (error) {
        console.error("Erro ao remover tipo:", error)
        toast({
          title: "Erro ao remover tipo",
          description: error instanceof Error ? error.message : "Não foi possível remover o tipo de tamanho.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Iniciar edição
  const iniciarEdicao = (tipo: TipoTamanho) => {
    setEditando(tipo)
    setNovoTipo({
      nome: tipo.nome,
      descricao: tipo.descricao,
      tamanhosTexto: tipo.tamanhos.join(", ")
    })
    setModalAberto(true)
  }

  // Cancelar edição
  const cancelarEdicao = () => {
    setEditando(null)
    setNovoTipo({
      nome: "",
      descricao: "",
      tamanhosTexto: ""
    })
    setModalAberto(false)
  }

  // Remover função que verificava tipos padrão - agora todos são editáveis

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Gerenciar Tipos de Tamanho</h2>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={carregarTipos}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editando ? "Editar Tipo de Tamanho" : "Novo Tipo de Tamanho"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Tipo</Label>
                <Input
                  id="nome"
                  value={novoTipo.nome}
                  onChange={(e) => setNovoTipo({...novoTipo, nome: e.target.value})}
                  placeholder="Ex: PLUS SIZE"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={novoTipo.descricao}
                  onChange={(e) => setNovoTipo({...novoTipo, descricao: e.target.value})}
                  placeholder="Ex: Tamanhos especiais para plus size"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tamanhos">Tamanhos (separados por vírgula)</Label>
                <Textarea
                  id="tamanhos"
                  value={novoTipo.tamanhosTexto}
                  onChange={(e) => setNovoTipo({...novoTipo, tamanhosTexto: e.target.value})}
                  placeholder="Ex: G8, G9, G10, G11, G12"
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Insira os tamanhos separados por vírgula
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={editando ? editarTipo : adicionarTipo}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editando ? "Salvar" : "Criar"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelarEdicao}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Carregando tipos de tamanho...</span>
        </div>
      )}

      <div className="grid gap-4">
        {tipos.map((tipo) => (
          <Card key={tipo.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">{tipo.nome}</CardTitle>
                  {/* Todos os tipos são agora editáveis */}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => iniciarEdicao(tipo)}
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerTipo(tipo)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tipo.descricao && (
                  <p className="text-sm text-gray-600">{tipo.descricao}</p>
                )}
                
                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">
                    Tamanhos ({tipo.tamanhos.length})
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {tipo.tamanhos.map((tamanho, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tamanho}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tipos.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Nenhum tipo de tamanho encontrado
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Crie um novo tipo de tamanho para começar a organizar seus produtos
            </p>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Tipo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

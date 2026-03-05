"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pencil, Trash2, Save, Tag, Check } from "lucide-react"
import { CrudPageLayout } from "@/components/ui/crud-page-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

// Interface para a categoria
export interface Categoria {
  id: string
  nome: string
  descricao?: string
  cor?: string
}

// Cores predefinidas para categorias
export const CORES_CATEGORIAS = [
  "#4f46e5", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
]

// Helper function to generate UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Categorias padrão
export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: generateUUID(), nome: "Camisetas", descricao: "Camisas em geral", cor: CORES_CATEGORIAS[0] },
  { id: generateUUID(), nome: "Camisas", descricao: "Camisas sociais e polos", cor: CORES_CATEGORIAS[1] },
  { id: generateUUID(), nome: "Uniformes Brim", descricao: "Calças e jaquetas de brim", cor: CORES_CATEGORIAS[2] },
  { id: generateUUID(), nome: "Jalecos", descricao: "Jalecos e aventais", cor: CORES_CATEGORIAS[3] },
  { id: generateUUID(), nome: "Outros", descricao: "Outros tipos de produtos", cor: CORES_CATEGORIAS[7] },
]

interface GerenciadorCategoriasProps {
  onClose: () => void
  onCategoriaAdded?: (categoria: Categoria) => void
  onCategoriaUpdated?: (categoria: Categoria) => void
  onCategoriaDeleted?: (id: string) => void
}

const FORM_VAZIO = { nome: "", descricao: "", cor: CORES_CATEGORIAS[0] }

export default function GerenciadorCategorias({
  onClose,
  onCategoriaAdded,
  onCategoriaUpdated,
  onCategoriaDeleted,
}: GerenciadorCategoriasProps) {
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_PADRAO)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState("")

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [formData, setFormData] = useState<Partial<Categoria>>(FORM_VAZIO)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null)

  // Filtrar categorias
  const categoriasFiltradas = useMemo(() => {
    return categorias.filter(
      (cat) =>
        cat.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        (cat.descricao || "").toLowerCase().includes(filtro.toLowerCase())
    )
  }, [categorias, filtro])

  const handleNew = () => {
    setFormData(FORM_VAZIO)
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleEdit = (categoria: Categoria) => {
    setFormData({ ...categoria })
    setDialogMode("edit")
    setEditingId(categoria.id)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.nome) return

    try {
      setIsLoading(true)
      setError(null)

      if (dialogMode === "create") {
        const novaCategoria: Categoria = {
          id: generateUUID(),
          nome: formData.nome.toUpperCase(),
          descricao: formData.descricao ? formData.descricao.toUpperCase() : "",
          cor: formData.cor || CORES_CATEGORIAS[0],
        }
        setCategorias([...categorias, novaCategoria])
        onCategoriaAdded?.(novaCategoria)
        toast.success("Categoria adicionada com sucesso!")
      } else {
        const categoriaAtualizada: Categoria = {
          id: editingId!,
          nome: formData.nome.toUpperCase(),
          descricao: formData.descricao ? formData.descricao.toUpperCase() : "",
          cor: formData.cor,
        }
        setCategorias(categorias.map((cat) => (cat.id === editingId ? categoriaAtualizada : cat)))
        onCategoriaUpdated?.(categoriaAtualizada)
        toast.success("Categoria atualizada com sucesso!")
      }

      setDialogOpen(false)
      setFormData(FORM_VAZIO)
    } catch (error) {
      console.error("Erro ao salvar categoria:", error)
      setError(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (categoria: Categoria) => {
    if (categoria.nome === "Outros") {
      toast.error("A categoria 'Outros' não pode ser removida.")
      return
    }
    setDeleteTarget(categoria)
    setConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    try {
      setIsLoading(true)
      setCategorias(categorias.filter((cat) => cat.id !== deleteTarget.id))
      onCategoriaDeleted?.(deleteTarget.id)
      toast.success("Categoria removida com sucesso!")
      setConfirmOpen(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error("Erro ao remover categoria:", error)
      setError(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Color picker component
  const ColorPicker = ({ value, onChange }: { value: string; onChange: (cor: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {CORES_CATEGORIAS.map((cor) => (
        <button
          key={cor}
          type="button"
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${value === cor ? "border-foreground scale-110" : "border-transparent hover:scale-105"
            }`}
          style={{ backgroundColor: cor }}
          onClick={() => onChange(cor)}
        >
          {value === cor && <Check className="h-4 w-4 text-white" />}
        </button>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Categorias</h2>
              <p className="text-sm text-muted-foreground">{categorias.length} categorias cadastradas</p>
            </div>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            Concluído
          </Button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Pesquisar categorias..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-9"
            />
          </div>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Tag className="h-3.5 w-3.5" />
            Nova Categoria
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {categoriasFiltradas.length === 0 ? (
            <EmptyState
              icon={<Tag className="h-8 w-8" />}
              title={filtro ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
              description={filtro ? "Tente uma pesquisa diferente." : "Adicione categorias para organizar seus produtos."}
              actionLabel={!filtro ? "Nova Categoria" : undefined}
              onAction={!filtro ? handleNew : undefined}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[50px]">Cor</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriasFiltradas.map((categoria) => (
                    <TableRow key={categoria.id} className="group">
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full shadow-sm"
                          style={{ backgroundColor: categoria.cor || CORES_CATEGORIAS[0] }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{categoria.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {categoria.descricao || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(categoria)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(categoria)}
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            disabled={categoria.nome === "Outros"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Dialog de Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                {dialogMode === "create" ? "Nova Categoria" : "Editar Categoria"}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === "create"
                  ? "Defina o nome, descrição e cor da nova categoria."
                  : "Altere os dados da categoria."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="cat-nome" className="text-sm font-medium mb-1.5 block">Nome *</Label>
                <Input
                  id="cat-nome"
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                  placeholder="Ex: CAMISETAS"
                />
              </div>

              <div>
                <Label htmlFor="cat-desc" className="text-sm font-medium mb-1.5 block">Descrição</Label>
                <Input
                  id="cat-desc"
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                  placeholder="Ex: CAMISETAS EM GERAL"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Cor</Label>
                <ColorPicker
                  value={formData.cor || CORES_CATEGORIAS[0]}
                  onChange={(cor) => setFormData({ ...formData, cor })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isLoading || !formData.nome} className="gap-2">
                <Save className="h-4 w-4" />
                {isLoading ? "Salvando..." : dialogMode === "create" ? "Adicionar" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        {deleteTarget && (
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Excluir categoria"
            description={`Tem certeza que deseja excluir a categoria "${deleteTarget.nome}"? Produtos associados serão movidos para "Outros".`}
            confirmLabel="Excluir"
            destructive
            onConfirm={confirmDelete}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}

"use client"

import React from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  DollarSign,
  FileText,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  FolderClosed,
  Tag,
  Pencil,
  Trash2,
  Save,
  Palette,
  Info,
} from "lucide-react"
import type { Produto } from "@/types/types"
import { supabase } from "@/lib/supabase"
import { useCurrentUser } from "@/hooks/use-current-user"
import { type Categoria, CORES_CATEGORIAS } from "./gerenciador-categorias"
import GerenciadorCategorias from "./gerenciador-categorias"
import { CrudPageLayout } from "@/components/ui/crud-page-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataPagination } from "@/components/ui/data-pagination"
import { toast } from "sonner"

// Helper function to generate UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Function to fetch the next sequential product code
const obterProximoCodigoProduto = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("produtos")
      .select("codigo")
      .order("codigo", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Erro ao obter o último código do produto:", error)
      return "P0001"
    }

    if (data && data.length > 0 && data[0].codigo) {
      const ultimoCodigo = data[0].codigo
      const numeroMatch = ultimoCodigo.match(/^P?(\d+)$/)

      if (numeroMatch && numeroMatch[1]) {
        const numero = Number.parseInt(numeroMatch[1], 10) + 1
        return "P" + String(numero).padStart(4, "0")
      }
    }

    return "P0001"
  } catch (error) {
    console.error("Erro ao obter o próximo código do produto:", error)
    return "P0001"
  }
}

// Default categories
const CATEGORIAS_PADRAO: Categoria[] = [
  { id: generateUUID(), nome: "CAMISETAS", descricao: "CAMISETAS EM GERAL", cor: CORES_CATEGORIAS[0] },
  { id: generateUUID(), nome: "CAMISAS", descricao: "CAMISAS SOCIAIS E POLOS", cor: CORES_CATEGORIAS[1] },
  { id: generateUUID(), nome: "UNIFORMES BRIM", descricao: "CALÇAS E JAQUETAS DE BRIM", cor: CORES_CATEGORIAS[2] },
  { id: generateUUID(), nome: "JALECOS", descricao: "JALECOS E AVENTAIS", cor: CORES_CATEGORIAS[3] },
  { id: generateUUID(), nome: "OUTROS", descricao: "OUTROS TIPOS DE PRODUTOS", cor: CORES_CATEGORIAS[7] },
]

type SortField = "codigo" | "nome" | "valorBase" | "categoria" | null
type SortDirection = "asc" | "desc" | null

const PAGE_SIZE = 20

interface GerenciadorProdutosProps {
  produtos: Produto[]
  adicionarProduto: (produto: Produto) => void
  setProdutos: (produtos: Produto[]) => void
}

const FORM_VAZIO: Partial<Produto> = {
  codigo: "",
  nome: "",
  valorBase: 0,
  tecidos: [],
  cores: [],
  tamanhosDisponiveis: [],
  categoria: "",
}

export default function GerenciadorProdutos({ produtos, adicionarProduto, setProdutos }: GerenciadorProdutosProps) {
  const { tenantId } = useCurrentUser()

  // UI States
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState("")
  const [sortField, setSortField] = useState<SortField>("codigo")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [formData, setFormData] = useState<Partial<Produto>>(FORM_VAZIO)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    title: string
    description: string
    onConfirm: () => void
  } | null>(null)

  // Category states
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({})
  const [mostrarGerenciadorCategorias, setMostrarGerenciadorCategorias] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_PADRAO)

  // Initialize categories on load
  useEffect(() => {
    const cats = [...new Set(produtos.map((p) => p.categoria || "OUTROS"))]
    const estadoInicial = cats.reduce((acc, cat) => {
      acc[cat] = true // Start expanded
      return acc
    }, {} as Record<string, boolean>)
    setCategoriasExpandidas(estadoInicial)
  }, [produtos])

  // Sort toggle
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc")
      else { setSortField(null); setSortDirection(null) }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Open new dialog
  const handleNew = () => {
    setFormData(FORM_VAZIO)
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (produto: Produto) => {
    setFormData({ ...produto })
    setDialogMode("edit")
    setEditingId(produto.id)
    setDialogOpen(true)
  }

  // Save (create or edit)
  const handleSave = async () => {
    if (!formData.nome || !formData.valorBase) return

    try {
      setIsLoading(true)
      setError(null)

      if (dialogMode === "create") {
        const produtoId = generateUUID()
        const codigo = await obterProximoCodigoProduto()

        // Check if 'categoria' column exists
        let colunaExiste = false
        try {
          const { error: tableError } = await supabase.from("produtos").select("categoria").limit(1)
          if (!tableError) colunaExiste = true
        } catch { colunaExiste = false }

        const insertData: Record<string, unknown> = {
          id: produtoId,
          codigo,
          nome: formData.nome.toUpperCase(),
          valor_base: formData.valorBase,
          cores: [],
          tamanhos_disponiveis: [],
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }

        if (colunaExiste) {
          insertData.categoria = formData.categoria ? formData.categoria.toUpperCase() : "OUTROS"
        }

        const { data: insertedData, error: produtoError } = await supabase
          .from("produtos")
          .insert(insertData)
          .select()

        if (produtoError) throw produtoError

        if (insertedData && insertedData[0]) {
          const novoProdutoFormatado: Produto = {
            id: insertedData[0].id,
            codigo: insertedData[0].codigo || codigo,
            nome: insertedData[0].nome,
            valorBase: Number(insertedData[0].valor_base),
            tecidos: [],
            cores: [],
            tamanhosDisponiveis: insertedData[0].tamanhos_disponiveis || [],
            categoria: insertedData[0].categoria || formData.categoria?.toUpperCase() || "OUTROS",
          }
          adicionarProduto(novoProdutoFormatado)
          toast.success("Produto adicionado com sucesso!")
        }
      } else {
        // Edit mode
        let colunaExiste = false
        try {
          const { error: tableError } = await supabase.from("produtos").select("categoria").limit(1)
          if (!tableError) colunaExiste = true
        } catch { colunaExiste = false }

        const updateData: Record<string, unknown> = {
          codigo: formData.codigo,
          nome: formData.nome!.toUpperCase(),
          valor_base: formData.valorBase,
          cores: [],
          tamanhos_disponiveis: [],
          updated_at: new Date().toISOString(),
        }

        if (colunaExiste) {
          updateData.categoria = formData.categoria ? formData.categoria.toUpperCase() : "OUTROS"
        }

        const { error: produtoError } = await supabase
          .from("produtos")
          .update(updateData)
          .eq("id", editingId!)

        if (produtoError) throw produtoError

        setProdutos(
          produtos.map((p) =>
            p.id === editingId
              ? {
                ...p,
                nome: formData.nome!.toUpperCase(),
                valorBase: formData.valorBase || p.valorBase,
                categoria: formData.categoria?.toUpperCase() || p.categoria,
              }
              : p
          )
        )
        toast.success("Produto atualizado com sucesso!")
      }

      setDialogOpen(false)
      setFormData(FORM_VAZIO)
    } catch (error) {
      const supabaseError = error as { message?: string; details?: string }
      const errorMessage = error instanceof Error
        ? error.message
        : supabaseError?.message || supabaseError?.details || "Erro desconhecido"
      console.error("Erro ao salvar produto:", error)
      setError(`Erro ao salvar produto: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete product
  const handleDelete = (produto: Produto) => {
    setConfirmData({
      title: "Excluir produto",
      description: `Tem certeza que deseja excluir o produto "${produto.nome}" (${produto.codigo})? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          setIsLoading(true)
          setError(null)

          // Check linked items
          const { data: itensRelacionados, error: itensError } = await supabase
            .from("itens_orcamento")
            .select("id, orcamento_id")
            .eq("produto_id", produto.id)

          if (itensError) throw itensError

          if (itensRelacionados && itensRelacionados.length > 0) {
            setConfirmOpen(false)
            setConfirmData({
              title: "Produto vinculado a orçamentos",
              description: `Este produto está sendo usado em ${itensRelacionados.length} item(ns) de orçamento. Todos esses itens serão excluídos também. Deseja continuar?`,
              onConfirm: async () => {
                try {
                  await supabase.from("itens_orcamento").delete().eq("produto_id", produto.id)
                  await supabase.from("tecidos").delete().eq("produto_id", produto.id)
                  const { error } = await supabase.from("produtos").delete().eq("id", produto.id)
                  if (error) throw error
                  setProdutos(produtos.filter((p) => p.id !== produto.id))
                  toast.success("Produto e itens vinculados excluídos com sucesso!")
                  setConfirmOpen(false)
                } catch (err) {
                  console.error("Erro ao remover produto:", err)
                  setError(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
                  setConfirmOpen(false)
                } finally {
                  setIsLoading(false)
                }
              },
            })
            setTimeout(() => setConfirmOpen(true), 100)
            return
          }

          // No linked items — delete directly
          await supabase.from("tecidos").delete().eq("produto_id", produto.id)
          const { error } = await supabase.from("produtos").delete().eq("id", produto.id)
          if (error) throw error
          setProdutos(produtos.filter((p) => p.id !== produto.id))
          toast.success("Produto excluído com sucesso!")
          setConfirmOpen(false)
        } catch (error) {
          console.error("Erro ao remover produto:", error)
          setError(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
          setConfirmOpen(false)
        } finally {
          setIsLoading(false)
        }
      },
    })
    setConfirmOpen(true)
  }

  // Category expand/collapse
  const alternarCategoria = (categoria: string) => {
    setCategoriasExpandidas((prev) => ({ ...prev, [categoria]: !prev[categoria] }))
  }

  // Color for category
  const getCorCategoria = (nomeCategoria: string): string => {
    const categoria = categorias.find((cat) => cat.nome === nomeCategoria)
    return categoria?.cor || "#4f46e5"
  }

  // Category management callbacks
  const handleCategoriaAdded = (categoria: Categoria) => {
    setCategorias([...categorias, categoria])
  }

  const handleCategoriaUpdated = (categoriaAtualizada: Categoria) => {
    setCategorias(categorias.map((cat) => (cat.id === categoriaAtualizada.id ? categoriaAtualizada : cat)))
    const categoriaAntiga = categorias.find((cat) => cat.id === categoriaAtualizada.id)
    if (categoriaAntiga && categoriaAntiga.nome !== categoriaAtualizada.nome) {
      setProdutos(
        produtos.map((produto) =>
          produto.categoria === categoriaAntiga.nome ? { ...produto, categoria: categoriaAtualizada.nome } : produto
        )
      )
    }
  }

  const handleCategoriaDeleted = (id: string) => {
    const categoriaRemovida = categorias.find((cat) => cat.id === id)
    setCategorias(categorias.filter((cat) => cat.id !== id))
    if (categoriaRemovida) {
      setProdutos(
        produtos.map((produto) =>
          produto.categoria === categoriaRemovida.nome ? { ...produto, categoria: "OUTROS" } : produto
        )
      )
    }
  }

  // Filter + Sort + Group
  const produtosFiltradosEOrdenados = useMemo(() => {
    return produtos
      .filter((produto) => {
        if (!filtro) return true
        const termo = filtro.toLowerCase()
        return (
          produto.codigo.toLowerCase().includes(termo) ||
          produto.nome.toLowerCase().includes(termo) ||
          produto.categoria?.toLowerCase().includes(termo)
        )
      })
      .sort((a, b) => {
        if (!sortField || !sortDirection) return 0
        let valA: string | number, valB: string | number
        switch (sortField) {
          case "codigo": valA = a.codigo; valB = b.codigo; break
          case "nome": valA = a.nome; valB = b.nome; break
          case "valorBase": valA = a.valorBase; valB = b.valorBase; break
          case "categoria": valA = a.categoria || "OUTROS"; valB = b.categoria || "OUTROS"; break
          default: return 0
        }
        if (typeof valA === "string" && typeof valB === "string") {
          return sortDirection === "asc"
            ? valA.localeCompare(valB, "pt-BR")
            : valB.localeCompare(valA, "pt-BR")
        }
        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number)
      })
  }, [produtos, filtro, sortField, sortDirection])

  // Group by category
  const produtosAgrupados = useMemo(() => {
    const grupos: Record<string, Produto[]> = {}
    produtosFiltradosEOrdenados.forEach((produto) => {
      const categoria = produto.categoria || "OUTROS"
      if (!grupos[categoria]) grupos[categoria] = []
      grupos[categoria].push(produto)
    })
    return grupos
  }, [produtosFiltradosEOrdenados])

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1) }, [filtro])

  // Sortable Header component
  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/60 transition-colors ${className || ""}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc"
            ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
            : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
    </TableHead>
  )

  return (
    <>
      <CrudPageLayout
        title="Produtos"
        icon={<Package className="h-5 w-5" />}
        totalItems={produtos.length}
        itemLabel="produtos cadastrados"
        searchValue={filtro}
        onSearchChange={setFiltro}
        searchPlaceholder="Pesquisar por código, nome ou categoria..."
        newButtonLabel="Novo Produto"
        onNew={handleNew}
        extraActions={
          <Button
            onClick={() => setMostrarGerenciadorCategorias(true)}
            variant="outline"
            size="sm"
            className="text-muted-foreground gap-1.5"
          >
            <Tag className="h-4 w-4" />
            Categorias
          </Button>
        }
        error={error}
        isLoading={isLoading}
        footer={
          <DataPagination
            currentPage={currentPage}
            totalItems={produtosFiltradosEOrdenados.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        {isLoading && produtos.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Carregando produtos...
          </div>
        ) : produtosFiltradosEOrdenados.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title={filtro ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
            description={
              filtro
                ? `Nenhum resultado para "${filtro}". Tente uma pesquisa diferente.`
                : "Comece adicionando seu primeiro produto para gerenciar seus orçamentos."
            }
            actionLabel={!filtro ? "Adicionar Primeiro Produto" : undefined}
            onAction={!filtro ? handleNew : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortableHeader field="codigo" className="w-[100px]">Código</SortableHeader>
                <SortableHeader field="categoria">Categoria</SortableHeader>
                <SortableHeader field="nome">Descrição</SortableHeader>
                <SortableHeader field="valorBase" className="w-[130px]">Valor Base</SortableHeader>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(produtosAgrupados).map(([categoria, produtosCategoria]) => (
                <React.Fragment key={categoria}>
                  {/* Category header row */}
                  <TableRow
                    className="border-t cursor-pointer hover:bg-muted/40"
                    style={{ backgroundColor: `${getCorCategoria(categoria)}08` }}
                    onClick={() => alternarCategoria(categoria)}
                  >
                    <TableCell colSpan={5} className="py-2">
                      <div
                        className="flex items-center gap-2 font-medium text-sm"
                        style={{ color: getCorCategoria(categoria) }}
                      >
                        {categoriasExpandidas[categoria]
                          ? <FolderOpen className="h-4 w-4" />
                          : <FolderClosed className="h-4 w-4" />
                        }
                        {categoria}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({produtosCategoria.length} {produtosCategoria.length === 1 ? "produto" : "produtos"})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Products within category */}
                  {categoriasExpandidas[categoria] &&
                    produtosCategoria.map((produto) => (
                      <TableRow key={produto.id} className="group">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {produto.codigo || "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${getCorCategoria(produto.categoria || "OUTROS")}15`,
                              color: getCorCategoria(produto.categoria || "OUTROS"),
                            }}
                          >
                            {produto.categoria || "OUTROS"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell className="font-medium tabular-nums">
                          R$ {produto.valorBase.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(produto)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              disabled={isLoading}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(produto)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CrudPageLayout>

      {/* Dialog de Criar/Editar Produto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "create" ? (
                <>
                  <Package className="h-5 w-5 text-primary" />
                  Novo Produto
                </>
              ) : (
                <>
                  <Pencil className="h-5 w-5 text-primary" />
                  Editar Produto
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Preencha os dados do novo produto. O código será gerado automaticamente."
                : "Altere os dados do produto conforme necessário."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Código (read only) */}
            {dialogMode === "edit" && (
              <div>
                <Label htmlFor="dlg-codigo" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Código
                </Label>
                <Input
                  id="dlg-codigo"
                  value={formData.codigo || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            )}

            {/* Categoria */}
            <div>
              <Label htmlFor="dlg-categoria" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <Tag className="h-3.5 w-3.5" />
                Categoria *
              </Label>
              <Select
                value={formData.categoria || ""}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.nome}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.cor }}
                        />
                        {cat.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome */}
            <div>
              <Label htmlFor="dlg-nome" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <Package className="h-3.5 w-3.5" />
                Nome do Produto *
              </Label>
              <Input
                id="dlg-nome"
                value={formData.nome || ""}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                placeholder="Ex: CAMISA POLO MASCULINA"
              />
            </div>

            {/* Valor Base */}
            <div>
              <Label htmlFor="dlg-valor" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Valor Base (R$) *
              </Label>
              <Input
                id="dlg-valor"
                type="number"
                value={formData.valorBase || ""}
                onChange={(e) => setFormData({ ...formData, valorBase: Number.parseFloat(e.target.value) })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            {/* Materials info */}
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Cores, tecidos e tamanhos são gerenciados globalmente na aba <strong>Materiais</strong>.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !formData.nome || !formData.valorBase || !formData.categoria}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading
                ? "Salvando..."
                : dialogMode === "create"
                  ? "Adicionar Produto"
                  : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      {confirmData && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmData.title}
          description={confirmData.description}
          confirmLabel="Excluir"
          destructive
          onConfirm={confirmData.onConfirm}
          isLoading={isLoading}
        />
      )}

      {/* Categories Manager Modal */}
      {mostrarGerenciadorCategorias && (
        <GerenciadorCategorias
          onClose={() => setMostrarGerenciadorCategorias(false)}
          onCategoriaAdded={handleCategoriaAdded}
          onCategoriaUpdated={handleCategoriaUpdated}
          onCategoriaDeleted={handleCategoriaDeleted}
        />
      )}
    </>
  )
}

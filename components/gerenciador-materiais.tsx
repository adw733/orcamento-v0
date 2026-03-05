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
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Palette,
  Shirt,
  Ruler,
  ChevronUp,
  ChevronDown,
  Search,
  Layers,
} from "lucide-react"
import {
  type Cor,
  type TecidoBase,
  type TipoTamanho,
  corService,
  tecidoBaseService,
  tipoTamanhoService,
} from "@/lib/services-materiais"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CrudPageLayout } from "@/components/ui/crud-page-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataPagination } from "@/components/ui/data-pagination"
import { toast } from "sonner"

const PAGE_SIZE = 20

// ==============================
// Sub-component: Cores Tab
// ==============================
function TabCores() {
  const [cores, setCores] = useState<Cor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<"nome" | "codigo_hex" | null>("nome")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [formData, setFormData] = useState<Partial<Cor>>({ nome: "", codigo_hex: "#000000" })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const data = await corService.listarTodas()
        setCores(data)
      } catch (err) {
        console.error("Erro ao carregar cores:", err)
        toast.error("Erro ao carregar cores")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const toggleSort = (field: "nome" | "codigo_hex") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc")
      else { setSortField(null); setSortDir("asc") }
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const coresFiltradas = useMemo(() => {
    return cores
      .filter((c) => {
        if (!filtro) return true
        const t = filtro.toLowerCase()
        return c.nome.toLowerCase().includes(t) || (c.codigo_hex || "").toLowerCase().includes(t)
      })
      .sort((a, b) => {
        if (!sortField) return 0
        const va = sortField === "nome" ? a.nome : (a.codigo_hex || "")
        const vb = sortField === "nome" ? b.nome : (b.codigo_hex || "")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
      })
  }, [cores, filtro, sortField, sortDir])

  useEffect(() => { setCurrentPage(1) }, [filtro])

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const paginadas = coresFiltradas.slice(startIdx, startIdx + PAGE_SIZE)

  const handleNew = () => {
    setFormData({ nome: "", codigo_hex: "#000000" })
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleEdit = (cor: Cor) => {
    setFormData({ ...cor })
    setDialogMode("edit")
    setEditingId(cor.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome) return
    try {
      setIsLoading(true)
      if (dialogMode === "create") {
        const nova = await corService.adicionar({
          nome: formData.nome.toUpperCase(),
          codigo_hex: formData.codigo_hex,
        })
        setCores([...cores, nova])
        toast.success("Cor adicionada com sucesso!")
      } else {
        const atualizada = { ...formData, id: editingId!, nome: formData.nome.toUpperCase() } as Cor
        await corService.atualizar(atualizada)
        setCores(cores.map((c) => (c.id === editingId ? atualizada : c)))
        toast.success("Cor atualizada com sucesso!")
      }
      setDialogOpen(false)
    } catch (err) {
      console.error("Erro ao salvar cor:", err)
      toast.error(`Erro ao salvar cor: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRequest = (id: string) => {
    setConfirmId(id)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmId) return
    try {
      setIsLoading(true)
      await corService.remover(confirmId)
      setCores(cores.filter((c) => c.id !== confirmId))
      toast.success("Cor excluída com sucesso!")
      setConfirmOpen(false)
    } catch (err) {
      console.error("Erro ao remover cor:", err)
      toast.error(`Erro ao remover cor: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
      setConfirmOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const SortableHeader = ({ field, children }: { field: "nome" | "codigo_hex"; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/60 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
    </TableHead>
  )

  return (
    <>
      <CrudPageLayout
        title="Cores"
        icon={<Palette className="h-5 w-5" />}
        totalItems={cores.length}
        itemLabel="cores cadastradas"
        searchValue={filtro}
        onSearchChange={setFiltro}
        searchPlaceholder="Pesquisar por nome ou código hex..."
        newButtonLabel="Nova Cor"
        onNew={handleNew}
        isLoading={isLoading}
        footer={
          <DataPagination
            currentPage={currentPage}
            totalItems={coresFiltradas.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        {isLoading && cores.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando cores...</div>
        ) : coresFiltradas.length === 0 ? (
          <EmptyState
            icon={<Palette className="h-8 w-8" />}
            title={filtro ? "Nenhuma cor encontrada" : "Nenhuma cor cadastrada"}
            description={filtro ? `Nenhum resultado para "${filtro}".` : "Comece adicionando sua primeira cor."}
            actionLabel={!filtro ? "Adicionar Primeira Cor" : undefined}
            onAction={!filtro ? handleNew : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[50px]">Cor</TableHead>
                <SortableHeader field="nome">Nome</SortableHeader>
                <SortableHeader field="codigo_hex">Código Hex</SortableHeader>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginadas.map((cor) => (
                <TableRow key={cor.id} className="group">
                  <TableCell>
                    <div
                      className="w-7 h-7 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: cor.codigo_hex || "#000000" }}
                      title={cor.nome}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{cor.nome}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{cor.codigo_hex || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cor)} className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={isLoading}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(cor.id)} className="h-8 w-8 text-muted-foreground hover:text-red-600" disabled={isLoading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CrudPageLayout>

      {/* Dialog Cor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "create" ? <><Palette className="h-5 w-5 text-primary" /> Nova Cor</> : <><Pencil className="h-5 w-5 text-primary" /> Editar Cor</>}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? "Preencha os dados da nova cor." : "Altere os dados da cor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Palette className="h-3.5 w-3.5" /> Nome *</Label>
              <Input value={formData.nome || ""} onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })} placeholder="Ex: AZUL MARINHO" />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Palette className="h-3.5 w-3.5" /> Código Hexadecimal</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={formData.codigo_hex || "#000000"} onChange={(e) => setFormData({ ...formData, codigo_hex: e.target.value })} className="w-12 p-1 h-10 cursor-pointer" />
                <Input value={formData.codigo_hex || "#000000"} onChange={(e) => setFormData({ ...formData, codigo_hex: e.target.value })} className="flex-1 font-mono" maxLength={7} />
                <div className="w-10 h-10 rounded-md border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: formData.codigo_hex || "#000000" }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.nome} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Salvando..." : dialogMode === "create" ? "Adicionar Cor" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir cor"
        description="Tem certeza que deseja excluir esta cor? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />
    </>
  )
}

// ==============================
// Sub-component: Tecidos Tab
// ==============================
function TabTecidos() {
  const [tecidos, setTecidos] = useState<TecidoBase[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<"nome" | "composicao" | null>("nome")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [formData, setFormData] = useState<Partial<TecidoBase>>({ nome: "", composicao: "" })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const data = await tecidoBaseService.listarTodos()
        setTecidos(data)
      } catch (err) {
        console.error("Erro ao carregar tecidos:", err)
        toast.error("Erro ao carregar tecidos")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const toggleSort = (field: "nome" | "composicao") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc")
      else { setSortField(null); setSortDir("asc") }
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const tecidosFiltrados = useMemo(() => {
    return tecidos
      .filter((t) => {
        if (!filtro) return true
        const term = filtro.toLowerCase()
        return t.nome.toLowerCase().includes(term) || t.composicao.toLowerCase().includes(term)
      })
      .sort((a, b) => {
        if (!sortField) return 0
        const va = sortField === "nome" ? a.nome : a.composicao
        const vb = sortField === "nome" ? b.nome : b.composicao
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
      })
  }, [tecidos, filtro, sortField, sortDir])

  useEffect(() => { setCurrentPage(1) }, [filtro])

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const paginados = tecidosFiltrados.slice(startIdx, startIdx + PAGE_SIZE)

  const handleNew = () => {
    setFormData({ nome: "", composicao: "" })
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleEdit = (tecido: TecidoBase) => {
    setFormData({ ...tecido })
    setDialogMode("edit")
    setEditingId(tecido.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.composicao) return
    try {
      setIsLoading(true)
      if (dialogMode === "create") {
        const novo = await tecidoBaseService.adicionar({
          nome: formData.nome.toUpperCase(),
          composicao: formData.composicao.toUpperCase(),
        })
        setTecidos([...tecidos, novo])
        toast.success("Tecido adicionado com sucesso!")
      } else {
        const atualizado = { ...formData, id: editingId!, nome: formData.nome.toUpperCase(), composicao: formData.composicao.toUpperCase() } as TecidoBase
        await tecidoBaseService.atualizar(atualizado)
        setTecidos(tecidos.map((t) => (t.id === editingId ? atualizado : t)))
        toast.success("Tecido atualizado com sucesso!")
      }
      setDialogOpen(false)
    } catch (err) {
      console.error("Erro ao salvar tecido:", err)
      toast.error(`Erro ao salvar tecido: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRequest = (id: string) => {
    setConfirmId(id)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmId) return
    try {
      setIsLoading(true)
      await tecidoBaseService.remover(confirmId)
      setTecidos(tecidos.filter((t) => t.id !== confirmId))
      toast.success("Tecido excluído com sucesso!")
      setConfirmOpen(false)
    } catch (err) {
      console.error("Erro ao remover tecido:", err)
      toast.error(`Erro ao remover tecido: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
      setConfirmOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const SortableHeader = ({ field, children }: { field: "nome" | "composicao"; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/60 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
    </TableHead>
  )

  return (
    <>
      <CrudPageLayout
        title="Tecidos"
        icon={<Shirt className="h-5 w-5" />}
        totalItems={tecidos.length}
        itemLabel="tecidos cadastrados"
        searchValue={filtro}
        onSearchChange={setFiltro}
        searchPlaceholder="Pesquisar por nome ou composição..."
        newButtonLabel="Novo Tecido"
        onNew={handleNew}
        isLoading={isLoading}
        footer={
          <DataPagination
            currentPage={currentPage}
            totalItems={tecidosFiltrados.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        {isLoading && tecidos.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando tecidos...</div>
        ) : tecidosFiltrados.length === 0 ? (
          <EmptyState
            icon={<Shirt className="h-8 w-8" />}
            title={filtro ? "Nenhum tecido encontrado" : "Nenhum tecido cadastrado"}
            description={filtro ? `Nenhum resultado para "${filtro}".` : "Comece adicionando seu primeiro tecido."}
            actionLabel={!filtro ? "Adicionar Primeiro Tecido" : undefined}
            onAction={!filtro ? handleNew : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortableHeader field="nome">Nome</SortableHeader>
                <SortableHeader field="composicao">Composição</SortableHeader>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.map((tecido) => (
                <TableRow key={tecido.id} className="group">
                  <TableCell className="font-medium">{tecido.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{tecido.composicao}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(tecido)} className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={isLoading}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(tecido.id)} className="h-8 w-8 text-muted-foreground hover:text-red-600" disabled={isLoading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CrudPageLayout>

      {/* Dialog Tecido */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "create" ? <><Shirt className="h-5 w-5 text-primary" /> Novo Tecido</> : <><Pencil className="h-5 w-5 text-primary" /> Editar Tecido</>}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? "Preencha os dados do novo tecido." : "Altere os dados do tecido."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Shirt className="h-3.5 w-3.5" /> Nome *</Label>
              <Input value={formData.nome || ""} onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })} placeholder="Ex: BRIM" />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Shirt className="h-3.5 w-3.5" /> Composição *</Label>
              <Input value={formData.composicao || ""} onChange={(e) => setFormData({ ...formData, composicao: e.target.value.toUpperCase() })} placeholder="Ex: 100% ALGODÃO" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.nome || !formData.composicao} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Salvando..." : dialogMode === "create" ? "Adicionar Tecido" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir tecido"
        description="Tem certeza que deseja excluir este tecido? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />
    </>
  )
}

// ==============================
// Sub-component: Tamanhos Tab
// ==============================
function TabTamanhos() {
  const [tiposTamanho, setTiposTamanho] = useState<TipoTamanho[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<"nome" | "descricao" | null>("nome")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [formData, setFormData] = useState<Partial<TipoTamanho>>({ nome: "", descricao: "", tamanhos: [] })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [novoTamanho, setNovoTamanho] = useState("")

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const data = await tipoTamanhoService.listarTodos()
        setTiposTamanho(data)
      } catch (err) {
        console.error("Erro ao carregar tipos de tamanho:", err)
        toast.error("Erro ao carregar tipos de tamanho")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const toggleSort = (field: "nome" | "descricao") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc")
      else { setSortField(null); setSortDir("asc") }
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const filtrados = useMemo(() => {
    return tiposTamanho
      .filter((t) => {
        if (!filtro) return true
        const term = filtro.toLowerCase()
        return t.nome.toLowerCase().includes(term) || t.descricao.toLowerCase().includes(term)
      })
      .sort((a, b) => {
        if (!sortField) return 0
        const va = sortField === "nome" ? a.nome : a.descricao
        const vb = sortField === "nome" ? b.nome : b.descricao
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
      })
  }, [tiposTamanho, filtro, sortField, sortDir])

  useEffect(() => { setCurrentPage(1) }, [filtro])

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const paginados = filtrados.slice(startIdx, startIdx + PAGE_SIZE)

  // Custom size management in dialog
  const adicionarTamanho = () => {
    const val = novoTamanho.trim().toUpperCase()
    if (val && !formData.tamanhos?.includes(val)) {
      setFormData({ ...formData, tamanhos: [...(formData.tamanhos || []), val] })
      setNovoTamanho("")
    }
  }

  const removerTamanho = (t: string) => {
    setFormData({ ...formData, tamanhos: formData.tamanhos?.filter((x) => x !== t) || [] })
  }

  const aplicarTemplate = (template: "padrao" | "numerico" | "infantil") => {
    switch (template) {
      case "padrao":
        setFormData({
          ...formData,
          tamanhos: ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"],
          ...(formData.nome ? {} : { nome: "PADRÃO CUSTOMIZADO", descricao: "PP, P, M, G, GG, G1-G7" }),
        })
        break
      case "numerico":
        setFormData({
          ...formData,
          tamanhos: Array.from({ length: 12 }, (_, i) => (36 + i * 2).toString()),
          ...(formData.nome ? {} : { nome: "NUMÉRICO CUSTOMIZADO", descricao: "36 AO 58 - NÚMEROS PARES" }),
        })
        break
      case "infantil":
        setFormData({
          ...formData,
          tamanhos: Array.from({ length: 14 }, (_, i) => i.toString()),
          ...(formData.nome ? {} : { nome: "INFANTIL CUSTOMIZADO", descricao: "0 AO 13 - TAMANHOS INFANTIS" }),
        })
        break
    }
  }

  const handleNew = () => {
    setFormData({ nome: "", descricao: "", tamanhos: [] })
    setNovoTamanho("")
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleEdit = (tipo: TipoTamanho) => {
    if (["padrao", "numerico", "infantil"].includes(tipo.id)) {
      toast.error("Não é possível editar tipos padrão do sistema.")
      return
    }
    setFormData({ ...tipo })
    setNovoTamanho("")
    setDialogMode("edit")
    setEditingId(tipo.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.descricao || !formData.tamanhos?.length) {
      toast.error("Preencha todos os campos e adicione pelo menos um tamanho.")
      return
    }
    try {
      setIsLoading(true)
      if (dialogMode === "create") {
        const nomeUpper = formData.nome.toUpperCase()
        const existe = tiposTamanho.find((t) => t.nome.toUpperCase() === nomeUpper)
        if (existe) {
          toast.error(`Já existe um tipo de tamanho com o nome "${nomeUpper}".`)
          setIsLoading(false)
          return
        }
        const novo = await tipoTamanhoService.adicionar({
          nome: nomeUpper,
          descricao: formData.descricao.toUpperCase(),
          tamanhos: formData.tamanhos,
        })
        setTiposTamanho([...tiposTamanho, novo])
        toast.success("Tipo de tamanho adicionado com sucesso!")
      } else {
        const atualizado = {
          ...formData,
          id: editingId!,
          nome: formData.nome.toUpperCase(),
          descricao: formData.descricao.toUpperCase(),
        } as TipoTamanho
        await tipoTamanhoService.atualizar(atualizado)
        setTiposTamanho(tiposTamanho.map((t) => (t.id === editingId ? atualizado : t)))
        toast.success("Tipo de tamanho atualizado com sucesso!")
      }
      setDialogOpen(false)
    } catch (err) {
      console.error("Erro ao salvar tipo de tamanho:", err)
      toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRequest = (tipo: TipoTamanho) => {
    if (["padrao", "numerico", "infantil"].includes(tipo.id)) {
      toast.error("Não é possível remover tipos padrão do sistema.")
      return
    }
    setConfirmId(tipo.id)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmId) return
    try {
      setIsLoading(true)
      await tipoTamanhoService.remover(confirmId)
      setTiposTamanho(tiposTamanho.filter((t) => t.id !== confirmId))
      toast.success("Tipo de tamanho excluído com sucesso!")
      setConfirmOpen(false)
    } catch (err) {
      console.error("Erro ao remover tipo de tamanho:", err)
      toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
      setConfirmOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const SortableHeader = ({ field, children }: { field: "nome" | "descricao"; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/60 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
    </TableHead>
  )

  return (
    <>
      <CrudPageLayout
        title="Tipos de Tamanho"
        icon={<Ruler className="h-5 w-5" />}
        totalItems={tiposTamanho.length}
        itemLabel="tipos cadastrados"
        searchValue={filtro}
        onSearchChange={setFiltro}
        searchPlaceholder="Pesquisar por nome ou descrição..."
        newButtonLabel="Novo Tipo"
        onNew={handleNew}
        isLoading={isLoading}
        footer={
          <DataPagination
            currentPage={currentPage}
            totalItems={filtrados.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        {isLoading && tiposTamanho.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando tipos de tamanho...</div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<Ruler className="h-8 w-8" />}
            title={filtro ? "Nenhum tipo encontrado" : "Nenhum tipo de tamanho cadastrado"}
            description={filtro ? `Nenhum resultado para "${filtro}".` : "Comece adicionando seu primeiro tipo de tamanho."}
            actionLabel={!filtro ? "Adicionar Primeiro Tipo" : undefined}
            onAction={!filtro ? handleNew : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortableHeader field="nome">Nome</SortableHeader>
                <SortableHeader field="descricao">Descrição</SortableHeader>
                <TableHead>Tamanhos</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.map((tipo) => (
                <TableRow key={tipo.id} className="group">
                  <TableCell className="font-medium">{tipo.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{tipo.descricao}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {tipo.tamanhos.slice(0, 8).map((t, i) => (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {t}
                        </span>
                      ))}
                      {tipo.tamanhos.length > 8 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          +{tipo.tamanhos.length - 8}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {["padrao", "numerico", "infantil"].includes(tipo.id) ? (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">SISTEMA</span>
                    ) : (
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)} className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={isLoading}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(tipo)} className="h-8 w-8 text-muted-foreground hover:text-red-600" disabled={isLoading}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CrudPageLayout>

      {/* Dialog Tipo de Tamanho */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "create" ? <><Ruler className="h-5 w-5 text-primary" /> Novo Tipo de Tamanho</> : <><Pencil className="h-5 w-5 text-primary" /> Editar Tipo de Tamanho</>}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? "Defina nome, descrição e os tamanhos disponíveis." : "Altere os dados do tipo de tamanho."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Ruler className="h-3.5 w-3.5" /> Nome *</Label>
                <Input value={formData.nome || ""} onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })} placeholder="Ex: PADRÃO" />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Ruler className="h-3.5 w-3.5" /> Descrição *</Label>
                <Input value={formData.descricao || ""} onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })} placeholder="Ex: PP, P, M, G, GG, G1-G7" />
              </div>
            </div>

            {/* Templates */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Templates Rápidos</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate("padrao")} className="text-xs">
                  Padrão (PP ao G7)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate("numerico")} className="text-xs">
                  Numérico (36 ao 58)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate("infantil")} className="text-xs">
                  Infantil (0 ao 13)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, tamanhos: [] })} className="text-xs text-muted-foreground">
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              </div>
            </div>

            {/* Add custom size */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Plus className="h-3.5 w-3.5" /> Tamanho Customizado</Label>
              <div className="flex gap-2">
                <Input
                  value={novoTamanho}
                  onChange={(e) => setNovoTamanho(e.target.value.toUpperCase())}
                  placeholder="Ex: XXG, 60, ESPECIAL..."
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarTamanho() } }}
                />
                <Button type="button" size="sm" onClick={adicionarTamanho} disabled={!novoTamanho.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>

            {/* Selected sizes preview */}
            {formData.tamanhos && formData.tamanhos.length > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
                <Label className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 block">
                  Tamanhos Selecionados: {formData.tamanhos.length}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {formData.tamanhos.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      {t}
                      <button type="button" onClick={() => removerTamanho(t)} className="hover:text-red-600 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.nome || !formData.descricao || !formData.tamanhos?.length} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Salvando..." : dialogMode === "create" ? "Adicionar Tipo" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir tipo de tamanho"
        description="Tem certeza que deseja excluir este tipo de tamanho? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />
    </>
  )
}

// ==============================
// Main Component
// ==============================
export default function GerenciadorMateriais() {
  const [activeTab, setActiveTab] = useState("cores")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Materiais</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Cores, Tecidos e Tamanhos
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cores" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="tecidos" className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            Tecidos
          </TabsTrigger>
          <TabsTrigger value="tamanhos" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Tamanhos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cores" className="pt-4">
          <TabCores />
        </TabsContent>

        <TabsContent value="tecidos" className="pt-4">
          <TabTecidos />
        </TabsContent>

        <TabsContent value="tamanhos" className="pt-4">
          <TabTamanhos />
        </TabsContent>
      </Tabs>
    </div>
  )
}

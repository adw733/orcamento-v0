"use client"

import type React from "react"

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
  Building,
  FileText,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Save,
  Users,
  ChevronUp,
  ChevronDown,
  MapPin,
} from "lucide-react"
import type { Cliente } from "@/types/types"
import { supabase } from "@/lib/supabase"
import { mockClientes } from "@/lib/mock-data"
import { useCurrentUser } from "@/hooks/use-current-user"
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

// Função para obter o próximo código de cliente
const obterProximoCodigoCliente = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("codigo")
      .not("codigo", "is", null)
      .neq("codigo", "")
      .order("codigo", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Erro ao obter o último código do cliente:", error)
      return "C0001"
    }

    if (!data || data.length === 0 || !data[0].codigo) {
      return "C0001"
    }

    const ultimoCodigo = data[0].codigo.trim()
    const numerosApenas = ultimoCodigo.replace(/\D/g, "")

    if (!numerosApenas) {
      console.warn("Formato de código inválido encontrado:", ultimoCodigo)
      return "C0001"
    }

    const proximoCodigoNumerico = Number.parseInt(numerosApenas, 10) + 1

    if (isNaN(proximoCodigoNumerico)) {
      console.warn("Erro ao converter código para número:", ultimoCodigo)
      return "C0001"
    }

    const proximoCodigoFormatado = "C" + String(proximoCodigoNumerico).padStart(4, "0")
    return proximoCodigoFormatado
  } catch (error) {
    console.error("Erro ao obter o próximo código do cliente:", error)
    return "C0001"
  }
}

// Função para atualizar códigos de clientes existentes
const atualizarCodigosClientesExistentes = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: clientesSemCodigo, error } = await supabase
      .from("clientes")
      .select("id, codigo")
      .or("codigo.is.null,codigo.eq.")
      .order("created_at", { ascending: true })

    if (error) throw error

    if (clientesSemCodigo && clientesSemCodigo.length > 0) {
      const { data: ultimoCliente, error: ultimoError } = await supabase
        .from("clientes")
        .select("codigo")
        .not("codigo", "is", null)
        .neq("codigo", "")
        .order("codigo", { ascending: false })
        .limit(1)

      let contador = 1
      if (!ultimoError && ultimoCliente && ultimoCliente.length > 0 && ultimoCliente[0].codigo) {
        const match = ultimoCliente[0].codigo.match(/^C(\d+)$/)
        if (match && match[1]) {
          contador = Number.parseInt(match[1], 10) + 1
        }
      }

      for (const cliente of clientesSemCodigo) {
        const novoCodigo = "C" + String(contador).padStart(4, "0")
        contador++
        await supabase.from("clientes").update({ codigo: novoCodigo }).eq("id", cliente.id)
      }

      return {
        success: true,
        message: `${clientesSemCodigo.length} clientes atualizados com códigos sequenciais.`,
      }
    }

    return { success: true, message: "Todos os clientes já possuem códigos." }
  } catch (error) {
    console.error("Erro ao atualizar códigos de clientes:", error)
    return {
      success: false,
      message: `Erro ao atualizar códigos: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    }
  }
}

// Tipo para ordenação
type SortDirection = "asc" | "desc" | null
type SortField = "codigo" | "nome" | "cnpj" | "telefone" | "email" | null

const PAGE_SIZE = 20

interface GerenciadorClientesProps {
  clientes: Cliente[]
  adicionarCliente: (cliente: Cliente) => void
  setClientes: (clientes: Cliente[]) => void
}

// Estado vazio do formulário
const FORM_VAZIO: Partial<Cliente> = {
  codigo: "",
  nome: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
}

export default function GerenciadorClientes({ clientes, adicionarCliente, setClientes }: GerenciadorClientesProps) {
  const { tenantId } = useCurrentUser()

  // Estados da UI
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState("")
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [formData, setFormData] = useState<Partial<Cliente>>(FORM_VAZIO)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    title: string
    description: string
    onConfirm: () => void
  } | null>(null)

  // Função para alternar ordenação
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Carregar clientes do Supabase ao montar o componente
  useEffect(() => {
    const carregarClientes = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase.from("clientes").select("id, codigo, nome, cnpj, endereco, telefone, email").order("nome")

        if (error) {
          console.warn("Erro ao carregar clientes do Supabase, usando dados mock:", error)
          setClientes(mockClientes)
          return
        }

        if (data) {
          const clientesFormatados: Cliente[] = data.map((cliente) => ({
            id: cliente.id,
            codigo: cliente.codigo || "",
            nome: cliente.nome,
            cnpj: cliente.cnpj || "",
            endereco: cliente.endereco || "",
            telefone: cliente.telefone || "",
            email: cliente.email || "",
          }))
          setClientes(clientesFormatados)
        }
      } catch (error) {
        console.error("Erro ao carregar clientes:", error)
        setClientes(mockClientes)
      } finally {
        setIsLoading(false)
      }
    }

    carregarClientes()
  }, [setClientes])

  // Abrir dialog para novo cliente
  const handleNew = () => {
    setFormData(FORM_VAZIO)
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  // Abrir dialog para editar cliente
  const handleEdit = (cliente: Cliente) => {
    setFormData({ ...cliente })
    setDialogMode("edit")
    setEditingId(cliente.id)
    setDialogOpen(true)
  }

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.nome) return

    try {
      setIsLoading(true)
      setError(null)

      if (dialogMode === "create") {
        const clienteId = generateUUID()
        const codigo = await obterProximoCodigoCliente()

        if (!codigo || codigo === "0NaN") {
          throw new Error("Erro ao gerar código do cliente. Por favor, tente novamente.")
        }

        const { data, error } = await supabase
          .from("clientes")
          .insert({
            id: clienteId,
            codigo,
            nome: formData.nome.toUpperCase(),
            cnpj: formData.cnpj ? formData.cnpj.toUpperCase() : null,
            endereco: formData.endereco ? formData.endereco.toUpperCase() : null,
            telefone: formData.telefone ? formData.telefone.toUpperCase() : null,
            email: formData.email ? formData.email.toUpperCase() : null,
            ...(tenantId ? { tenant_id: tenantId } : {}),
          })
          .select()

        if (error) throw error

        if (data && data[0]) {
          const novoCliente: Cliente = {
            id: data[0].id,
            codigo: data[0].codigo || "",
            nome: data[0].nome,
            cnpj: data[0].cnpj || "",
            endereco: data[0].endereco || "",
            telefone: data[0].telefone || "",
            email: data[0].email || "",
          }
          adicionarCliente(novoCliente)
          toast.success("Cliente adicionado com sucesso!")
        }
      } else {
        // Modo edição
        const { error } = await supabase
          .from("clientes")
          .update({
            nome: formData.nome!.toUpperCase(),
            cnpj: formData.cnpj ? formData.cnpj.toUpperCase() : null,
            endereco: formData.endereco ? formData.endereco.toUpperCase() : null,
            telefone: formData.telefone ? formData.telefone.toUpperCase() : null,
            email: formData.email ? formData.email.toUpperCase() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId!)

        if (error) throw error

        setClientes(
          clientes.map((c) =>
            c.id === editingId
              ? {
                ...c,
                nome: formData.nome!.toUpperCase(),
                cnpj: formData.cnpj?.toUpperCase() || "",
                endereco: formData.endereco?.toUpperCase() || "",
                telefone: formData.telefone?.toUpperCase() || "",
                email: formData.email?.toUpperCase() || "",
              }
              : c
          )
        )
        toast.success("Cliente atualizado com sucesso!")
      }

      setDialogOpen(false)
      setFormData(FORM_VAZIO)
    } catch (error) {
      const supabaseError = error as { message?: string; details?: string }
      const errorMessage =
        error instanceof Error
          ? error.message
          : supabaseError?.message || supabaseError?.details || "Erro desconhecido"
      console.error("Erro ao salvar cliente:", error)
      setError(`Erro ao salvar cliente: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Remover cliente
  const handleDelete = (cliente: Cliente) => {
    setConfirmData({
      title: "Excluir cliente",
      description: `Tem certeza que deseja excluir o cliente "${cliente.nome}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          setIsLoading(true)
          setError(null)

          // Verificar se o cliente está sendo usado em algum orçamento
          const { data: orcamentosRelacionados, error: orcamentosError } = await supabase
            .from("orcamentos")
            .select("id, numero")
            .eq("cliente_id", cliente.id)

          if (orcamentosError) throw orcamentosError

          if (orcamentosRelacionados && orcamentosRelacionados.length > 0) {
            // Cliente tem orçamentos - pedir segunda confirmação
            setConfirmOpen(false)
            setConfirmData({
              title: "Cliente com orçamentos vinculados",
              description: `Este cliente está associado a ${orcamentosRelacionados.length} orçamento(s). Todos esses orçamentos serão excluídos também. Deseja continuar?`,
              onConfirm: async () => {
                try {
                  for (const orcamento of orcamentosRelacionados) {
                    await supabase.from("itens_orcamento").delete().eq("orcamento_id", orcamento.id)
                  }
                  await supabase.from("orcamentos").delete().eq("cliente_id", cliente.id)
                  const { error } = await supabase.from("clientes").delete().eq("id", cliente.id)
                  if (error) throw error
                  setClientes(clientes.filter((c) => c.id !== cliente.id))
                  toast.success("Cliente e orçamentos vinculados excluídos com sucesso!")
                  setConfirmOpen(false)
                } catch (err) {
                  console.error("Erro ao remover cliente:", err)
                  setError(`Erro ao remover: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
                  setConfirmOpen(false)
                } finally {
                  setIsLoading(false)
                }
              },
            })
            setTimeout(() => setConfirmOpen(true), 100)
            return
          }

          // Sem orçamentos - excluir diretamente
          const { error } = await supabase.from("clientes").delete().eq("id", cliente.id)
          if (error) throw error
          setClientes(clientes.filter((c) => c.id !== cliente.id))
          toast.success("Cliente excluído com sucesso!")
          setConfirmOpen(false)
        } catch (error) {
          console.error("Erro ao remover cliente:", error)
          setError(`Erro ao remover: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
          setConfirmOpen(false)
        } finally {
          setIsLoading(false)
        }
      },
    })
    setConfirmOpen(true)
  }

  // Filtrar e ordenar clientes
  const clientesFiltradosEOrdenados = useMemo(() => {
    return clientes
      .filter(
        (cliente) =>
          cliente.nome.toLowerCase().includes(filtro.toLowerCase()) ||
          cliente.codigo.toLowerCase().includes(filtro.toLowerCase()) ||
          cliente.cnpj.toLowerCase().includes(filtro.toLowerCase()) ||
          cliente.email.toLowerCase().includes(filtro.toLowerCase()) ||
          cliente.telefone.toLowerCase().includes(filtro.toLowerCase())
      )
      .sort((a, b) => {
        if (!sortField || !sortDirection) return 0
        const compareStrings = (strA: string, strB: string) =>
          sortDirection === "asc"
            ? strA.localeCompare(strB, "pt-BR", { sensitivity: "base" })
            : strB.localeCompare(strA, "pt-BR", { sensitivity: "base" })

        switch (sortField) {
          case "codigo": return compareStrings(a.codigo, b.codigo)
          case "nome": return compareStrings(a.nome, b.nome)
          case "cnpj": return compareStrings(a.cnpj, b.cnpj)
          case "telefone": return compareStrings(a.telefone, b.telefone)
          case "email": return compareStrings(a.email, b.email)
          default: return 0
        }
      })
  }, [clientes, filtro, sortField, sortDirection])

  // Paginação
  const totalItems = clientesFiltradosEOrdenados.length
  const clientesPaginados = clientesFiltradosEOrdenados.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filtro])

  // Componente para o cabeçalho ordenável
  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/60 transition-colors ${className || ""}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
    </TableHead>
  )

  return (
    <>
      <CrudPageLayout
        title="Clientes"
        icon={<Users className="h-5 w-5" />}
        totalItems={clientes.length}
        itemLabel="clientes cadastrados"
        searchValue={filtro}
        onSearchChange={setFiltro}
        searchPlaceholder="Pesquisar por nome, código, CNPJ, telefone ou email..."
        newButtonLabel="Novo Cliente"
        onNew={handleNew}
        extraActions={
          <Button
            onClick={async () => {
              setIsLoading(true)
              const resultado = await atualizarCodigosClientesExistentes()
              if (resultado.success) {
                toast.success(resultado.message)
                window.location.reload()
              } else {
                toast.error(resultado.message)
              }
              setIsLoading(false)
            }}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="text-muted-foreground"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Atualizar Códigos
          </Button>
        }
        error={error}
        isLoading={isLoading}
        footer={
          <DataPagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        }
      >
        {/* Tabela de Clientes */}
        {isLoading && clientes.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Carregando clientes...
          </div>
        ) : clientesFiltradosEOrdenados.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={filtro ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            description={
              filtro
                ? `Nenhum resultado para "${filtro}". Tente uma pesquisa diferente.`
                : "Comece adicionando seu primeiro cliente para gerenciar seus orçamentos."
            }
            actionLabel={!filtro ? "Adicionar Primeiro Cliente" : undefined}
            onAction={!filtro ? handleNew : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortableHeader field="codigo" className="w-[100px]">Código</SortableHeader>
                <SortableHeader field="nome">Nome</SortableHeader>
                <SortableHeader field="cnpj" className="hidden md:table-cell">CNPJ</SortableHeader>
                <SortableHeader field="telefone" className="hidden md:table-cell">Telefone</SortableHeader>
                <SortableHeader field="email" className="hidden lg:table-cell">Email</SortableHeader>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesPaginados.map((cliente) => (
                <TableRow key={cliente.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {cliente.codigo || "—"}
                  </TableCell>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {cliente.cnpj || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {cliente.telefone || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {cliente.email || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cliente)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        disabled={isLoading}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cliente)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        disabled={isLoading}
                      >
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

      {/* Dialog de Criar/Editar Cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "create" ? (
                <>
                  <Users className="h-5 w-5 text-primary" />
                  Novo Cliente
                </>
              ) : (
                <>
                  <Pencil className="h-5 w-5 text-primary" />
                  Editar Cliente
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Preencha os dados do novo cliente. O código será gerado automaticamente."
                : "Altere os dados do cliente conforme necessário."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Código (somente leitura) */}
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

            {/* Nome */}
            <div>
              <Label htmlFor="dlg-nome" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <Building className="h-3.5 w-3.5" />
                Nome da Empresa *
              </Label>
              <Input
                id="dlg-nome"
                value={formData.nome || ""}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                placeholder="Ex: EMPRESA XYZ LTDA"
              />
            </div>

            {/* CNPJ */}
            <div>
              <Label htmlFor="dlg-cnpj" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" />
                CNPJ
              </Label>
              <Input
                id="dlg-cnpj"
                value={formData.cnpj || ""}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.toUpperCase() })}
                placeholder="Ex: 12.345.678/0001-90"
              />
            </div>

            {/* Endereço */}
            <div>
              <Label htmlFor="dlg-endereco" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Endereço
              </Label>
              <Input
                id="dlg-endereco"
                value={formData.endereco || ""}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value.toUpperCase() })}
                placeholder="Ex: RUA EXEMPLO, 123 - CENTRO"
              />
            </div>

            {/* Telefone + Email lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dlg-telefone" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Telefone
                </Label>
                <Input
                  id="dlg-telefone"
                  value={formData.telefone || ""}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="dlg-email" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="dlg-email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.toUpperCase() })}
                  placeholder="email@empresa.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.nome} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading
                ? "Salvando..."
                : dialogMode === "create"
                  ? "Adicionar Cliente"
                  : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog para exclusão */}
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
    </>
  )
}

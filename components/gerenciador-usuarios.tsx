"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { supabase } from "@/lib/supabase"
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Mail, 
  Shield, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building,
  Key,
  Eye,
  EyeOff,
  UserCog,
  Clock,
  RefreshCw,
  Search,
  MoreVertical,
  Edit,
  ShieldCheck,
  ShieldAlert,
  User,
  Settings,
  Lock
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TenantUser {
  id: string
  user_id: string
  email: string
  nome: string
  role: string
  cargo: string
  status: string
  created_at: string
  last_sign_in?: string
}

export default function GerenciadorUsuarios() {
  const { user, companyName, tenantId } = useCurrentUser()
  const { toast } = useToast()
  
  // Verificar se o usuário atual é administrador
  const isAdmin = user?.app_metadata?.role === 'admin'
  
  const [users, setUsers] = useState<TenantUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [myPasswordDialogOpen, setMyPasswordDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<TenantUser | null>(null)
  const [userToEdit, setUserToEdit] = useState<TenantUser | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("usuarios")
  
  // Form state - Novo usuário
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserNome, setNewUserNome] = useState("")
  const [newUserRole, setNewUserRole] = useState("user")
  const [newUserCargo, setNewUserCargo] = useState("")
  const [formError, setFormError] = useState("")
  
  // Form state - Alterar senha
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  
  // Form state - Editar usuário
  const [editNome, setEditNome] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editCargo, setEditCargo] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (tenantId) {
      loadUsers()
    }
  }, [tenantId])

  // Carregar dados do usuário atual quando mudar de aba para "Minha Conta"
  useEffect(() => {
    if (activeTab === 'minha-conta' && user) {
      setEditNome(user.user_metadata?.nome || user.user_metadata?.full_name || '')
      setEditEmail(user.email || '')
      setEditCargo(user.user_metadata?.cargo || '')
    }
  }, [activeTab, user])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users || [])
      } else {
        console.error('Erro ao carregar usuários:', data.error)
        // Se a tabela não existir, mostrar lista vazia
        setUsers([])
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    setFormError("")
    
    if (!newUserEmail || !newUserPassword) {
      setFormError("Email e senha são obrigatórios")
      return
    }
    
    if (newUserPassword.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres")
      return
    }
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          nome: newUserNome || newUserEmail.split('@')[0],
          role: newUserRole,
          cargo: newUserCargo
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Usuário criado!",
          description: `${newUserEmail} agora pode acessar o sistema.`,
        })
        
        // Limpar form e fechar dialog
        setNewUserEmail("")
        setNewUserPassword("")
        setNewUserNome("")
        setNewUserRole("user")
        setNewUserCargo("")
        setDialogOpen(false)
        
        // Recarregar lista
        loadUsers()
      } else {
        setFormError(data.error || "Erro ao criar usuário")
      }
    } catch (error: any) {
      setFormError(error.message || "Erro ao criar usuário")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      const response = await fetch(`/api/users?userId=${userToDelete.user_id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Usuário removido",
          description: `${userToDelete.email} foi removido do sistema.`,
        })
        
        setDeleteDialogOpen(false)
        setUserToDelete(null)
        loadUsers()
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao remover usuário",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover usuário",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Alterar minha própria senha
  const handleChangeMyPassword = async () => {
    setPasswordError("")
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos")
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres")
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem")
      return
    }
    
    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        setPasswordError(error.message)
        return
      }
      
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      })
      
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMyPasswordDialogOpen(false)
    } catch (error: any) {
      setPasswordError(error.message || "Erro ao alterar senha")
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Resetar senha de outro usuário (admin)
  const handleResetUserPassword = async () => {
    if (!userToEdit) return
    
    setPasswordError("")
    
    if (!newPassword) {
      setPasswordError("Digite a nova senha")
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres")
      return
    }
    
    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToEdit.user_id,
          newPassword: newPassword
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Senha resetada!",
          description: `A senha de ${userToEdit.email} foi alterada.`,
        })
        
        setNewPassword("")
        setPasswordDialogOpen(false)
        setUserToEdit(null)
      } else {
        setPasswordError(data.error || "Erro ao resetar senha")
      }
    } catch (error: any) {
      setPasswordError(error.message || "Erro ao resetar senha")
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Editar usuário
  const handleEditUser = async () => {
    if (!userToEdit) return
    
    setIsEditing(true)
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToEdit.user_id,
          nome: editNome,
          email: editEmail,
          role: editRole,
          cargo: editCargo
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Usuário atualizado!",
          description: `Os dados de ${userToEdit.email} foram atualizados.`,
        })
        
        setEditUserDialogOpen(false)
        setUserToEdit(null)
        loadUsers()
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao atualizar usuário",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive"
      })
    } finally {
      setIsEditing(false)
    }
  }

  // Editar meu próprio perfil
  const handleEditMyProfile = async () => {
    if (!user) return
    
    setIsEditing(true)
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          nome: editNome,
          email: editEmail,
          cargo: editCargo
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Perfil atualizado!",
          description: "Suas informações foram salvas com sucesso.",
        })
        
        // Recarregar lista de usuários para refletir mudanças
        loadUsers()
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao atualizar perfil",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive"
      })
    } finally {
      setIsEditing(false)
    }
  }

  // Filtrar usuários
  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estatísticas
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const adminUsers = users.filter(u => u.role === 'admin').length

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header com estatísticas */}
        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Gerenciar Usuários</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4" />
                      {companyName || "Sua Empresa"}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {/* Cards de estatísticas */}
          <div className="flex gap-4">
            <Card className="min-w-[140px]">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[140px]">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeUsers}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[140px]">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{adminUsers}</p>
                    <p className="text-xs text-muted-foreground">Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="usuarios" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="minha-conta" className="gap-2">
              <Settings className="h-4 w-4" />
              Minha Conta
            </TabsTrigger>
          </TabsList>

          {/* Tab: Usuários */}
          <TabsContent value="usuarios" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  {/* Busca */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadUsers}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                    {isAdmin && (
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Adicionar Usuário
                          </Button>
                        </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                          <DialogDescription>
                            Crie um novo usuário para acessar o sistema da {companyName}.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          {formError && (
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              {formError}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label htmlFor="nome">Nome</Label>
                            <Input
                              id="nome"
                              placeholder="Nome do usuário"
                              value={newUserNome}
                              onChange={(e) => setNewUserNome(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="usuario@email.com"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="password">Senha *</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Mínimo 6 caracteres"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="cargo">Cargo</Label>
                            <Input
                              id="cargo"
                              placeholder="Ex: Gerente, Vendedor, Analista..."
                              value={newUserCargo}
                              onChange={(e) => setNewUserCargo(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="role">Função no Sistema</Label>
                            <Select value={newUserRole} onValueChange={setNewUserRole}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Usuário
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Administrador
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Administradores podem gerenciar outros usuários.
                            </p>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCreateUser} disabled={isCreating}>
                            {isCreating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Criando...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Criar Usuário
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">
                      {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário adicional"}
                    </p>
                    <p className="text-sm mt-1">
                      {searchTerm 
                        ? "Tente buscar com outros termos." 
                        : "Clique em \"Adicionar Usuário\" para convidar pessoas."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((tenantUser) => (
                          <TableRow key={tenantUser.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {tenantUser.nome?.charAt(0).toUpperCase() || tenantUser.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{tenantUser.nome || "Sem nome"}</p>
                                  {tenantUser.user_id === user?.id && (
                                    <Badge variant="outline" className="text-xs">Você</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="text-foreground">{tenantUser.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">
                                {tenantUser.cargo || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={tenantUser.role === 'admin' ? 'default' : 'secondary'}>
                                {tenantUser.role === 'admin' ? (
                                  <><ShieldCheck className="h-3 w-3 mr-1" /> Admin</>
                                ) : (
                                  <><User className="h-3 w-3 mr-1" /> Usuário</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={tenantUser.status === 'active' ? 'default' : 'secondary'} 
                                     className={tenantUser.status === 'active' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}>
                                {tenantUser.status === 'active' ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                                ) : (
                                  tenantUser.status
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {isAdmin && tenantUser.user_id !== user?.id ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => {
                                      setUserToEdit(tenantUser)
                                      setNewPassword("")
                                      setPasswordError("")
                                      setPasswordDialogOpen(true)
                                    }}>
                                      <Key className="h-4 w-4 mr-2" />
                                      Resetar Senha
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setUserToDelete(tenantUser)
                                        setDeleteDialogOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remover
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Minha Conta */}
          <TabsContent value="minha-conta" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Informações da conta - Editável */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Meus Dados
                  </CardTitle>
                  <CardDescription>
                    Edite suas informações pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {(user?.user_metadata?.nome || user?.email)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-lg">{user?.user_metadata?.nome || user?.email?.split('@')[0]}</p>
                      <Badge variant="secondary" className="mt-1">
                        {user?.app_metadata?.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="my-nome">Nome</Label>
                      <Input
                        id="my-nome"
                        placeholder="Seu nome completo"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="my-email">Email</Label>
                      <Input
                        id="my-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="my-cargo">Cargo</Label>
                      <Input
                        id="my-cargo"
                        placeholder="Ex: Gerente, Vendedor, Analista..."
                        value={editCargo}
                        onChange={(e) => setEditCargo(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-muted-foreground">
                        Empresa: <strong>{companyName}</strong>
                      </span>
                      <Button onClick={handleEditMyProfile} disabled={isEditing}>
                        {isEditing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Segurança */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Segurança
                  </CardTitle>
                  <CardDescription>
                    Gerencie sua senha e segurança da conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Senha</p>
                        <p className="text-sm text-muted-foreground">
                          Altere sua senha regularmente para manter sua conta segura.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setCurrentPassword("")
                          setNewPassword("")
                          setConfirmPassword("")
                          setPasswordError("")
                          setMyPasswordDialogOpen(true)
                        }}
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Email de acesso</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verificado
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Último acesso</span>
                      <span>{user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Dialog: Alterar minha senha */}
        <Dialog open={myPasswordDialogOpen} onOpenChange={setMyPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Minha Senha</DialogTitle>
              <DialogDescription>
                Digite sua senha atual e a nova senha desejada.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {passwordError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setMyPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleChangeMyPassword} disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Resetar senha de usuário */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resetar Senha</DialogTitle>
              <DialogDescription>
                Defina uma nova senha para <strong>{userToEdit?.email}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {passwordError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleResetUserPassword} disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Resetar Senha
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Confirmação de exclusão */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Remover Usuário
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover <strong>{userToDelete?.email}</strong>?
                Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

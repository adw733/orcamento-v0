"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar as CalendarIcon,
  Filter,
  BarChart3
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

interface MovimentacaoFinanceira {
  id: string
  data: string
  tipo: 'Despesa' | 'Receita'
  sub_categoria: string
  categoria: string
  descricao: string
  valor: number
  conta: 'Andrew' | 'Claudomir' | 'Elma' | 'Giulia'
  created_at?: string
}

export default function GerenciadorGastosReceitas() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceira[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [subCategorias, setSubCategorias] = useState<string[]>([])
  const [contas, setContas] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [movimentacaoEditando, setMovimentacaoEditando] = useState<MovimentacaoFinanceira | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Receita' | 'Despesa'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroConta, setFiltroConta] = useState<string>('todas')
  const [dataInicio, setDataInicio] = useState<Date>()
  const [dataFim, setDataFim] = useState<Date>()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState<Omit<MovimentacaoFinanceira, 'id' | 'created_at'>>({
    tipo: 'Receita',
    categoria: '',
    sub_categoria: '',
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    conta: 'Andrew',
  })

  useEffect(() => {
    carregarMovimentacoes()
    carregarOpcoesFiltros()
  }, [])

  const carregarMovimentacoes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('gastos_receitas')
        .select('*')
        .order('data', { ascending: false })

      if (error) throw error
      setMovimentacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as movimentações financeiras.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const carregarOpcoesFiltros = async () => {
    try {
      const { data: catData, error: catError } = await supabase.from('gastos_receitas').select('categoria')
      if (catError) throw catError
      setCategorias([...new Set(catData.map(item => item.categoria))])

      const { data: subCatData, error: subCatError } = await supabase.from('gastos_receitas').select('sub_categoria')
      if (subCatError) throw subCatError
      setSubCategorias([...new Set(subCatData.map(item => item.sub_categoria))])

      const { data: contaData, error: contaError } = await supabase.from('gastos_receitas').select('conta')
      if (contaError) throw contaError
      setContas([...new Set(contaData.map(item => item.conta))])

    } catch (error) {
      console.error('Erro ao carregar opções de filtros:', error)
    }
  }

  const salvarMovimentacao = async () => {
    if (!formData.categoria || !formData.sub_categoria || !formData.descricao || !formData.valor) {
      toast({
        title: "Erro de Validação",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const dataToSave = {
        ...formData,
        valor: formData.tipo === 'Despesa' && formData.valor > 0 ? -formData.valor : formData.valor
      }

      if (movimentacaoEditando) {
        const { error } = await supabase
          .from('gastos_receitas')
          .update(dataToSave)
          .eq('id', movimentacaoEditando.id)
        if (error) throw error
        toast({ title: "Sucesso", description: "Movimentação atualizada." })
      } else {
        const { error } = await supabase
          .from('gastos_receitas')
          .insert([dataToSave])
        if (error) throw error
        toast({ title: "Sucesso", description: "Movimentação criada." })
      }

      await carregarMovimentacoes()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a movimentação.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const excluirMovimentacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('gastos_receitas')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast({ title: "Sucesso", description: "Movimentação excluída." })
      await carregarMovimentacoes()
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a movimentação.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const abrirModal = (movimentacao?: MovimentacaoFinanceira) => {
    if (movimentacao) {
      setMovimentacaoEditando(movimentacao)
      setFormData({
        ...movimentacao,
        data: format(new Date(movimentacao.data), 'yyyy-MM-dd')
      })
    } else {
      setMovimentacaoEditando(null)
      setFormData({
        tipo: 'Receita',
        categoria: '',
        sub_categoria: '',
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        conta: 'Andrew',
      })
    }
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setMovimentacaoEditando(null)
  }

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(mov => {
      if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return false
      if (filtroCategoria !== 'todas' && mov.categoria !== filtroCategoria) return false
      if (filtroConta !== 'todas' && mov.conta !== filtroConta) return false
      const dataMov = new Date(mov.data)
      if (dataInicio && dataMov < dataInicio) return false
      if (dataFim && dataMov > dataFim) return false
      return true
    })
  }, [movimentacoes, filtroTipo, filtroCategoria, filtroConta, dataInicio, dataFim])

  const totalReceitas = useMemo(() => 
    movimentacoesFiltradas
      .filter(mov => mov.tipo === 'Receita')
      .reduce((acc, mov) => acc + mov.valor, 0),
  [movimentacoesFiltradas])

  const totalGastos = useMemo(() =>
    movimentacoesFiltradas
      .filter(mov => mov.tipo === 'Despesa')
      .reduce((acc, mov) => acc + mov.valor, 0),
  [movimentacoesFiltradas])

  const saldoLiquido = totalReceitas + totalGastos

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatarMoeda(totalReceitas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatarMoeda(totalGastos)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatarMoeda(saldoLiquido)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nº de Transações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movimentacoesFiltradas.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros e Ações
            </CardTitle>
            <Button onClick={() => abrirModal()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Movimentação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={filtroTipo} onValueChange={(value: any) => setFiltroTipo(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Receita">Receitas</SelectItem>
                <SelectItem value="Despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Conta</Label>
            <Select value={filtroConta} onValueChange={setFiltroConta}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {contas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label>Data Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataFim} onSelect={setDataFim} /></PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detalhes das Movimentações</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Sub Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
              ) : movimentacoesFiltradas.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{format(new Date(mov.data), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    <Badge variant={mov.tipo === 'Receita' ? 'default' : 'destructive'}>
                      {mov.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{mov.categoria}</TableCell>
                  <TableCell>{mov.sub_categoria}</TableCell>
                  <TableCell className="font-medium">{mov.descricao}</TableCell>
                  <TableCell>{mov.conta}</TableCell>
                  <TableCell className={`text-right font-semibold ${mov.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatarMoeda(mov.valor)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => abrirModal(mov)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => excluirMovimentacao(mov.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={fecharModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{movimentacaoEditando ? 'Editar' : 'Nova'} Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Conta *</Label>
                <Select value={formData.conta} onValueChange={(v: any) => setFormData({...formData, conta: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoria *</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sub Categoria *</Label>
                <Select value={formData.sub_categoria} onValueChange={(v) => setFormData({...formData, sub_categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subCategorias.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor *</Label>
                <Input type="number" value={formData.valor} onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
              <Button onClick={salvarMovimentacao} disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

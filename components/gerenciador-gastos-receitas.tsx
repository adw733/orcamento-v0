"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { format, getYear, startOfYear, endOfYear } from "date-fns"
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
  const [anos, setAnos] = useState<number[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState<number | 'todos'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [movimentacaoEditando, setMovimentacaoEditando] = useState<MovimentacaoFinanceira | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Receita' | 'Despesa'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroConta, setFiltroConta] = useState<string>('todas')
  const [dataInicio, setDataInicio] = useState<Date>()
  const [dataFim, setDataFim] = useState<Date>()
  const [isLoading, setIsLoading] = useState(true)
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

  const [sortColumn, setSortColumn] = useState<keyof MovimentacaoFinanceira | null>('data');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const inicializar = async () => {
      await carregarAnos()
      await carregarOpcoesFiltros()
    }
    inicializar()
  }, [])

  useEffect(() => {
    carregarMovimentacoes()
  }, [dataInicio, dataFim])

  const carregarMovimentacoes = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('gastos_receitas').select('*')

      if (dataInicio) {
        query = query.gte('data', dataInicio.toISOString())
      }
      if (dataFim) {
        query = query.lte('data', dataFim.toISOString())
      }

      const { data, error } = await query.order('data', { ascending: false })

      if (error) throw error
      setMovimentacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
      toast({ title: "Erro", description: "Não foi possível carregar as movimentações.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const carregarAnos = async () => {
    try {
      const { data, error } = await supabase.from('gastos_receitas').select('data')
      if (error) throw error
      const years = [...new Set(data.map(item => getYear(new Date(item.data))))].sort((a, b) => b - a)
      setAnos(years)
      if (years.length > 0) {
        setAnoSelecionado(years[0])
        handleFiltroAno(years[0])
      }
    } catch (error) {
      console.error('Erro ao carregar anos:', error)
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

  const handleFiltroAno = (ano: number | 'todos') => {
    setAnoSelecionado(ano)
    if (ano === 'todos') {
      setDataInicio(undefined)
      setDataFim(undefined)
    } else {
      setDataInicio(startOfYear(new Date(ano, 0, 1)))
      setDataFim(endOfYear(new Date(ano, 11, 31)))
    }
  }

  const salvarMovimentacao = async () => {
    // ... (função inalterada)
  }

  const excluirMovimentacao = async (id: string) => {
    // ... (função inalterada)
  }

  const abrirModal = (movimentacao?: MovimentacaoFinanceira) => {
    // ... (função inalterada)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setMovimentacaoEditando(null)
  }

  const handleSort = (column: keyof MovimentacaoFinanceira) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(mov => {
      if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return false
      if (filtroCategoria !== 'todas' && mov.categoria !== filtroCategoria) return false
      if (filtroConta !== 'todas' && mov.conta !== filtroConta) return false
      return true
    })
  }, [movimentacoes, filtroTipo, filtroCategoria, filtroConta])

  const sortedMovimentacoes = useMemo(() => {
    if (!sortColumn) return movimentacoesFiltradas;

    return [...movimentacoesFiltradas].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [movimentacoesFiltradas, sortColumn, sortDirection]);

  const totalReceitas = useMemo(() => movimentacoesFiltradas.filter(mov => mov.tipo === 'Receita').reduce((acc, mov) => acc + mov.valor, 0), [movimentacoesFiltradas])
  const totalGastos = useMemo(() => movimentacoesFiltradas.filter(mov => mov.tipo === 'Despesa').reduce((acc, mov) => acc + mov.valor, 0), [movimentacoesFiltradas])
  const saldoLiquido = totalReceitas + totalGastos

  const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      {/* ... */}

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros e Ações
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleFiltroAno('todos')} variant={anoSelecionado === 'todos' ? 'default' : 'outline'}>Todos</Button>
              {anos.map(ano => (
                <Button key={ano} onClick={() => handleFiltroAno(ano)} variant={anoSelecionado === ano ? 'default' : 'outline'}>{ano}</Button>
              ))}
              <Button onClick={() => abrirModal()} className="flex items-center gap-2 ml-4">
                <Plus className="h-4 w-4" />
                Nova Movimentação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader><CardTitle>Detalhes das Movimentações</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('data')}>
                  Data {sortColumn === 'data' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('tipo')}>
                  Tipo {sortColumn === 'tipo' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('categoria')}>
                  Categoria {sortColumn === 'categoria' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('sub_categoria')}>
                  Sub Categoria {sortColumn === 'sub_categoria' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('descricao')}>
                  Descrição {sortColumn === 'descricao' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('conta')}>
                  Conta {sortColumn === 'conta' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('valor')}>
                  Valor {sortColumn === 'valor' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
              ) : sortedMovimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{format(new Date(mov.data), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell><Badge variant={mov.tipo === 'Receita' ? 'default' : 'destructive'}>{mov.tipo}</Badge></TableCell>
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

      {/* Modal */}
      {/* ... */}
    </div>
  )
}
"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { format, getYear, getMonth, parseISO, startOfYear, endOfYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import type { Orcamento } from "@/types/types"

interface Periodo {
  ano: number;
  mes: number;
}

interface MovimentacaoFinanceira {
  id: string
  sequential_id?: number
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
  const [orcamentos, setOrcamentos] = useState<Partial<Orcamento>[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [subCategorias, setSubCategorias] = useState<string[]>([])
  const [contas, setContas] = useState<string[]>([])
  const [anos, setAnos] = useState<number[]>([])
  const [periodosSelecionados, setPeriodosSelecionados] = useState<Periodo[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [movimentacaoEditando, setMovimentacaoEditando] = useState<MovimentacaoFinanceira | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Receita' | 'Despesa'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroConta, setFiltroConta] = useState<string>('todas')
  const [mostrarReceitasFuturas, setMostrarReceitasFuturas] = useState(true)
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
      await carregarDados()
      await carregarOpcoesFiltros()
    }
    inicializar()
  }, [])

  const carregarDados = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('gastos_receitas')
        .select('*')
        .order('data', { ascending: false })

      if (error) throw error
      setMovimentacoes(data || [])

      // Carregar orçamentos para receitas futuras
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('*')
        .in('status', ['2', '3', '4'])

      if (!orcamentosError) {
        setOrcamentos(orcamentosData || [])
      }

      const years = [...new Set(data.map(item => getYear(parseISO(item.data))))].sort((a, b) => b - a)
      setAnos(years)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" })
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

  const mesesAbreviados = useMemo(() => ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"], []);

  const togglePeriodo = (ano: number, mes: number) => {
    setPeriodosSelecionados((prev) => {
      const exists = prev.some(p => p.ano === ano && p.mes === mes);
      if (exists) {
        return prev.filter(p => !(p.ano === ano && p.mes === mes));
      } else {
        const novoPeriodo = [...prev, { ano, mes }];
        return novoPeriodo.sort((a, b) => {
          if (a.ano !== b.ano) return a.ano - b.ano;
          return a.mes - b.mes;
        });
      }
    });
  };

  const selecionarAnoCompleto = (ano: number) => {
    const novoPeriodos = [...periodosSelecionados];
    for (let mes = 0; mes < 12; mes++) {
      const existe = novoPeriodos.some(p => p.ano === ano && p.mes === mes);
      if (!existe) {
        novoPeriodos.push({ ano, mes });
      }
    }
    novoPeriodos.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });
    setPeriodosSelecionados(novoPeriodos);
  };

  const selecionarUltimosMeses = (quantidade: number) => {
    const hoje = new Date();
    const periodos: Periodo[] = [];
    for (let i = 0; i < quantidade; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      periodos.push({ ano: getYear(data), mes: getMonth(data) });
    }
    setPeriodosSelecionados(periodos.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    }));
  };


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
    // Cria receitas futuras virtuais
    const receitasFuturas: MovimentacaoFinanceira[] = mostrarReceitasFuturas ? orcamentos.map(orc => {
      // Calcula valor total do orçamento
      let itensObj = orc.itens;
      if (typeof itensObj === 'string') {
        try { itensObj = JSON.parse(itensObj); } catch (e) { itensObj = []; }
      }

      // Extrai o array de itens (pode estar em itens.items ou direto em itens)
      let itens: any[] = [];
      if (itensObj && typeof itensObj === 'object') {
        if (Array.isArray(itensObj)) {
          itens = itensObj;
        } else if (itensObj.items && Array.isArray(itensObj.items)) {
          itens = itensObj.items;
        }
      }

      const valorItens = itens.reduce((total, item) => {
        const valorItem = (item.valorUnitario || 0) * (item.quantidade || 0);
        return total + valorItem;
      }, 0);
      const valor = valorItens + (orc.valorFrete || 0);

      // Calcula data projetada (90 dias)
      const dataOriginal = new Date(orc.data || new Date());
      dataOriginal.setDate(dataOriginal.getDate() + 90);
      const dataProjetada = dataOriginal.toISOString().split('T')[0];

      // Parse cliente para pegar o nome
      let clienteNome = 'Cliente não identificado';
      if (orc.cliente) {
        if (typeof orc.cliente === 'string') {
          try { clienteNome = JSON.parse(orc.cliente).nome || clienteNome; } catch (e) {}
        } else if (typeof orc.cliente === 'object') {
          clienteNome = orc.cliente.nome || clienteNome;
        }
      }

      // Formata descrição: numero - NOME CLIENTE - CONTATO
      const numero = orc.numero || '0000';
      const nomeContato = orc.nomeContato || '';
      const descricao = nomeContato
        ? `${numero} - ${clienteNome.toUpperCase()} - ${nomeContato.toUpperCase()}`
        : `${numero} - ${clienteNome.toUpperCase()}`;

      return {
        id: `futuro-${orc.id}`,
        data: dataProjetada,
        tipo: 'Receita' as const,
        categoria: 'Recebimento',
        sub_categoria: 'Receita Futura',
        descricao,
        valor,
        conta: 'Andrew' as const
      };
    }) : [];

    const todasMovimentacoes = [...movimentacoes, ...receitasFuturas];

    return todasMovimentacoes.filter(mov => {
      // Filtro de período
      if (periodosSelecionados.length > 0) {
        const data = parseISO(mov.data);
        const ano = getYear(data);
        const mes = getMonth(data);
        if (!periodosSelecionados.some(p => p.ano === ano && p.mes === mes)) return false;
      }
      if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return false
      if (filtroCategoria !== 'todas' && mov.categoria !== filtroCategoria) return false
      if (filtroConta !== 'todas' && mov.conta !== filtroConta) return false
      return true
    })
  }, [movimentacoes, orcamentos, mostrarReceitasFuturas, filtroTipo, filtroCategoria, filtroConta, periodosSelecionados])

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
  const totalGastos = useMemo(() => movimentacoesFiltradas.filter(mov => mov.tipo === 'Despesa').reduce((acc, mov) => acc + Math.abs(mov.valor), 0), [movimentacoesFiltradas])
  const saldoLiquido = totalReceitas - totalGastos

  const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatarMoeda(totalReceitas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
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
            <div className={`text-2xl font-bold ${saldoLiquido >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>{formatarMoeda(saldoLiquido)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros e Ações
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Filtrar Período
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Selecionar Períodos</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Atalhos rápidos */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Atalhos:</span>
                      <Button onClick={() => selecionarUltimosMeses(3)} variant="outline" size="sm" className="text-xs h-7">
                        Últimos 3 meses
                      </Button>
                      <Button onClick={() => selecionarUltimosMeses(6)} variant="outline" size="sm" className="text-xs h-7">
                        Últimos 6 meses
                      </Button>
                      <Button onClick={() => {
                        const anoAtual = new Date().getFullYear();
                        selecionarAnoCompleto(anoAtual);
                      }} variant="outline" size="sm" className="text-xs h-7">
                        Ano atual
                      </Button>
                    </div>

                    {/* Grid de anos e meses */}
                    <div className="space-y-4">
                      {anos.map(ano => (
                        <div key={ano} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-muted-foreground">{ano}</div>
                            <Button
                              onClick={() => {
                                const isCompleto = periodosSelecionados.filter(p => p.ano === ano).length === 12;
                                if (isCompleto) {
                                  setPeriodosSelecionados(prev => prev.filter(p => p.ano !== ano));
                                } else {
                                  selecionarAnoCompleto(ano);
                                }
                              }}
                              variant={periodosSelecionados.filter(p => p.ano === ano).length === 12 ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs h-7"
                            >
                              {periodosSelecionados.filter(p => p.ano === ano).length === 12 ? '✓ Ano Completo' : 'Selecionar Todos'}
                            </Button>
                          </div>
                          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                            {mesesAbreviados.map((mes, mesIndex) => (
                              <Button
                                key={`${ano}-${mesIndex}`}
                                onClick={() => togglePeriodo(ano, mesIndex)}
                                variant={periodosSelecionados.some(p => p.ano === ano && p.mes === mesIndex) ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs"
                              >
                                {mes}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {periodosSelecionados.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {periodosSelecionados.length} {periodosSelecionados.length === 1 ? 'período' : 'períodos'} selecionado{periodosSelecionados.length > 1 ? 's' : ''}
                </Badge>
              )}

              <Button onClick={() => abrirModal()} className="flex items-center gap-2 ml-auto">
                <Plus className="h-4 w-4" />
                Nova Movimentação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
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
                <TableHead className="cursor-pointer" onClick={() => handleSort('sequential_id')}>
                  Nº {sortColumn === 'sequential_id' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 inline" /> : <ArrowDown className="h-4 w-4 inline" />)}
                </TableHead>
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
                <TableRow><TableCell colSpan={9} className="text-center">Carregando...</TableCell></TableRow>
              ) : sortedMovimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{mov.sequential_id}</TableCell>
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
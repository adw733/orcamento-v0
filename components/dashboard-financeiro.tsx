"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { useCurrentUser } from "@/hooks/use-current-user"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, LabelList } from 'recharts';
import { getMonth, getYear, parseISO, startOfYear, endOfYear } from 'date-fns';
import { Info, X, Calendar, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import type { Orcamento } from "@/types/types"

interface Movimentacao {
  id: string;
  data: string;
  tipo: 'Receita' | 'Despesa';
  categoria: string;
  sub_categoria: string;
  valor: number;
  descricao: string;
}

interface Periodo {
  ano: number;
  mes: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const LIGHT_COLORS = ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#6ee7b7', '#fde047'];

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

// Função para estimar a largura do texto em pixels
const estimarLarguraTexto = (texto: string, fontSize: number = 11): number => {
  // Aproximação: cada caractere tem ~0.6x o tamanho da fonte em pixels
  // Para fontes bold, adiciona-se ~10% extra
  const caracterePorPixel = 0.6;
  const boldMultiplier = 1.1;
  return texto.length * fontSize * caracterePorPixel * boldMultiplier;
};

export default function DashboardFinanceiro() {
  const { tenantId } = useCurrentUser();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [orcamentos, setOrcamentos] = useState<Partial<Orcamento>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anos, setAnos] = useState<number[]>([]);
  const [periodosSelecionados, setPeriodosSelecionados] = useState<Periodo[]>([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [consolidarReceitasFuturas, setConsolidarReceitasFuturas] = useState(false);

  useEffect(() => {
    if (tenantId) {
      carregarDados();
    }
  }, [tenantId]);

  const carregarDados = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      // Carrega movimentações filtradas por tenant_id
      const { data, error } = await supabase
        .from('gastos_receitas')
        .select('id, data, tipo, categoria, sub_categoria, valor, descricao')
        .eq('tenant_id', tenantId)
        .order('data', { ascending: true });

      if (error) throw error;

      setMovimentacoes(data || []);

      // Carrega orçamentos com status 2 (Entregue), 3 (Cobrança) ou 4 (Em Execução) filtrados por tenant_id
      const { data: orcamentosData, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['2', '3', '4']);

      if (orcamentosError) {
        console.error("Erro ao carregar orçamentos:", orcamentosError);
      } else {
        setOrcamentos(orcamentosData || []);
      }

      // Extrai anos únicos dos dados
      const years = [...new Set((data || []).map(item => getYear(parseISO(item.data))))].sort((a, b) => b - a);
      setAnos(years);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePeriodo = (ano: number, mes: number) => {
    setPeriodosSelecionados((prev) => {
      const exists = prev.some(p => p.ano === ano && p.mes === mes);

      if (exists) {
        // Remove o período
        return prev.filter(p => !(p.ano === ano && p.mes === mes));
      } else {
        // Adiciona e ordena
        const novoPeriodo = [...prev, { ano, mes }];
        return novoPeriodo.sort((a, b) => {
          if (a.ano !== b.ano) return a.ano - b.ano;
          return a.mes - b.mes;
        });
      }
    });
  };

  const limparPeriodos = () => {
    setPeriodosSelecionados([]);
  };

  const isPeriodoSelecionado = (ano: number, mes: number): boolean => {
    return periodosSelecionados.some(p => p.ano === ano && p.mes === mes);
  };

  const selecionarUltimos3Meses = () => {
    const hoje = new Date();
    const periodos: Periodo[] = [];

    for (let i = 2; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      periodos.push({ ano: getYear(data), mes: getMonth(data) });
    }

    setPeriodosSelecionados(periodos);
  };

  const selecionarUltimos6Meses = () => {
    const hoje = new Date();
    const periodos: Periodo[] = [];

    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      periodos.push({ ano: getYear(data), mes: getMonth(data) });
    }

    setPeriodosSelecionados(periodos);
  };

  const selecionarAnoAtual = () => {
    const anoAtual = new Date().getFullYear();
    const periodos: Periodo[] = [];

    for (let mes = 0; mes < 12; mes++) {
      periodos.push({ ano: anoAtual, mes });
    }

    setPeriodosSelecionados(periodos);
  };

  const selecionarAnoCompleto = (ano: number) => {
    const novoPeriodos = [...periodosSelecionados];

    // Adiciona todos os meses do ano que não estão selecionados
    for (let mes = 0; mes < 12; mes++) {
      const existe = novoPeriodos.some(p => p.ano === ano && p.mes === mes);
      if (!existe) {
        novoPeriodos.push({ ano, mes });
      }
    }

    // Ordena
    novoPeriodos.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });

    setPeriodosSelecionados(novoPeriodos);
  };

  const desmarcarAnoCompleto = (ano: number) => {
    setPeriodosSelecionados(prev => prev.filter(p => p.ano !== ano));
  };

  const isAnoCompleto = (ano: number): boolean => {
    const mesesDoAno = periodosSelecionados.filter(p => p.ano === ano);
    return mesesDoAno.length === 12;
  };

  const formatarPeriodosResumo = (): string => {
    if (periodosSelecionados.length === 0) return 'Todos os períodos';
    if (periodosSelecionados.length > 6) return `${periodosSelecionados.length} meses selecionados`;

    // Verifica se é um ano completo
    const anos = [...new Set(periodosSelecionados.map(p => p.ano))];
    if (anos.length === 1 && periodosSelecionados.length === 12) {
      return `Todo ${anos[0]}`;
    }

    // Mostra resumo dos períodos
    return periodosSelecionados
      .slice(0, 3)
      .map(p => `${mesesAbreviados[p.mes]}/${p.ano}`)
      .join(', ') + (periodosSelecionados.length > 3 ? '...' : '');
  };
  const mesesAbreviados = useMemo(() => ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"], []);

  const processedData = useMemo(() => {
    // Filtra movimentações pelos períodos selecionados
    const movs = periodosSelecionados.length === 0
      ? movimentacoes
      : movimentacoes.filter(m => {
          const data = parseISO(m.data);
          const ano = getYear(data);
          const mes = getMonth(data);
          return periodosSelecionados.some(p => p.ano === ano && p.mes === mes);
        });

    // Calcula receitas futuras dos orçamentos (status 2, 3, 4)
    const calcularValorOrcamento = (orc: Partial<Orcamento>) => {
      // Parse itens se vier como string JSON
      let itensObj = orc.itens;
      if (typeof itensObj === 'string') {
        try {
          itensObj = JSON.parse(itensObj);
        } catch (e) {
          console.error('Erro ao parsear itens:', e);
          return 0;
        }
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

      if (!itens || itens.length === 0) {
        return 0;
      }

      const valorItens = itens.reduce((total, item) => {
        const valorItem = (item.valorUnitario || 0) * (item.quantidade || 0);
        return total + valorItem;
      }, 0);

      const valorTotal = valorItens + (orc.valorFrete || 0);
      return valorTotal;
    };

    const calcularDataProjetada = (dataOrcamento: string) => {
      const data = new Date(dataOrcamento);
      data.setDate(data.getDate() + 90); // Adiciona 90 dias
      return data.toISOString().split('T')[0];
    };

    const receitasFuturas = orcamentos.map(orc => {
      const valor = calcularValorOrcamento(orc);

      // Parse cliente se vier como string JSON
      let clienteNome = 'Cliente não identificado';
      if (orc.cliente) {
        if (typeof orc.cliente === 'string') {
          try {
            const clienteObj = JSON.parse(orc.cliente);
            clienteNome = clienteObj.nome || 'Cliente não identificado';
          } catch (e) {
            clienteNome = 'Cliente não identificado';
          }
        } else if (typeof orc.cliente === 'object') {
          clienteNome = orc.cliente.nome || 'Cliente não identificado';
        }
      }

      return {
        id: orc.id || '',
        numero: orc.numero || '',
        dataOriginal: orc.data || '',
        dataProjetada: calcularDataProjetada(orc.data || new Date().toISOString()),
        valor,
        cliente: clienteNome,
        status: orc.status
      };
    });

    // Filtra receitas futuras pelos períodos selecionados (se houver)
    const receitasFuturasFiltradas = periodosSelecionados.length === 0
      ? receitasFuturas
      : receitasFuturas.filter(rf => {
          const data = parseISO(rf.dataProjetada);
          const ano = getYear(data);
          const mes = getMonth(data);
          return periodosSelecionados.some(p => p.ano === ano && p.mes === mes);
        });

    const receitaFutura = receitasFuturasFiltradas.reduce((acc, rf) => acc + rf.valor, 0);

    const receitaBruta = movs.filter(m => m.tipo === 'Receita').reduce((acc, m) => acc + m.valor, 0);

    // Se consolidado, inclui receitas futuras nos cálculos de DRE
    const receitaBrutaCalculada = consolidarReceitasFuturas ? receitaBruta + receitaFutura : receitaBruta;

    const cpv = Math.abs(movs.filter(m => m.categoria === 'Produção').reduce((acc, m) => acc + m.valor, 0));
    const resultadoBruto = receitaBrutaCalculada - cpv;
    const despesasOperacionais = Math.abs(movs.filter(m => ['Marketing', 'Logística', 'Estrutura'].includes(m.categoria)).reduce((acc, m) => acc + m.valor, 0));
    const resultadoOperacional = resultadoBruto - despesasOperacionais;
    const despesasFinanceiras = Math.abs(movs.filter(m => m.categoria === 'Financeiro' && m.tipo === 'Despesa').reduce((acc, m) => acc + m.valor, 0));

    // Calcula todas as despesas e identifica "Outras Despesas" não categorizadas
    const gastoTotal = movs.filter(m => m.tipo === 'Despesa').reduce((acc, m) => acc + m.valor, 0);
    const despesasCategorizadas = cpv + despesasOperacionais + despesasFinanceiras;
    const outrasDespesas = Math.abs(gastoTotal) - despesasCategorizadas;

    const resultadoLiquido = resultadoOperacional - despesasFinanceiras - outrasDespesas;

    const margemBruta = receitaBrutaCalculada ? (resultadoBruto / receitaBrutaCalculada) * 100 : 0;
    const margemLiquida = receitaBrutaCalculada ? (resultadoLiquido / receitaBrutaCalculada) * 100 : 0;

    // Cria dados mensais com ano/mês completo incluindo receitas futuras
    const monthlyData = periodosSelecionados.length === 0
      ? Array.from({ length: 12 }, (_, i) => {
          const receitas = movs.filter(m => m.tipo === 'Receita' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0);
          const despesas = Math.abs(movs.filter(m => m.tipo === 'Despesa' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0));

          // Receitas futuras para este mês (sem filtro de ano quando não há período selecionado)
          const receitasFuturasMes = receitasFuturas.filter(rf => {
            const data = parseISO(rf.dataProjetada);
            return getMonth(data) === i;
          }).reduce((acc, rf) => acc + rf.valor, 0);

          // Se consolidado, soma na receita normal; senão mantém separado
          if (consolidarReceitasFuturas) {
            return { name: mesesAbreviados[i], Receita: receitas, 'Receita Futura': receitasFuturasMes, Despesa: despesas };
          } else {
            return { name: mesesAbreviados[i], Receita: receitas, Despesa: despesas, 'Receita Futura': receitasFuturasMes };
          }
        })
      : periodosSelecionados.map(p => {
          const receitas = movs.filter(m => {
            const data = parseISO(m.data);
            return m.tipo === 'Receita' && getYear(data) === p.ano && getMonth(data) === p.mes;
          }).reduce((acc, m) => acc + m.valor, 0);

          const despesas = Math.abs(movs.filter(m => {
            const data = parseISO(m.data);
            return m.tipo === 'Despesa' && getYear(data) === p.ano && getMonth(data) === p.mes;
          }).reduce((acc, m) => acc + m.valor, 0));

          // Receitas futuras para este período específico
          const receitasFuturasMes = receitasFuturas.filter(rf => {
            const data = parseISO(rf.dataProjetada);
            return getYear(data) === p.ano && getMonth(data) === p.mes;
          }).reduce((acc, rf) => acc + rf.valor, 0);

          // Mostra apenas mês se todos os períodos são do mesmo ano
          const anosUnicos = [...new Set(periodosSelecionados.map(p => p.ano))];
          const label = anosUnicos.length === 1
            ? mesesAbreviados[p.mes]
            : `${mesesAbreviados[p.mes]}/${String(p.ano).slice(-2)}`;

          // Se consolidado, soma na receita normal; senão mantém separado
          if (consolidarReceitasFuturas) {
            return { name: label, Receita: receitas, 'Receita Futura': receitasFuturasMes, Despesa: despesas };
          } else {
            return { name: label, Receita: receitas, Despesa: despesas, 'Receita Futura': receitasFuturasMes };
          }
        });

    // Agrupa gastos por categoria (todas as categorias de despesa)
    const gastoPorCategoria = movs
        .filter(m => m.tipo === 'Despesa')
        .reduce((acc, m) => {
            const categoria = m.categoria || 'Outros';
            acc[categoria] = (acc[categoria] || 0) + Math.abs(m.valor);
            return acc;
        }, {} as Record<string, number>);

    const composicaoCustos = Object.entries(gastoPorCategoria)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Ordena do maior para o menor

    const totalCustos = composicaoCustos.reduce((acc, item) => acc + item.value, 0);

    // Mapeia subcategorias por categoria para a legenda
    const subcategoriasPorCategoria = movs
        .filter(m => m.tipo === 'Despesa' && m.sub_categoria)
        .reduce((acc, m) => {
            const categoria = m.categoria || 'Outros';
            const subcat = m.sub_categoria;
            if (!acc[categoria]) {
                acc[categoria] = new Set<string>();
            }
            acc[categoria].add(subcat);
            return acc;
        }, {} as Record<string, Set<string>>);

    const legendaSubcategorias = Object.entries(subcategoriasPorCategoria)
        .map(([categoria, subcats]) => ({
            categoria,
            subcategorias: Array.from(subcats).sort()
        }))
        .sort((a, b) => a.categoria.localeCompare(b.categoria));

    // Agrupa gastos por subcategoria
    const gastoPorSubcategoria = movs
        .filter(m => m.tipo === 'Despesa' && m.sub_categoria)
        .reduce((acc, m) => {
            const subcat = m.sub_categoria || 'Outros';
            acc[subcat] = (acc[subcat] || 0) + Math.abs(m.valor);
            return acc;
        }, {} as Record<string, number>);

    const composicaoSubcategorias = Object.entries(gastoPorSubcategoria)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 subcategorias

    const totalSubcategorias = composicaoSubcategorias.reduce((acc, item) => acc + item.value, 0);

    // Mapeia categoria de cada subcategoria para a legenda
    const categoriasPorSubcategoria = movs
        .filter(m => m.tipo === 'Despesa' && m.sub_categoria)
        .reduce((acc, m) => {
            const subcat = m.sub_categoria;
            const categoria = m.categoria || 'Outros';
            if (!acc[subcat]) {
                acc[subcat] = categoria;
            }
            return acc;
        }, {} as Record<string, string>);

    const fornecedores = movs.filter(m => m.tipo === 'Despesa' && m.categoria === 'Produção').reduce((acc, m) => {
        const fornecedor = m.descricao;
        acc[fornecedor] = (acc[fornecedor] || 0) + Math.abs(m.valor);
        return acc;
    }, {} as Record<string, number>);

    const topFornecedores = Object.entries(fornecedores).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }));

    // Agrupa receitas por cliente (usando descrição como identificador do cliente)
    const clientes = movs.filter(m => m.tipo === 'Receita').reduce((acc, m) => {
        const cliente = m.descricao || 'Não identificado';
        acc[cliente] = (acc[cliente] || 0) + m.valor;
        return acc;
    }, {} as Record<string, number>);

    const topClientes = Object.entries(clientes).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }));

    const receitaPolimixEcomix = movs.filter(m => m.tipo === 'Receita' && (m.descricao.includes('Polimix') || m.descricao.includes('Ecomix'))).reduce((acc, m) => acc + m.valor, 0);
    const dependenciaCliente = receitaBruta ? (receitaPolimixEcomix / receitaBruta) * 100 : 0;

    const ticketMedio = movs.filter(m => m.tipo === 'Receita').length > 0 ? receitaBruta / movs.filter(m => m.tipo === 'Receita').length : 0;

    return { gastoTotal, receitaBruta, receitaFutura, receitasFuturasFiltradas, cpv, resultadoBruto, despesasOperacionais, resultadoOperacional, despesasFinanceiras, outrasDespesas, resultadoLiquido, margemBruta, margemLiquida, monthlyData, composicaoCustos, totalCustos, composicaoSubcategorias, totalSubcategorias, legendaSubcategorias, categoriasPorSubcategoria, topFornecedores, topClientes, dependenciaCliente, ticketMedio };
  }, [movimentacoes, orcamentos, periodosSelecionados, mesesAbreviados]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header Compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>

        <div className="flex items-center gap-2">
          {/* Dialog de Filtro */}
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
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
                  <Button onClick={selecionarUltimos3Meses} variant="outline" size="sm" className="text-xs h-7">
                    Últimos 3 meses
                  </Button>
                  <Button onClick={selecionarUltimos6Meses} variant="outline" size="sm" className="text-xs h-7">
                    Últimos 6 meses
                  </Button>
                  <Button onClick={selecionarAnoAtual} variant="outline" size="sm" className="text-xs h-7">
                    Ano atual
                  </Button>
                </div>

                {/* Grid de meses por ano */}
                <div className="space-y-4">
                  {anos.map(ano => (
                    <div key={ano} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-muted-foreground">{ano}</div>
                        <Button
                          onClick={() => isAnoCompleto(ano) ? desmarcarAnoCompleto(ano) : selecionarAnoCompleto(ano)}
                          variant={isAnoCompleto(ano) ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-7"
                        >
                          {isAnoCompleto(ano) ? '✓ Ano Completo' : 'Selecionar Todos'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                        {mesesAbreviados.map((mes, mesIndex) => (
                          <Button
                            key={`${ano}-${mesIndex}`}
                            onClick={() => togglePeriodo(ano, mesIndex)}
                            variant={isPeriodoSelecionado(ano, mesIndex) ? 'default' : 'outline'}
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

              <DialogFooter className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {periodosSelecionados.length === 0
                    ? 'Nenhum período selecionado'
                    : `${periodosSelecionados.length} ${periodosSelecionados.length === 1 ? 'período' : 'períodos'} selecionado${periodosSelecionados.length > 1 ? 's' : ''}`}
                </Badge>
                <div className="flex gap-2">
                  <Button onClick={limparPeriodos} variant="outline" size="sm">
                    Limpar Tudo
                  </Button>
                  <Button onClick={() => setDialogAberto(false)} size="sm">
                    Aplicar Filtro
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Badge com resumo dos períodos */}
          <Button variant="outline" size="sm" className="h-9 px-3 gap-1" disabled>
            <span className="text-xs">{formatarPeriodosResumo()}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* Botão Limpar */}
          <Button
            onClick={limparPeriodos}
            variant="ghost"
            size="sm"
            disabled={periodosSelecionados.length === 0}
            className="h-9"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Toggle Consolidar Receitas Futuras */}
          <div className="flex items-center gap-2 ml-4">
            <input
              type="checkbox"
              id="consolidar-receitas"
              checked={consolidarReceitasFuturas}
              onChange={(e) => setConsolidarReceitasFuturas(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="consolidar-receitas" className="text-sm text-muted-foreground cursor-pointer">
              Consolidar Receitas Futuras
            </label>
          </div>
        </div>
      </div>

        {/* Cards Principais */}
        <TooltipProvider>
          <div className={`grid gap-6 ${consolidarReceitasFuturas ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              <Card>
                  <CardHeader><CardTitle>Faturamento Total</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-green-600">{formatarMoeda(consolidarReceitasFuturas ? processedData.receitaBruta + processedData.receitaFutura : processedData.receitaBruta)}</p></CardContent>
              </Card>
              <Card>
                  <CardHeader><CardTitle>Gasto Total</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold text-red-600">{formatarMoeda(Math.abs(processedData.gastoTotal))}</p></CardContent>
              </Card>
              <Card>
                  <CardHeader><CardTitle>Saldo Líquido</CardTitle></CardHeader>
                  <CardContent><p className={`text-3xl font-bold ${(consolidarReceitasFuturas ? processedData.receitaBruta + processedData.receitaFutura : processedData.receitaBruta) + processedData.gastoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatarMoeda((consolidarReceitasFuturas ? processedData.receitaBruta + processedData.receitaFutura : processedData.receitaBruta) + processedData.gastoTotal)}</p></CardContent>
              </Card>
              {!consolidarReceitasFuturas && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Receita Futura</CardTitle>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="font-semibold">Receita Futura</p>
                                <p className="text-xs">Receitas projetadas de orçamentos em Execução, Cobrança ou Entregue</p>
                                <p className="text-xs mt-1">Data projetada: 90 dias após a data do orçamento</p>
                            </TooltipContent>
                        </Tooltip>
                    </CardHeader>
                    <CardContent><p className="text-3xl font-bold text-blue-600">{formatarMoeda(processedData.receitaFutura)}</p></CardContent>
                </Card>
              )}
          </div>
        </TooltipProvider>

        {/* Cards Secundários */}
        <TooltipProvider>
          <div className="grid gap-6 md:grid-cols-4">
            <Card className={processedData.margemBruta < 30 ? "border-yellow-500" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Bruta %</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Margem Bruta</p>
                    <p className="text-xs">Percentual que sobra da receita após descontar os custos de produção (CPV).</p>
                    <p className="text-xs mt-1"><strong>Cálculo:</strong> (Receita - CPV) / Receita × 100</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${processedData.margemBruta < 30 ? "text-yellow-500" : ""}`}>{processedData.margemBruta.toFixed(2)}%</p>
              </CardContent>
            </Card>

            <Card className={processedData.margemLiquida < 10 ? "border-red-500" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Líquida %</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Margem Líquida</p>
                    <p className="text-xs">Percentual de lucro real após todas as despesas (produção, operacionais e financeiras).</p>
                    <p className="text-xs mt-1"><strong>Cálculo:</strong> Resultado Líquido / Receita × 100</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${processedData.margemLiquida < 10 ? "text-red-500" : ""}`}>{processedData.margemLiquida.toFixed(2)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPV</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Custo dos Produtos Vendidos</p>
                    <p className="text-xs">Total gasto diretamente na produção (tecidos, estampas, bordados, costuras, aviamentos, embalagens).</p>
                    <p className="text-xs mt-1"><strong>Cálculo:</strong> Soma de todas as despesas da categoria "Produção"</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{formatarMoeda(processedData.cpv)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Operacionais</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Despesas Operacionais</p>
                    <p className="text-xs">Gastos necessários para manter o negócio funcionando (marketing, logística, estrutura).</p>
                    <p className="text-xs mt-1"><strong>Cálculo:</strong> Soma das categorias Marketing + Logística + Estrutura</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{formatarMoeda(processedData.despesasOperacionais)}</p>
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>

        {/* Gráfico Receita vs Despesa - Largura Total */}
        <Card>
            <CardHeader><CardTitle>Receita vs. Despesa (Mensal)</CardTitle></CardHeader>
            <CardContent>
                {/* Lógica adaptativa: Linha para muitos períodos, Barra para poucos */}
                {processedData.monthlyData.length > 24 ? (
                  // Gráfico de Linha para muitos períodos (>24 meses)
                  <ResponsiveContainer width="100%" height={Math.min(450, 300 + processedData.monthlyData.length * 3)}>
                    <LineChart data={processedData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tickFormatter={(value) => formatarMoeda(value as number)} />
                      <RechartsTooltip formatter={(value) => formatarMoeda(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="Receita" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                      {consolidarReceitasFuturas && (
                        <Line type="monotone" dataKey="Receita Futura" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                      )}
                      <Line type="monotone" dataKey="Despesa" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                      {!consolidarReceitasFuturas && (
                        <Line type="monotone" dataKey="Receita Futura" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  // Gráfico de Barras para até 24 meses (≤24 meses)
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={processedData.monthlyData}
                      barCategoryGap={processedData.monthlyData.length > 18 ? "5%" : processedData.monthlyData.length > 12 ? "10%" : "15%"}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={processedData.monthlyData.length > 12 ? -45 : 0}
                        textAnchor={processedData.monthlyData.length > 12 ? "end" : "middle"}
                        height={processedData.monthlyData.length > 12 ? 80 : 30}
                        tick={{ fontSize: processedData.monthlyData.length > 18 ? 10 : 11 }}
                      />
                      <YAxis tickFormatter={(value) => formatarMoeda(value as number)} />
                      <RechartsTooltip formatter={(value) => formatarMoeda(value as number)} />
                      <Legend />
                      <Bar
                        dataKey="Receita"
                        fill="#10B981"
                        stackId={consolidarReceitasFuturas ? "receita" : undefined}
                        maxBarSize={processedData.monthlyData.length > 18 ? 25 : processedData.monthlyData.length > 12 ? 35 : 50}
                      />
                      {consolidarReceitasFuturas && (
                        <Bar
                          dataKey="Receita Futura"
                          fill="#3B82F6"
                          stackId="receita"
                          maxBarSize={processedData.monthlyData.length > 18 ? 25 : processedData.monthlyData.length > 12 ? 35 : 50}
                        />
                      )}
                      <Bar
                        dataKey="Despesa"
                        fill="#EF4444"
                        maxBarSize={processedData.monthlyData.length > 18 ? 25 : processedData.monthlyData.length > 12 ? 35 : 50}
                      />
                      {!consolidarReceitasFuturas && (
                        <Bar
                          dataKey="Receita Futura"
                          fill="#3B82F6"
                          maxBarSize={processedData.monthlyData.length > 18 ? 25 : processedData.monthlyData.length > 12 ? 35 : 50}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
        </Card>

        {/* DRE - Largura Total com Legendas */}
        <Card>
            <CardHeader>
                <CardTitle>DRE - Demonstração do Resultado do Exercício {periodosSelecionados.length > 0 ? '(Período Selecionado)' : '(Todos os Períodos)'}</CardTitle>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Coluna 1: Resultado Bruto */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Resultado Bruto</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help underline decoration-dotted">Receita Operacional Bruta</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Total de vendas/receitas do período</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="font-medium">{formatarMoeda(consolidarReceitasFuturas ? processedData.receitaBruta + processedData.receitaFutura : processedData.receitaBruta)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help underline decoration-dotted">(-) CPV</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Custo dos Produtos Vendidos - gastos diretos de produção</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="font-medium">{formatarMoeda(processedData.cpv)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t pt-2">
                                    <span>= Resultado Bruto</span>
                                    <span>{formatarMoeda(processedData.resultadoBruto)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Resultado Operacional */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Resultado Operacional</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Resultado Bruto</span>
                                    <span>{formatarMoeda(processedData.resultadoBruto)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help underline decoration-dotted">(-) Despesas Operacionais</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Marketing + Logística + Estrutura</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="font-medium">{formatarMoeda(processedData.despesasOperacionais)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t pt-2">
                                    <span>= Resultado Operacional</span>
                                    <span>{formatarMoeda(processedData.resultadoOperacional)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Coluna 3: Resultado Líquido */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Resultado Líquido</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Resultado Operacional</span>
                                    <span>{formatarMoeda(processedData.resultadoOperacional)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help underline decoration-dotted">(-) Despesas Financeiras</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Juros, taxas bancárias e outros custos financeiros</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="font-medium">{formatarMoeda(processedData.despesasFinanceiras)}</span>
                                </div>
                                {processedData.outrasDespesas > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help underline decoration-dotted">(-) Outras Despesas</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">Despesas não categorizadas em Produção, Operacional ou Financeiro</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <span className="font-medium">{formatarMoeda(processedData.outrasDespesas)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg border-t-2 pt-2 mt-2">
                                    <span>= Resultado Líquido</span>
                                    <span className={processedData.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {formatarMoeda(processedData.resultadoLiquido)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>

        {/* Gráficos de Composição de Gastos - Lado a Lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gastos por Categoria */}
            <Card>
                <CardHeader><CardTitle>Gastos por Categoria</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={processedData.composicaoCustos} layout="vertical" margin={{ top: 5, right: 160, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatarMoeda(value as number)} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                                formatter={(value: number) => {
                                    const percentual = processedData.totalCustos > 0
                                        ? ((value / processedData.totalCustos) * 100).toFixed(1)
                                        : '0.0';
                                    return `${formatarMoeda(value)} (${percentual}%)`;
                                }}
                            />
                            <Bar dataKey="value" name="Gasto">
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    fill="#000000"
                                    fontSize={10}
                                    fontWeight="bold"
                                    formatter={(value: number) => {
                                        const percentual = processedData.totalCustos > 0
                                            ? ((value / processedData.totalCustos) * 100).toFixed(1)
                                            : '0.0';
                                        return `${formatarMoeda(value)} (${percentual}%)`;
                                    }}
                                />
                                {processedData.composicaoCustos.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Legenda de Subcategorias por Categoria */}
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-3">Subcategorias por Categoria:</h4>
                        <div className="space-y-2">
                            {processedData.legendaSubcategorias.map(item => (
                                <div key={item.categoria} className="text-xs">
                                    <span className="font-semibold text-foreground">{item.categoria}:</span>{' '}
                                    <span className="text-muted-foreground">{item.subcategorias.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gastos por Subcategoria (Top 10) */}
            <Card>
                <CardHeader><CardTitle>Top 10 Gastos por Subcategoria</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={processedData.composicaoSubcategorias} layout="vertical" margin={{ top: 5, right: 160, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatarMoeda(value as number)} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                                formatter={(value: number) => {
                                    const percentual = processedData.totalSubcategorias > 0
                                        ? ((value / processedData.totalSubcategorias) * 100).toFixed(1)
                                        : '0.0';
                                    return `${formatarMoeda(value)} (${percentual}%)`;
                                }}
                            />
                            <Bar dataKey="value" name="Gasto">
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    fill="#000000"
                                    fontSize={10}
                                    fontWeight="bold"
                                    formatter={(value: number) => {
                                        const percentual = processedData.totalSubcategorias > 0
                                            ? ((value / processedData.totalSubcategorias) * 100).toFixed(1)
                                            : '0.0';
                                        return `${formatarMoeda(value)} (${percentual}%)`;
                                    }}
                                />
                                {processedData.composicaoSubcategorias.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Legenda de Categoria por Subcategoria */}
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-3">Categoria de cada Subcategoria:</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {processedData.composicaoSubcategorias.map(item => {
                                const categoria = processedData.categoriasPorSubcategoria[item.name];
                                return (
                                    <div key={item.name} className="text-xs">
                                        <span className="font-medium text-foreground">{item.name}</span>
                                        <span className="text-muted-foreground"> ({categoria})</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

    </div>
  );
}
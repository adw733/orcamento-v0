"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getMonth, getYear, parseISO, startOfYear, endOfYear } from 'date-fns';

interface Movimentacao {
  id: string;
  data: string;
  tipo: 'Receita' | 'Despesa';
  categoria: string;
  sub_categoria: string;
  valor: number;
  descricao: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export default function DashboardFinanceiro() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anos, setAnos] = useState<number[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number | 'todos'>('todos');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([]);

  useEffect(() => {
    carregarAnos();
  }, []);

  useEffect(() => {
    carregarMovimentacoes();
  }, [anoSelecionado, dataInicio, dataFim]);

  const carregarAnos = async () => {
    try {
      const { data, error } = await supabase.from('gastos_receitas').select('data');
      if (error) throw error;
      const years = [...new Set(data.map(item => getYear(parseISO(item.data))))].sort((a, b) => b - a);
      setAnos(years);
      if (years.length > 0) {
        handleFiltroAno(years[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar anos:", error);
    }
  };

  const carregarMovimentacoes = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('gastos_receitas').select('id, data, tipo, categoria, sub_categoria, valor, descricao');
      if (dataInicio) {
        query = query.gte('data', dataInicio.toISOString());
      }
      if (dataFim) {
        query = query.lte('data', dataFim.toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltroAno = (ano: number | 'todos') => {
    setAnoSelecionado(ano);
    if (ano === 'todos') {
      setDataInicio(undefined);
      setDataFim(undefined);
    } else {
      setDataInicio(startOfYear(new Date(ano, 0, 1)));
      setDataFim(endOfYear(new Date(ano, 11, 31)));
    }
  };

  const toggleMes = (mesIndex: number) => {
    setMesesSelecionados((prev) => {
      const already = prev.includes(mesIndex);
      const next = already ? prev.filter((m) => m !== mesIndex) : [...prev, mesIndex];
      return next.sort((a, b) => a - b);
    });
  };
  const mesesAbreviados = useMemo(() => ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"], []);

  const processedData = useMemo(() => {
    const movs = mesesSelecionados.length === 0 
      ? movimentacoes 
      : movimentacoes.filter(m => mesesSelecionados.includes(getMonth(parseISO(m.data))));

    const receitaBruta = movs.filter(m => m.tipo === 'Receita').reduce((acc, m) => acc + m.valor, 0);
    const cpv = Math.abs(movs.filter(m => m.categoria === 'Produção').reduce((acc, m) => acc + m.valor, 0));
    const resultadoBruto = receitaBruta - cpv;
    const despesasOperacionais = Math.abs(movs.filter(m => ['Marketing', 'Logística', 'Estrutura'].includes(m.categoria)).reduce((acc, m) => acc + m.valor, 0));
    const resultadoOperacional = resultadoBruto - despesasOperacionais;
    const despesasFinanceiras = Math.abs(movs.filter(m => m.categoria === 'Financeiro' && m.tipo === 'Despesa').reduce((acc, m) => acc + m.valor, 0));
    const resultadoLiquido = resultadoOperacional - despesasFinanceiras;

    const margemBruta = receitaBruta ? (resultadoBruto / receitaBruta) * 100 : 0;
    const margemLiquida = receitaBruta ? (resultadoLiquido / receitaBruta) * 100 : 0;

    const monthsIndices = mesesSelecionados.length === 0 
      ? Array.from({ length: 12 }, (_, i) => i) 
      : mesesSelecionados;

    const monthlyData = monthsIndices.map((i) => {
        const receitas = movs.filter(m => m.tipo === 'Receita' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0);
        const despesas = Math.abs(movs.filter(m => m.tipo === 'Despesa' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0));
        return { name: mesesAbreviados[i], Receita: receitas, Despesa: despesas };
    });

    const custosProducao = ['Tecido', 'Estampa', 'Bordado', 'Costureira', 'Aviamento', 'Embalagem'];
    const composicaoCustos = custosProducao.map(custo => ({
        name: custo,
        value: Math.abs(movs.filter(m => m.sub_categoria === custo).reduce((acc, m) => acc + m.valor, 0))
    }));

    const evolucaoMargens = monthsIndices.map((i) => {
        const mesAbreviado = mesesAbreviados[i];
        const receitasMes = movs.filter(m => m.tipo === 'Receita' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0);
        const despesasMes = Math.abs(movs.filter(m => m.tipo === 'Despesa' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0));
        const cpvMes = Math.abs(movs.filter(m => m.categoria === 'Produção' && getMonth(parseISO(m.data)) === i).reduce((acc, m) => acc + m.valor, 0));
        const resultadoBrutoMes = receitasMes - cpvMes;
        const margemBrutaMes = receitasMes ? (resultadoBrutoMes / receitasMes) * 100 : 0;
        const resultadoLiquidoMes = resultadoBrutoMes - (despesasMes - cpvMes);
        const margemLiquidaMes = receitasMes ? (resultadoLiquidoMes / receitasMes) * 100 : 0;
        return { name: mesAbreviado, 'Margem Bruta': margemBrutaMes, 'Margem Líquida': margemLiquidaMes };
    });

    const fornecedores = movs.filter(m => m.tipo === 'Despesa' && m.categoria === 'Produção').reduce((acc, m) => {
        const fornecedor = m.descricao;
        acc[fornecedor] = (acc[fornecedor] || 0) + Math.abs(m.valor);
        return acc;
    }, {} as Record<string, number>);

    const topFornecedores = Object.entries(fornecedores).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }));

    const receitaPolimixEcomix = movs.filter(m => m.tipo === 'Receita' && (m.descricao.includes('Polimix') || m.descricao.includes('Ecomix'))).reduce((acc, m) => acc + m.valor, 0);
    const dependenciaCliente = receitaBruta ? (receitaPolimixEcomix / receitaBruta) * 100 : 0;

    const ticketMedio = movs.filter(m => m.tipo === 'Receita').length > 0 ? receitaBruta / movs.filter(m => m.tipo === 'Receita').length : 0;

    const gastoTotal = movs.filter(m => m.tipo === 'Despesa').reduce((acc, m) => acc + m.valor, 0);

    return { gastoTotal, receitaBruta, cpv, resultadoBruto, despesasOperacionais, resultadoOperacional, despesasFinanceiras, resultadoLiquido, margemBruta, margemLiquida, monthlyData, composicaoCustos, evolucaoMargens, topFornecedores, dependenciaCliente, ticketMedio };
  }, [movimentacoes, anoSelecionado, mesesSelecionados]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => handleFiltroAno('todos')} variant={anoSelecionado === 'todos' ? 'default' : 'outline'}>Todos</Button>
          {anos.map(ano => (
            <Button key={ano} onClick={() => handleFiltroAno(ano)} variant={anoSelecionado === ano ? 'default' : 'outline'}>{ano}</Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap -mt-2">
        <span className="text-sm text-muted-foreground">Filtrar por Mês:</span>
        <Button onClick={() => setMesesSelecionados([])} variant={mesesSelecionados.length === 0 ? 'default' : 'outline'} size="sm">Todos</Button>
        <div className="flex items-center gap-1 flex-wrap">
          {mesesAbreviados.map((mes, i) => (
            <Button key={i} onClick={() => toggleMes(i)} variant={mesesSelecionados.includes(i) ? 'default' : 'outline'} size="sm" className="w-12">
              {mes}
            </Button>
          ))}
        </div>
      </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Faturamento Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatarMoeda(processedData.receitaBruta)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Gasto Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{formatarMoeda(processedData.gastoTotal)}</p></CardContent></Card>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
            <Card className={processedData.margemBruta < 30 ? "border-yellow-500" : ""}><CardHeader><CardTitle>Margem Bruta %</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${processedData.margemBruta < 30 ? "text-yellow-500" : ""}`}>{processedData.margemBruta.toFixed(2)}%</p></CardContent></Card>
            <Card className={processedData.margemLiquida < 10 ? "border-red-500" : ""}><CardHeader><CardTitle>Margem Líquida %</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${processedData.margemLiquida < 10 ? "text-red-500" : ""}`}>{processedData.margemLiquida.toFixed(2)}%</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Ticket Médio</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatarMoeda(processedData.ticketMedio)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Lucro Líquido</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatarMoeda(processedData.resultadoLiquido)}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>DRE - {anoSelecionado}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Receita Operacional Bruta</span> <span>{formatarMoeda(processedData.receitaBruta)}</span></div>
                            <div className="flex justify-between"><span>(-) Custo dos Produtos Vendidos</span> <span className="text-red-500">{formatarMoeda(processedData.cpv)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-2"><span>= Resultado Operacional Bruto</span> <span>{formatarMoeda(processedData.resultadoBruto)}</span></div>
                            <div className="flex justify-between mt-4"><span>(-) Despesas Operacionais</span> <span className="text-red-500">{formatarMoeda(processedData.despesasOperacionais)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-2"><span>= Resultado Operacional Líquido</span> <span>{formatarMoeda(processedData.resultadoOperacional)}</span></div>
                            <div className="flex justify-between mt-4"><span>(-) Despesas Financeiras</span> <span className="text-red-500">{formatarMoeda(processedData.despesasFinanceiras)}</span></div>
                            <div className="flex justify-between font-bold text-lg border-t-2 pt-2 mt-2"><span>= Resultado Líquido do Exercício</span> <span className={processedData.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}>{formatarMoeda(processedData.resultadoLiquido)}</span></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Receita vs. Despesa (Mensal)</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={processedData.monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(value) => formatarMoeda(value as number)} /><Tooltip formatter={(value) => formatarMoeda(value as number)} /><Legend /><Bar dataKey="Receita" fill="#10B981" /><Bar dataKey="Despesa" fill="#EF4444" /></BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Composição dos Custos de Produção</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={processedData.composicaoCustos} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => formatarMoeda(value as number)} /><YAxis type="category" dataKey="name" width={100} /><Tooltip formatter={(value) => formatarMoeda(value as number)} /><Legend /><Bar dataKey="value" fill="#8884d8" name="Custo" /></BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Evolução das Margens (%)</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={processedData.evolucaoMargens}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="Margem Bruta" stroke="#82ca9d" /><Line type="monotone" dataKey="Margem Líquida" stroke="#8884d8" /></LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Principais Fornecedores</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData.topFornecedores} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => formatarMoeda(value as number)} /><YAxis type="category" dataKey="name" width={150} /><Tooltip formatter={(value) => formatarMoeda(value as number)} /><Legend /><Bar dataKey="value" fill="#FFBB28" name="Gasto" /></BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className={processedData.dependenciaCliente > 70 ? "border-orange-500" : ""}>
                <CardHeader><CardTitle>Dependência de Cliente</CardTitle></CardHeader>
                <CardContent>
                    <p className={`text-2xl font-bold ${processedData.dependenciaCliente > 70 ? "text-orange-500" : ""}`}>{processedData.dependenciaCliente.toFixed(2)}%</p>
                    <p className="text-sm text-muted-foreground">% da receita vinda da Polimix/Ecomix</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
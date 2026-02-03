
import React, { useMemo, useRef, useEffect } from 'react';
import { Node } from 'reactflow';
import { ProductionNodeData, StageType } from '../types';
import { 
  eachDayOfInterval, 
  format, 
  parseISO, 
  differenceInDays, 
  addDays, 
  min, 
  max,
  isToday,
  isWeekend,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  eachMonthOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStageStyle } from '../utils/styles';
import { AlertCircle, Clock, Users, ChevronRight, ShoppingCart, Scissors, Palette, Pocket, CheckCircle2, Package, Truck } from 'lucide-react';

interface TimelineViewProps {
  nodes: Node<ProductionNodeData>[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
}

const CELL_WIDTH = 44;
const SIDEBAR_WIDTH = 280;
const HEADER_TOP_HEIGHT = 32;
const HEADER_BOTTOM_HEIGHT = 48;
const ROW_HEIGHT = 56;

const icons = {
  [StageType.PURCHASE]: ShoppingCart,
  [StageType.CUTTING]: Scissors,
  [StageType.PRINTING]: Palette,
  [StageType.SEWING]: Pocket,
  [StageType.REVISION]: CheckCircle2,
  [StageType.PACKING]: Package,
  [StageType.DELIVERY]: Truck,
};

const TimelineView: React.FC<TimelineViewProps> = ({ nodes, onNodeClick, selectedNodeId }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ordenação lógica: Data de início -> Tipo de Etapa
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const dateA = a.data.startDate ? parseISO(a.data.startDate).getTime() : 0;
      const dateB = b.data.startDate ? parseISO(b.data.startDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [nodes]);

  const { days, months, startDate } = useMemo(() => {
    if (nodes.length === 0) return { days: [], months: [], startDate: new Date() };

    const dates = nodes.flatMap(n => [
      n.data.startDate ? parseISO(n.data.startDate) : new Date(),
      n.data.endDate ? parseISO(n.data.endDate) : new Date()
    ]);
    
    const minDate = min([...dates, new Date()]);
    const maxDate = max([...dates, addDays(new Date(), 14)]);

    const viewStart = addDays(minDate, -3);
    const viewEnd = addDays(maxDate, 10);

    const intervalDays = eachDayOfInterval({ start: viewStart, end: viewEnd });
    const intervalMonths = eachMonthOfInterval({ start: viewStart, end: viewEnd });
    
    return {
      days: intervalDays,
      months: intervalMonths,
      startDate: viewStart
    };
  }, [nodes]);

  // Scroll automático para o dia atual no carregamento
  useEffect(() => {
    if (scrollContainerRef.current && days.length > 0) {
      const todayIndex = days.findIndex(d => isToday(d));
      if (todayIndex !== -1) {
        scrollContainerRef.current.scrollLeft = (todayIndex * CELL_WIDTH) - (window.innerWidth / 3);
      }
    }
  }, [days.length]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/50">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <AlertCircle size={48} className="mb-4 text-blue-200" />
          <h3 className="text-gray-800 font-bold text-lg mb-1">Sem dados de produção</h3>
          <p className="text-sm text-center max-w-xs">Adicione etapas e conecte pedidos no modo Grafo para visualizar o cronograma aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden border-t border-gray-100">
      {/* Header do Timeline */}
      <div className="flex flex-shrink-0 bg-white z-30 shadow-sm border-b border-gray-200">
        {/* Canto superior esquerdo (vazio) */}
        <div className="flex-shrink-0 bg-gray-50 border-r border-gray-200 sticky left-0 z-40 flex items-center px-6" style={{ width: SIDEBAR_WIDTH, height: HEADER_TOP_HEIGHT + HEADER_BOTTOM_HEIGHT }}>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cronograma Ativo</span>
        </div>

        <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
          {/* Camada 1: Meses */}
          <div className="flex border-b border-gray-100 bg-gray-50/50" style={{ height: HEADER_TOP_HEIGHT }}>
            {months.map((month, idx) => {
              const monthDays = days.filter(d => isSameMonth(d, month));
              return (
                <div 
                  key={idx}
                  className="flex-shrink-0 border-r border-gray-200 text-[10px] font-bold text-gray-500 uppercase flex items-center px-3 tracking-wider bg-gray-50"
                  style={{ width: monthDays.length * CELL_WIDTH }}
                >
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </div>
              );
            })}
          </div>

          {/* Camada 2: Dias */}
          <div className="flex" style={{ height: HEADER_BOTTOM_HEIGHT }}>
            {days.map((day) => {
              const isWknd = isWeekend(day);
              const today = isToday(day);
              return (
                <div 
                  key={day.toISOString()} 
                  className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 text-xs transition-colors ${isWknd ? 'bg-gray-50/80' : 'bg-white'} ${today ? 'bg-blue-50/50' : ''}`}
                  style={{ width: CELL_WIDTH }}
                >
                  <span className={`text-[10px] font-medium mb-0.5 ${today ? 'text-blue-600' : isWknd ? 'text-gray-400' : 'text-gray-500'}`}>
                    {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
                  </span>
                  <span className={`text-sm font-bold ${today ? 'text-blue-600 ring-2 ring-blue-100 rounded-full px-1.5 py-0.5 bg-blue-50' : isWknd ? 'text-gray-400' : 'text-gray-800'}`}>
                    {format(day, 'dd')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Corpo do Timeline */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {/* Linha de HOJE flutuante */}
        <div className="absolute top-0 bottom-0 pointer-events-none z-20 flex" style={{ left: SIDEBAR_WIDTH }}>
          {days.map((day, i) => isToday(day) ? (
            <div 
              key={i} 
              className="absolute h-full border-l-2 border-dashed border-blue-400/50 z-20"
              style={{ left: i * CELL_WIDTH + (CELL_WIDTH / 2) }}
            >
              <div className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full absolute -top-1 -translate-x-1/2 shadow-sm uppercase">Hoje</div>
            </div>
          ) : null)}
        </div>

        <div className="flex flex-col min-w-max">
          {sortedNodes.map((node, nodeIdx) => {
            const styles = getStageStyle(node.data.type);
            const nodeStart = node.data.startDate ? parseISO(node.data.startDate) : new Date();
            const offsetDays = differenceInDays(nodeStart, startDate);
            const left = offsetDays * CELL_WIDTH;
            const width = (node.data.duration || 1) * CELL_WIDTH;
            const isSelected = selectedNodeId === node.id;
            const Icon = icons[node.data.type] || Package;

            return (
              <div 
                key={node.id} 
                className={`flex items-center hover:bg-gray-50/80 transition-all duration-150 group border-b border-gray-100 ${nodeIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}
                style={{ height: ROW_HEIGHT }}
                onClick={() => onNodeClick(node.id)}
              >
                {/* Sidebar com detalhes da etapa */}
                <div className={`w-[280px] flex-shrink-0 border-r border-gray-200 px-5 flex items-center bg-inherit sticky left-0 z-30 group-hover:bg-white shadow-[10px_0_15px_-10px_rgba(0,0,0,0.05)] cursor-pointer transition-colors ${isSelected ? 'border-l-4 border-l-blue-500 bg-blue-50/20' : ''}`} style={{ width: SIDEBAR_WIDTH }}>
                  <div className={`p-2 rounded-xl mr-3 ${styles.bg} ${styles.text} shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800 truncate leading-tight">{node.data.label}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Users size={10} /> {node.data.orderIds.length} pedidos
                      </span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Clock size={10} /> {node.data.duration}d
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`text-gray-300 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                </div>

                {/* Área do Gráfico */}
                <div className="flex-1 relative h-full">
                  {/* Grid de fundo sutil */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map((day, i) => (
                      <div 
                        key={i} 
                        className={`flex-shrink-0 border-r border-gray-50/50 h-full ${isWeekend(day) ? 'bg-gray-100/10' : ''}`}
                        style={{ width: CELL_WIDTH }} 
                      />
                    ))}
                  </div>

                  {/* Barra da Tarefa (Gantt Bar) */}
                  <div 
                    className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-md text-[10px] text-white font-bold flex items-center px-4 whitespace-nowrap overflow-hidden transition-all duration-300 cursor-pointer border-2 border-white/40 ${styles.bar} ${isSelected ? 'ring-4 ring-blue-500/20 h-[36px] z-10' : 'h-[30px] opacity-90 hover:opacity-100 hover:h-[32px]'}`}
                    style={{
                      left: `${left}px`,
                      width: `${Math.max(width, CELL_WIDTH)}px`,
                    }}
                    title={`${node.data.label}: ${node.data.startDate} até ${node.data.endDate}`}
                  >
                    <div className="flex items-center gap-2 drop-shadow-sm">
                       <span className="truncate">{node.data.type}</span>
                       <span className="opacity-60 font-normal">| {node.data.orderIds.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Espaço extra no final para não ficar grudado na borda */}
          <div style={{ height: 100 }} />
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

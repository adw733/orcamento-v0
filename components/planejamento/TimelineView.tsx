"use client"

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Node } from 'reactflow';
import { ProductionNodeData, StageType } from '@/types/planejamento';
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
  isSameMonth,
  eachMonthOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStageStyle } from '@/lib/planejamento/styles';
import {
  ChevronRight,
  ShoppingCart,
  Scissors,
  Palette,
  Pocket,
  CheckCircle2,
  Package,
  Truck,
  CalendarDays,
  ChevronDown,
  Trash2
} from 'lucide-react';

interface TimelineViewProps {
  nodes: Node<ProductionNodeData>[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  onTaskDateChange?: (nodeId: string, newStartDate: string) => void;
  onClearOrderDates?: (nodeIds: string[]) => void;
}

const CELL_WIDTH = 36;
const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 68;
const ROW_HEIGHT = 28;
const GROUP_HEADER_HEIGHT = 28;
const BAR_HEIGHT = 14;
const BAR_GAP = 2;

const STAGE_SHORT_LABELS: Record<string, string> = {
  [StageType.PURCHASE]: 'Comp',
  [StageType.CUTTING]: 'Corte',
  [StageType.PRINTING]: 'Est',
  [StageType.SEWING]: 'Cost',
  [StageType.REVISION]: 'Rev',
  [StageType.PACKING]: 'Emb',
  [StageType.DELIVERY]: 'Entr',
};

const STAGE_ORDER = [
  StageType.PURCHASE, StageType.CUTTING, StageType.PRINTING,
  StageType.SEWING, StageType.REVISION, StageType.PACKING, StageType.DELIVERY
];

// Cores sólidas por etapa para as barrinhas
const STAGE_BAR_COLORS: Record<string, string> = {
  [StageType.PURCHASE]: '#3b82f6',  // blue
  [StageType.CUTTING]: '#6366f1',   // indigo
  [StageType.PRINTING]: '#a855f7',  // purple
  [StageType.SEWING]: '#ec4899',    // pink
  [StageType.REVISION]: '#eab308',  // yellow
  [StageType.PACKING]: '#f97316',   // orange
  [StageType.DELIVERY]: '#10b981',  // emerald
};

interface GroupedOrder {
  orderId: string;
  empresa: string;
  cliente: string;
  produtos: {
    productId: string;
    productName: string;
    quantidade: number;
    nodes: Node<ProductionNodeData>[];
  }[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ nodes, onNodeClick, selectedNodeId, onTaskDateChange, onClearOrderDates }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetDayIndex, setDropTargetDayIndex] = useState<number | null>(null);

  // Agrupar nodes por pedido (orçamento) e produto
  const groupedOrders = useMemo(() => {
    const map = new Map<string, GroupedOrder>();

    nodes.forEach(node => {
      if (node.type === 'group') return;

      const productId = node.data.productId || node.id.split('-').slice(0, 2).join('-');
      const orderId = productId.split('-')[0];
      const empresa = node.data.empresa || '';
      const cliente = node.data.cliente || '';

      if (!map.has(orderId)) {
        map.set(orderId, { orderId, empresa, cliente, produtos: [] });
      }

      const group = map.get(orderId)!;
      let produto = group.produtos.find(p => p.productId === productId);
      if (!produto) {
        produto = {
          productId,
          productName: node.data.productName || node.data.label,
          quantidade: node.data.quantidade || 0,
          nodes: []
        };
        group.produtos.push(produto);
      }
      produto.nodes.push(node);
    });

    // Sort nodes within each product by stage order
    map.forEach(group => {
      group.produtos.forEach(produto => {
        produto.nodes.sort((a, b) => STAGE_ORDER.indexOf(a.data.type) - STAGE_ORDER.indexOf(b.data.type));
      });
    });

    return Array.from(map.values()).sort((a, b) => a.orderId.localeCompare(b.orderId));
  }, [nodes]);

  const { days, months, startDate } = useMemo(() => {
    if (nodes.length === 0) return { days: [], months: [], startDate: new Date() };

    const nodesWithDates = nodes.filter(n => n.data.startDate || n.data.endDate);

    if (nodesWithDates.length === 0) {
      // Fallback: show 30 days from today
      const viewStart = addDays(new Date(), -3);
      const viewEnd = addDays(new Date(), 30);
      return {
        days: eachDayOfInterval({ start: viewStart, end: viewEnd }),
        months: eachMonthOfInterval({ start: viewStart, end: viewEnd }),
        startDate: viewStart
      };
    }

    const dates = nodesWithDates.flatMap(n => [
      n.data.startDate ? parseISO(n.data.startDate) : null,
      n.data.endDate ? parseISO(n.data.endDate) : null
    ]).filter(Boolean) as Date[];

    const minDate = min([...dates, new Date()]);
    const maxDate = max([...dates, addDays(new Date(), 14)]);
    const viewStart = addDays(minDate, -2);
    const viewEnd = addDays(maxDate, 7);

    return {
      days: eachDayOfInterval({ start: viewStart, end: viewEnd }),
      months: eachMonthOfInterval({ start: viewStart, end: viewEnd }),
      startDate: viewStart
    };
  }, [nodes]);

  // Sincronizar scroll horizontal entre header e body
  useEffect(() => {
    const body = scrollContainerRef.current;
    if (!body) return;
    const handleScroll = () => {
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = body.scrollLeft;
      }
    };
    body.addEventListener('scroll', handleScroll, { passive: true });
    return () => body.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll automático para o dia atual
  useEffect(() => {
    if (scrollContainerRef.current && days.length > 0) {
      const todayIndex = days.findIndex(d => isToday(d));
      if (todayIndex !== -1) {
        scrollContainerRef.current.scrollLeft = Math.max(0, (todayIndex * CELL_WIDTH) - 200);
      }
    }
  }, [days.length]);

  const toggleGroup = (orderId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // ===== DRAG AND DROP HANDLERS =====
  const handleBarDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';

    // Custom drag image
    const node = nodes.find(n => n.id === nodeId);
    const dragEl = document.createElement('div');
    dragEl.className = 'bg-primary text-white px-2 py-1 rounded text-xs font-bold shadow-lg';
    dragEl.textContent = `📅 ${node ? STAGE_SHORT_LABELS[node.data.type] || '' : ''}`;
    dragEl.style.position = 'absolute';
    dragEl.style.top = '-9999px';
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 0, 0);
    setTimeout(() => document.body.removeChild(dragEl), 0);
  }, [nodes]);

  const handleBarDragEnd = useCallback(() => {
    setDraggedNodeId(null);
    setDropTargetDayIndex(null);
  }, []);

  const handleDayDragOver = useCallback((e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetDayIndex(dayIndex);
  }, []);

  const handleDayDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the grid entirely
    const related = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(related)) {
      setDropTargetDayIndex(null);
    }
  }, []);

  const handleDayDrop = useCallback((e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetDayIndex(null);

    const nodeId = e.dataTransfer.getData('text/plain') || draggedNodeId;
    if (!nodeId || !onTaskDateChange || dayIndex < 0 || dayIndex >= days.length) {
      setDraggedNodeId(null);
      return;
    }

    const targetDay = days[dayIndex];
    const newStartDate = format(targetDay, 'yyyy-MM-dd');
    onTaskDateChange(nodeId, newStartDate);
    setDraggedNodeId(null);
  }, [draggedNodeId, days, onTaskDateChange]);

  const totalGridWidth = days.length * CELL_WIDTH;

  // Contar total de linhas para info
  const totalProductRows = groupedOrders.reduce((sum, g) => {
    if (collapsedGroups.has(g.orderId)) return sum;
    return sum + g.produtos.length;
  }, 0);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20">
        <div className="bg-background p-10 rounded-2xl shadow-sm border flex flex-col items-center max-w-md">
          <CalendarDays size={48} className="mb-4 text-muted-foreground/40" />
          <h3 className="text-foreground font-bold text-lg mb-2">Sem tarefas no cronograma</h3>
          <p className="text-sm text-center text-muted-foreground">
            Configure as etapas dos produtos na aba &quot;Etapas&quot; e defina datas de início para visualizar o cronograma aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* LEGENDA COMPACTA */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Legenda:</span>
        {STAGE_ORDER.map(stage => (
          <div key={stage} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: STAGE_BAR_COLORS[stage] }}
            />
            <span className="text-[10px] text-muted-foreground">{STAGE_SHORT_LABELS[stage]}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-muted-foreground">
          {totalProductRows} produtos · {nodes.filter(n => n.data.startDate).length} tarefas com data
        </div>
      </div>

      {/* ===== HEADER FIXO ===== */}
      <div className="flex flex-shrink-0 border-b border-border bg-background z-20">
        <div
          className="flex-shrink-0 border-r border-border bg-muted/30 flex items-end px-3 pb-1.5"
          style={{ width: SIDEBAR_WIDTH, height: HEADER_HEIGHT }}
        >
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pedido / Produto
          </span>
        </div>

        <div className="flex-1 overflow-hidden" ref={headerScrollRef}>
          <div style={{ width: totalGridWidth }}>
            {/* Meses */}
            <div className="flex border-b border-border/50" style={{ height: 24 }}>
              {months.map((month, idx) => {
                const monthDays = days.filter(d => isSameMonth(d, month));
                return (
                  <div
                    key={idx}
                    className="flex-shrink-0 border-r border-border/30 text-[9px] font-bold text-muted-foreground uppercase flex items-center px-2 tracking-wider bg-muted/20"
                    style={{ width: monthDays.length * CELL_WIDTH }}
                  >
                    {format(month, 'MMMM yyyy', { locale: ptBR })}
                  </div>
                );
              })}
            </div>

            {/* Dias */}
            <div className="flex" style={{ height: HEADER_HEIGHT - 24 }}>
              {days.map((day) => {
                const isWknd = isWeekend(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-border/30 text-xs
                      ${isWknd ? 'bg-muted/40' : ''} ${today ? 'bg-primary/5' : ''}`}
                    style={{ width: CELL_WIDTH }}
                  >
                    <span className={`text-[8px] font-medium ${today ? 'text-primary' : isWknd ? 'text-muted-foreground/50' : 'text-muted-foreground/70'}`}>
                      {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
                    </span>
                    <span className={`text-[12px] font-bold leading-tight
                      ${today ? 'text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center' : isWknd ? 'text-muted-foreground/50' : 'text-foreground/80'}`}>
                      {format(day, 'dd')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BODY SCROLLÁVEL ===== */}
      <div className="flex-1 overflow-auto relative" ref={scrollContainerRef}>
        {/* Linha vertical HOJE */}
        {days.map((day, i) => isToday(day) ? (
          <div
            key={`today-${i}`}
            className="absolute top-0 bottom-0 z-10 pointer-events-none"
            style={{ left: SIDEBAR_WIDTH + (i * CELL_WIDTH) + (CELL_WIDTH / 2) }}
          >
            <div className="w-0.5 h-full bg-primary/30" />
            <div className="absolute top-0 -translate-x-1/2 bg-primary text-primary-foreground text-[7px] font-bold px-1 py-0.5 rounded-b-md shadow-sm uppercase">
              Hoje
            </div>
          </div>
        ) : null)}

        <div className="min-w-max">
          {groupedOrders.map((group) => {
            const isCollapsed = collapsedGroups.has(group.orderId);

            // Contadores
            const totalStagesWithDate = group.produtos.reduce((sum, p) =>
              sum + p.nodes.filter(n => n.data.startDate).length, 0
            );

            return (
              <div key={group.orderId}>
                {/* Cabeçalho do Pedido - compacto */}
                <div
                  className="flex items-center bg-muted/50 border-b border-border cursor-pointer hover:bg-muted/70 transition-colors"
                  style={{ height: GROUP_HEADER_HEIGHT }}
                  onClick={() => toggleGroup(group.orderId)}
                >
                  <div
                    className="flex-shrink-0 border-r border-border px-2 flex items-center gap-1.5 bg-muted/60 sticky left-0 z-20"
                    style={{ width: SIDEBAR_WIDTH, height: GROUP_HEADER_HEIGHT }}
                  >
                    {isCollapsed ? <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />}
                    <span className="text-[11px] font-bold text-foreground">#{group.orderId}</span>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">
                      {group.empresa} {group.cliente ? `· ${group.cliente}` : ''}
                    </span>
                    {totalStagesWithDate > 0 && onClearOrderDates && (
                      <button
                        className="text-[9px] text-destructive/70 hover:text-destructive bg-destructive/10 hover:bg-destructive/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0 transition-colors"
                        title="Limpar todas as datas deste pedido"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allNodeIds = group.produtos.flatMap(p => p.nodes.map(n => n.id));
                          onClearOrderDates(allNodeIds);
                        }}
                      >
                        <Trash2 size={10} />
                        Limpar datas
                      </button>
                    )}
                    <span className="text-[9px] text-muted-foreground bg-background px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {group.produtos.length}p · {totalStagesWithDate}t
                    </span>
                  </div>

                  {/* Faixa de datas do grupo no header */}
                  <div className="flex-1 relative" style={{ height: GROUP_HEADER_HEIGHT }}>
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((day, i) => (
                        <div key={i} className={`flex-shrink-0 border-r border-border/10 h-full ${isWeekend(day) ? 'bg-muted/20' : ''}`} style={{ width: CELL_WIDTH }} />
                      ))}
                    </div>
                    {/* Range geral do pedido */}
                    {(() => {
                      const allDates = group.produtos.flatMap(p =>
                        p.nodes.filter(n => n.data.startDate).map(n => ({
                          start: parseISO(n.data.startDate!),
                          end: n.data.endDate ? parseISO(n.data.endDate) : addDays(parseISO(n.data.startDate!), n.data.duration || 1)
                        }))
                      );
                      if (allDates.length === 0) return null;
                      const rangeStart = min(allDates.map(d => d.start));
                      const rangeEnd = max(allDates.map(d => d.end));
                      const offsetDays = differenceInDays(rangeStart, startDate);
                      const spanDays = differenceInDays(rangeEnd, rangeStart);
                      return (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary/15 border border-primary/20"
                          style={{
                            left: `${offsetDays * CELL_WIDTH}px`,
                            width: `${Math.max(spanDays * CELL_WIDTH, CELL_WIDTH)}px`,
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Produtos - UMA LINHA POR PRODUTO com todas etapas inline */}
                {!isCollapsed && group.produtos.map((produto) => {
                  const hasAnyDate = produto.nodes.some(n => n.data.startDate);

                  return (
                    <div
                      key={produto.productId}
                      className="flex items-center border-b border-border/30 hover:bg-muted/10 transition-colors"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Sidebar: produto info compacto */}
                      <div
                        className="flex-shrink-0 border-r border-border/50 pl-6 pr-2 flex items-center gap-1.5 bg-background sticky left-0 z-20"
                        style={{ width: SIDEBAR_WIDTH, height: ROW_HEIGHT }}
                      >
                        <Package size={11} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] font-medium text-foreground truncate flex-1" title={produto.productName}>
                          {produto.productName}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0">
                          {produto.quantidade}un
                        </span>
                        {/* Mini indicadores de etapas ativas */}
                        <div className="flex gap-px flex-shrink-0 ml-1">
                          {produto.nodes.map(node => (
                            <div
                              key={node.id}
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: node.data.startDate
                                  ? STAGE_BAR_COLORS[node.data.type]
                                  : '#d1d5db',
                                opacity: node.data.startDate ? 1 : 0.4
                              }}
                              title={`${STAGE_SHORT_LABELS[node.data.type]}: ${node.data.startDate ? format(parseISO(node.data.startDate), 'dd/MM') : 'sem data'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Área do gráfico: todas as barras do produto na mesma linha */}
                      <div className="flex-1 relative" style={{ height: ROW_HEIGHT }}>
                        {/* Grid de fundo — cada célula é um drop zone */}
                        <div className="absolute inset-0 flex">
                          {days.map((day, i) => (
                            <div
                              key={i}
                              className={`flex-shrink-0 border-r border-border/5 h-full transition-colors duration-100
                                ${isWeekend(day) ? 'bg-muted/10' : ''}
                                ${draggedNodeId && dropTargetDayIndex === i ? 'bg-primary/20 ring-1 ring-inset ring-primary/40' : ''}
                              `}
                              style={{ width: CELL_WIDTH }}
                              onDragOver={(e) => handleDayDragOver(e, i)}
                              onDragLeave={handleDayDragLeave}
                              onDrop={(e) => handleDayDrop(e, i)}
                            />
                          ))}
                        </div>

                        {/* Barras das etapas - todas na mesma linha, em 2 linhas visuais */}
                        {produto.nodes.map((node) => {
                          if (!node.data.startDate) return null;

                          const nodeStart = parseISO(node.data.startDate);
                          const offsetDays = differenceInDays(nodeStart, startDate);
                          const barWidth = (node.data.duration || 1) * CELL_WIDTH;
                          const isSelected = selectedNodeId === node.id;
                          const isHovered = hoveredStage === node.id;
                          const shortLabel = STAGE_SHORT_LABELS[node.data.type] || '';
                          const color = STAGE_BAR_COLORS[node.data.type] || '#6b7280';

                          // Todas as barras na mesma linha, centralizadas verticalmente
                          const yOffset = (ROW_HEIGHT - BAR_HEIGHT) / 2;

                          const isDragged = draggedNodeId === node.id;

                          return (
                            <div
                              key={node.id}
                              draggable
                              onDragStart={(e) => handleBarDragStart(e, node.id)}
                              onDragEnd={handleBarDragEnd}
                              className={`absolute rounded-sm text-[8px] text-white font-semibold 
                                flex items-center px-1 whitespace-nowrap overflow-hidden
                                transition-all duration-150
                                ${isDragged ? 'opacity-40 cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}
                                ${isSelected ? 'ring-2 ring-offset-1 ring-primary/60 z-20 shadow-md' : 'z-10 shadow-sm hover:shadow-md'}
                                ${isHovered && !isDragged ? 'brightness-110' : ''}`}
                              style={{
                                left: `${offsetDays * CELL_WIDTH}px`,
                                width: `${Math.max(barWidth, CELL_WIDTH * 0.7)}px`,
                                height: `${isSelected ? BAR_HEIGHT + 2 : BAR_HEIGHT}px`,
                                top: `${isSelected ? yOffset - 1 : yOffset}px`,
                                backgroundColor: color,
                                opacity: isDragged ? 0.4 : isSelected ? 1 : 0.9,
                              }}
                              title={`${STAGE_SHORT_LABELS[node.data.type]}: ${format(nodeStart, 'dd/MM/yyyy')} → ${node.data.endDate ? format(parseISO(node.data.endDate), 'dd/MM/yyyy') : '?'} (${node.data.duration}d) — arraste para mover`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onNodeClick(node.id);
                              }}
                              onMouseEnter={() => setHoveredStage(node.id)}
                              onMouseLeave={() => setHoveredStage(null)}
                            >
                              <span className="truncate drop-shadow-sm leading-none">{shortLabel}</span>
                            </div>
                          );
                        })}

                        {/* Indicação de etapas sem data */}
                        {!hasAnyDate && (
                          <div className="absolute inset-y-0 left-2 flex items-center">
                            <span className="text-[9px] text-muted-foreground/50 italic flex items-center gap-1">
                              <CalendarDays size={10} />
                              Defina datas na aba Etapas
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

"use client"

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StageType } from '@/types/planejamento';
import {
  ShoppingCart,
  Scissors,
  Palette,
  Pocket,
  CheckCircle2,
  Package,
  Truck,
  Calendar as CalendarIcon,
  X,
  Clock,
  PanelRightClose,
  Layers,
} from 'lucide-react';
import { ProductStageConfig } from './ProductStatusTable';

const STAGE_ICONS: Record<string, React.ElementType> = {
  [StageType.PURCHASE]: ShoppingCart,
  [StageType.CUTTING]: Scissors,
  [StageType.PRINTING]: Palette,
  [StageType.SEWING]: Pocket,
  [StageType.REVISION]: CheckCircle2,
  [StageType.PACKING]: Package,
  [StageType.DELIVERY]: Truck,
};

const STAGE_LABELS: Record<string, string> = {
  [StageType.PURCHASE]: 'Compra',
  [StageType.CUTTING]: 'Corte',
  [StageType.PRINTING]: 'Estampa',
  [StageType.SEWING]: 'Costura',
  [StageType.REVISION]: 'Revisão',
  [StageType.PACKING]: 'Embalagem',
  [StageType.DELIVERY]: 'Entrega',
};

const STAGE_COLORS: Record<string, string> = {
  [StageType.PURCHASE]: 'bg-blue-500',
  [StageType.CUTTING]: 'bg-orange-500',
  [StageType.PRINTING]: 'bg-purple-500',
  [StageType.SEWING]: 'bg-pink-500',
  [StageType.REVISION]: 'bg-green-500',
  [StageType.PACKING]: 'bg-yellow-500',
  [StageType.DELIVERY]: 'bg-indigo-500',
};

const STAGE_DOT_COLORS: Record<string, string> = {
  [StageType.PURCHASE]: '#3b82f6',
  [StageType.CUTTING]: '#f97316',
  [StageType.PRINTING]: '#a855f7',
  [StageType.SEWING]: '#ec4899',
  [StageType.REVISION]: '#22c55e',
  [StageType.PACKING]: '#eab308',
  [StageType.DELIVERY]: '#6366f1',
};

interface ScheduledTask {
  productId: string;
  productName: string;
  cliente: string;
  quantidade: number;
  stage: StageType;
  date: string;
}

interface BulkTask {
  productId: string;
  productName: string;
  stage: StageType;
  cliente?: string;
}

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  stage: StageType;
  currentDate: string;
  onDateChange: (productId: string, stage: StageType, date: string) => void;
  allConfigs: ProductStageConfig[];
  // Bulk mode props
  bulkMode?: boolean;
  bulkTasks?: BulkTask[];
  onBulkDateChange?: (tasks: { productId: string; stage: StageType }[], date: string) => void;
  onTasksDrop?: (tasks: BulkTask[]) => void;
  isDraggingTasks?: boolean;
}

export default function CalendarModal({
  open,
  onOpenChange,
  productId,
  productName,
  stage,
  currentDate,
  onDateChange,
  allConfigs,
  bulkMode = false,
  bulkTasks,
  onBulkDateChange,
  onTasksDrop,
  isDraggingTasks = false,
}: CalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? parseISO(currentDate) : undefined
  );
  const [viewMonth, setViewMonth] = useState<Date>(
    currentDate ? parseISO(currentDate) : new Date()
  );
  const [isDragOver, setIsDragOver] = useState(false);

  // Reset state quando abre com nova tarefa
  useEffect(() => {
    if (open && !bulkMode) {
      setSelectedDate(currentDate ? parseISO(currentDate) : undefined);
      setViewMonth(currentDate ? parseISO(currentDate) : new Date());
    }
    if (open && bulkMode) {
      setSelectedDate(undefined);
      setViewMonth(new Date());
    }
  }, [open, currentDate, bulkMode]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Coletar todas as tarefas agendadas de todos os produtos/etapas
  const allScheduledTasks = useMemo<ScheduledTask[]>(() => {
    const tasks: ScheduledTask[] = [];
    for (const config of allConfigs) {
      if (config.stageDates) {
        for (const [stageKey, dateStr] of Object.entries(config.stageDates)) {
          if (dateStr) {
            tasks.push({
              productId: config.productId,
              productName: config.productName,
              cliente: config.cliente,
              quantidade: config.quantidade,
              stage: stageKey as StageType,
              date: dateStr,
            });
          }
        }
      }
    }
    return tasks;
  }, [allConfigs]);

  // Mapa de datas que têm tarefas (para marcar no calendário)
  const datesWithTasks = useMemo(() => {
    const map = new Map<string, { stages: Set<StageType>; count: number }>();
    for (const task of allScheduledTasks) {
      const dateKey = task.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, { stages: new Set(), count: 0 });
      }
      const entry = map.get(dateKey)!;
      entry.stages.add(task.stage);
      entry.count++;
    }
    return map;
  }, [allScheduledTasks]);

  // Tarefas do dia selecionado (ou hoje se nenhum selecionado)
  const tasksForSelectedDate = useMemo(() => {
    const targetDate = selectedDate || new Date();
    const dateKey = format(targetDate, 'yyyy-MM-dd');
    return allScheduledTasks
      .filter(t => t.date === dateKey)
      .sort((a, b) => {
        const stageOrder = Object.values(StageType);
        return stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
      });
  }, [selectedDate, allScheduledTasks]);

  // Tarefas do mês atual visível
  const tasksForMonth = useMemo(() => {
    return allScheduledTasks.filter(t => {
      try {
        return isSameMonth(parseISO(t.date), viewMonth);
      } catch {
        return false;
      }
    });
  }, [allScheduledTasks, viewMonth]);

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (bulkMode && bulkTasks && bulkTasks.length > 0 && onBulkDateChange) {
        // Modo bulk com tarefas selecionadas: agendar todas
        onBulkDateChange(bulkTasks, dateStr);
      } else if (!bulkMode) {
        // Modo individual: agendar tarefa específica
        onDateChange(productId, stage, dateStr);
      }
      // Se bulkMode sem tarefas: apenas seleciona o dia para visualização (não fecha)
    }
  };

  const handleClearDate = () => {
    setSelectedDate(undefined);
    if (!bulkMode) {
      onDateChange(productId, stage, '');
    }
  };

  // Drag and Drop handlers for the calendar panel (when closed, as drop zone opener)
  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handlePanelDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handlePanelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (Array.isArray(data) && data.length > 0 && onTasksDrop) {
        onTasksDrop(data);
      }
    } catch (err) {
      console.error('Error parsing dropped data:', err);
    }
  }, [onTasksDrop]);

  // Track which day cell is being hovered during drag
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Handle drop directly on a specific day cell
  const handleDayDrop = useCallback((date: Date, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDay(null);
    setIsDragOver(false);

    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0 && onBulkDateChange) {
          onBulkDateChange(data, dateStr);
          return;
        }
      }
    } catch {
      // Not JSON data
    }

    // Fallback: if already in bulk mode with bulkTasks
    if (bulkMode && bulkTasks && onBulkDateChange) {
      onBulkDateChange(bulkTasks, dateStr);
    }
  }, [bulkMode, bulkTasks, onBulkDateChange]);

  const handleDayDragOver = useCallback((date: Date, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverDay(format(date, 'yyyy-MM-dd'));
  }, []);

  const handleDayDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverDay(null);
    }
  }, []);

  const StageIcon = STAGE_ICONS[stage];

  // Componente customizado para renderizar o dia com indicadores de tarefas
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const tasksInfo = datesWithTasks.get(dateKey);

    if (!tasksInfo) return null;

    const stageArray = Array.from(tasksInfo.stages).slice(0, 4);

    return (
      <div className="flex gap-[2px] justify-center mt-[1px]">
        {stageArray.map((s, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: STAGE_DOT_COLORS[s] || '#9ca3af' }}
          />
        ))}
      </div>
    );
  };

  // Modifiers para o calendário
  const modifiers = useMemo(() => {
    const daysWithTasks: Date[] = [];
    for (const [dateStr] of datesWithTasks) {
      try {
        daysWithTasks.push(parseISO(dateStr));
      } catch {
        // ignorar datas inválidas
      }
    }
    return { hasTask: daysWithTasks };
  }, [datesWithTasks]);

  const modifiersStyles = {
    hasTask: { fontWeight: 700 },
  };

  return (
    <>
      {/* Drop zone overlay quando arrastando e painel fechado */}
      {!open && isDraggingTasks && (
        <div
          onDragOver={handlePanelDragOver}
          onDragLeave={handlePanelDragLeave}
          onDrop={handlePanelDrop}
          className={`
            flex-shrink-0 w-[120px] border-l-2 border-dashed flex items-center justify-center
            transition-all duration-300 ease-in-out
            ${isDragOver
              ? 'border-primary bg-primary/10 w-[200px]'
              : 'border-muted-foreground/30 bg-muted/20'
            }
          `}
        >
          <div className="flex flex-col items-center gap-2 text-center p-3">
            <CalendarIcon className={`h-8 w-8 ${isDragOver ? 'text-primary animate-pulse' : 'text-muted-foreground/50'}`} />
            <span className={`text-xs font-medium ${isDragOver ? 'text-primary' : 'text-muted-foreground/50'}`}>
              {isDragOver ? 'Solte aqui!' : 'Solte para agendar'}
            </span>
          </div>
        </div>
      )}

      {/* Painel principal do calendário */}
      <div
        onDragOver={open ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } : undefined}
        className={`
          flex-shrink-0 border-l bg-background flex flex-col
          transition-all duration-300 ease-in-out overflow-hidden
          ${open ? 'w-[340px] opacity-100' : 'w-0 opacity-0 border-l-0'}
          ${dragOverDay ? 'ring-2 ring-primary ring-inset' : ''}
        `}
      >
      {open && (
        <div className="w-[340px] flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0 ${bulkMode ? 'bg-primary/10' : 'bg-muted/30'}`}>
            {bulkMode && bulkTasks ? (
              /* Bulk mode header */
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded bg-primary text-white flex-shrink-0">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold truncate">
                    Agendar {bulkTasks.length} tarefa{bulkTasks.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Clique em uma data para agendar todas
                  </p>
                </div>
              </div>
            ) : (
              /* Single task header */
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded ${STAGE_COLORS[stage]} text-white flex-shrink-0`}>
                  {StageIcon && <StageIcon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold truncate">Agendar {STAGE_LABELS[stage]}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {productName} — Ped. {productId.split('-')[0]}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              title="Fechar painel"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>

          {/* Bulk tasks list */}
          {bulkMode && bulkTasks && bulkTasks.length > 0 && (
            <div className="px-3 py-2 border-b bg-primary/5 max-h-32 overflow-y-auto flex-shrink-0">
              <div className="space-y-1">
                {bulkTasks.map((task, idx) => {
                  const TaskIcon = STAGE_ICONS[task.stage];
                  return (
                    <div
                      key={`${task.productId}-${task.stage}-${idx}`}
                      className="flex items-center gap-1.5 text-[11px]"
                    >
                      <div className={`p-0.5 rounded ${STAGE_COLORS[task.stage]} text-white flex-shrink-0`}>
                        {TaskIcon && <TaskIcon className="h-2.5 w-2.5" />}
                      </div>
                      <span className="truncate font-medium">{task.productName}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground truncate">{STAGE_LABELS[task.stage]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendário */}
          <div className="px-2 pt-2 pb-1.5 border-b flex-shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={ptBR}
              month={viewMonth}
              onMonthChange={setViewMonth}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md mx-auto"
              components={{
                DayContent: ({ date }) => {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const isDayDragOver = dragOverDay === dateKey;

                  return (
                    <div
                      onDragOver={(e) => handleDayDragOver(date, e)}
                      onDragLeave={handleDayDragLeave}
                      onDrop={(e) => handleDayDrop(date, e)}
                      className={`
                        flex flex-col items-center w-full h-full rounded-md transition-colors
                        ${isDayDragOver ? 'bg-primary/30 ring-2 ring-primary scale-110' : ''}
                      `}
                    >
                      <span>{date.getDate()}</span>
                      {renderDay(date)}
                    </div>
                  );
                },
              }}
            />

            {/* Data selecionada */}
            <div className="mt-1.5">
              {selectedDate ? (
                <div className="flex items-center justify-between bg-primary/5 rounded-md px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarIcon className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <button
                    onClick={handleClearDate}
                    className="p-0.5 rounded-full hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors flex-shrink-0"
                    title="Remover data"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-[11px] text-muted-foreground py-1">
                  Selecione uma data no calendário
                </div>
              )}
            </div>
          </div>

          {/* Agenda do dia */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedDate
                  ? `Agenda — ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`
                  : 'Agenda do dia'}
              </h4>
              {tasksForSelectedDate.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {tasksForSelectedDate.length} {tasksForSelectedDate.length === 1 ? 'tarefa' : 'tarefas'}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2.5 pb-2">
              {tasksForSelectedDate.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <CalendarIcon className="h-6 w-6 text-muted-foreground/30 mb-1" />
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDate ? 'Nenhuma tarefa neste dia' : 'Selecione um dia'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tasksForSelectedDate.map((task, idx) => {
                    const TaskIcon = STAGE_ICONS[task.stage];
                    const isCurrentTask = task.productId === productId && task.stage === stage;

                    return (
                      <div
                        key={`${task.productId}-${task.stage}-${idx}`}
                        className={`
                          flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                          ${isCurrentTask
                            ? 'bg-primary/10 border border-primary/20'
                            : 'bg-muted/30 hover:bg-muted/50'
                          }
                        `}
                      >
                        <div className={`p-0.5 rounded flex-shrink-0 ${STAGE_COLORS[task.stage]} text-white`}>
                          {TaskIcon && <TaskIcon className="h-2.5 w-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate text-[11px]">
                              {task.productName}
                            </span>
                            {isCurrentTask && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-primary/30 text-primary">
                                atual
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <span>Ped. {task.productId.split('-')[0]}</span>
                            <span>·</span>
                            <span className="truncate">{task.cliente}</span>
                            <span>·</span>
                            <span>{STAGE_LABELS[task.stage]}</span>
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0">
                          {task.quantidade}un
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resumo do mês */}
          {tasksForMonth.length > 0 && (
            <div className="px-3 py-2 border-t bg-muted/20 flex-shrink-0">
              <p className="text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
                {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.values(StageType).map(s => {
                  const count = tasksForMonth.filter(t => t.stage === s).length;
                  if (count === 0) return null;
                  return (
                    <div
                      key={s}
                      className="flex items-center gap-0.5 text-[9px] bg-background rounded px-1 py-0.5 border"
                      title={`${STAGE_LABELS[s]}: ${count}`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STAGE_DOT_COLORS[s] }}
                      />
                      <span className="text-muted-foreground">{STAGE_LABELS[s]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

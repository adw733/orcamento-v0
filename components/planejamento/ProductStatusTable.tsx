"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Order, StageType } from '@/types/planejamento';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  carregarConfiguracoesEtapasPorProdutos,
  salvarConfiguracoesEtapas,
  ProductStageConfig as ServiceProductStageConfig,
} from '@/lib/planejamento/configuracoes-etapas';
import {
  ShoppingCart,
  Scissors,
  Palette,
  Pocket,
  CheckCircle2,
  Package,
  Truck,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Settings2,
  Calendar as CalendarIcon,
  Layers,
  ListOrdered,
  GripVertical,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CalendarModal from './CalendarModal';

export interface StageDateConfig {
  enabled: boolean;
  startDate?: string; // ISO date string
}

export interface ProductStageConfig {
  productId: string;
  productName: string;
  cliente: string;
  quantidade: number;
  stages: Partial<Record<StageType, boolean>>;
  stageDates: Partial<Record<StageType, string>>; // Data de início de cada etapa
}

interface ProductStatusTableProps {
  orders: Order[];
  onConfigChange: (configs: ProductStageConfig[]) => void;
  onClose?: () => void;
  tenantId?: string;
}

const STAGE_ICONS = {
  [StageType.PURCHASE]: ShoppingCart,
  [StageType.CUTTING]: Scissors,
  [StageType.PRINTING]: Palette,
  [StageType.SEWING]: Pocket,
  [StageType.REVISION]: CheckCircle2,
  [StageType.PACKING]: Package,
  [StageType.DELIVERY]: Truck,
};

const STAGE_LABELS = {
  [StageType.PURCHASE]: 'Compra',
  [StageType.CUTTING]: 'Corte',
  [StageType.PRINTING]: 'Estampa',
  [StageType.SEWING]: 'Costura',
  [StageType.REVISION]: 'Revisão',
  [StageType.PACKING]: 'Embalagem',
  [StageType.DELIVERY]: 'Entrega',
};

const STAGE_COLORS = {
  [StageType.PURCHASE]: 'bg-blue-500',
  [StageType.CUTTING]: 'bg-orange-500',
  [StageType.PRINTING]: 'bg-purple-500',
  [StageType.SEWING]: 'bg-pink-500',
  [StageType.REVISION]: 'bg-green-500',
  [StageType.PACKING]: 'bg-yellow-500',
  [StageType.DELIVERY]: 'bg-indigo-500',
};

type SortField = 'numeroOrcamento' | 'productName' | 'cliente' | 'quantidade';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'byOrder' | 'byProduct';

export default function ProductStatusTable({ orders, onConfigChange, tenantId }: ProductStatusTableProps) {
  const [configs, setConfigs] = useState<ProductStageConfig[]>([]);
  const [sortField, setSortField] = useState<SortField>('numeroOrcamento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('byOrder');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [calendarModal, setCalendarModal] = useState<{ open: boolean; productId: string; productName: string; stage: StageType; currentDate: string } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkCalendarMode, setBulkCalendarMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);
  const { toast } = useToast();

  // Multi-select: toggle a task in the selection (Ctrl+click)
  const handleTaskSelect = useCallback((productId: string, stage: StageType, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${productId}:${stage}`;
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+click: toggle individual
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
      } else {
        // Regular click: start new selection or deselect
        if (newSet.has(key) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(key);
        }
      }
      return newSet;
    });
  }, []);

  // Get bulk tasks from selection
  const getBulkTasks = useCallback(() => {
    return Array.from(selectedTasks).map(key => {
      const sepIdx = key.lastIndexOf(':');
      const productId = key.substring(0, sepIdx);
      const stage = key.substring(sepIdx + 1) as StageType;
      const config = configs.find(c => c.productId === productId);
      return {
        productId,
        stage,
        productName: config?.productName || '',
        cliente: config?.cliente || '',
      };
    });
  }, [selectedTasks, configs]);

  // Handle bulk date assignment
  const handleBulkDateChange = useCallback((tasks: { productId: string; stage: StageType }[], date: string) => {
    setConfigs(prev => prev.map(config => {
      const matchingTasks = tasks.filter(t => t.productId === config.productId);
      if (matchingTasks.length === 0) return config;
      const newStageDates = { ...config.stageDates };
      matchingTasks.forEach(t => {
        newStageDates[t.stage] = date || undefined;
      });
      return { ...config, stageDates: newStageDates };
    }));
    setSelectedTasks(new Set());
    // NÃO fecha o calendário - o usuário fecha manualmente pelo botão
    toast({
      title: "Tarefas agendadas!",
      description: `${tasks.length} tarefa(s) agendada(s) para ${date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR') : 'sem data'}.`,
    });
  }, [toast]);

  // Open bulk calendar
  const openBulkCalendar = useCallback(() => {
    setBulkCalendarMode(true);
    setCalendarModal(null); // Close individual calendar if open
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
    setBulkCalendarMode(false);
  }, []);

  // Drag handlers for selected tasks
  const handleDragStart = useCallback((e: React.DragEvent) => {
    const tasks = getBulkTasks();
    e.dataTransfer.setData('application/json', JSON.stringify(tasks));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);

    // Create custom drag image
    const dragEl = document.createElement('div');
    dragEl.className = 'bg-primary text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium';
    dragEl.textContent = `📅 ${tasks.length} tarefa(s)`;
    dragEl.style.position = 'absolute';
    dragEl.style.top = '-1000px';
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 0, 0);
    setTimeout(() => document.body.removeChild(dragEl), 0);
  }, [getBulkTasks]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Carregar configurações salvas do banco de dados
  useEffect(() => {
    const carregarConfigs = async () => {
      if (!tenantId || orders.length === 0) {
        // Se não tem tenantId, criar configs padrão
        const defaultConfigs: ProductStageConfig[] = orders.map(order => ({
          productId: order.id,
          productName: order.name,
          cliente: order.client,
          quantidade: order.quantity,
          stages: {
            [StageType.PURCHASE]: true,
            [StageType.CUTTING]: true,
            [StageType.PRINTING]: true,
            [StageType.SEWING]: true,
            [StageType.REVISION]: true,
            [StageType.PACKING]: true,
            [StageType.DELIVERY]: true,
          },
          stageDates: {}
        }));
        setConfigs(defaultConfigs);
        setIsLoading(false);
        initialLoadDone.current = true;
        return;
      }

      try {
        setIsLoading(true);
        const productIds = orders.map(o => o.id);
        const savedConfigs = await carregarConfiguracoesEtapasPorProdutos(tenantId, productIds);

        // Criar um Map para acesso rápido
        const savedConfigsMap = new Map(savedConfigs.map(c => [c.productId, c]));

        // Mesclar configs salvas com orders (para novos produtos que não têm config salva)
        const mergedConfigs: ProductStageConfig[] = orders.map(order => {
          const saved = savedConfigsMap.get(order.id);
          if (saved) {
            return {
              ...saved,
              productName: order.name, // Garantir que o nome está atualizado
              cliente: order.client,
              quantidade: order.quantity,
            };
          }
          // Produto novo - criar config padrão
          return {
            productId: order.id,
            productName: order.name,
            cliente: order.client,
            quantidade: order.quantity,
            stages: {
              [StageType.PURCHASE]: true,
              [StageType.CUTTING]: true,
              [StageType.PRINTING]: true,
              [StageType.SEWING]: true,
              [StageType.REVISION]: true,
              [StageType.PACKING]: true,
              [StageType.DELIVERY]: true,
            },
            stageDates: {}
          };
        });

        setConfigs(mergedConfigs);
        initialLoadDone.current = true;
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        // Em caso de erro, usar configs padrão
        const defaultConfigs: ProductStageConfig[] = orders.map(order => ({
          productId: order.id,
          productName: order.name,
          cliente: order.client,
          quantidade: order.quantity,
          stages: {
            [StageType.PURCHASE]: true,
            [StageType.CUTTING]: true,
            [StageType.PRINTING]: true,
            [StageType.SEWING]: true,
            [StageType.REVISION]: true,
            [StageType.PACKING]: true,
            [StageType.DELIVERY]: true,
          },
          stageDates: {}
        }));
        setConfigs(defaultConfigs);
        initialLoadDone.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    carregarConfigs();
  }, [orders, tenantId]);

  // Salvar configurações com debounce
  const salvarConfigs = useCallback(async (configsToSave: ProductStageConfig[]) => {
    if (!tenantId || configsToSave.length === 0) return;

    try {
      setIsSaving(true);
      await salvarConfiguracoesEtapas(configsToSave, tenantId);
      console.log('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, toast]);

  // Atualizar configurações e salvar quando houver mudanças
  useEffect(() => {
    if (configs.length > 0) {
      onConfigChange(configs);

      // Salvar no banco com debounce (apenas após o carregamento inicial)
      if (tenantId && initialLoadDone.current) {
        // Cancelar timeout anterior
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Agendar salvamento para 1 segundo após a última mudança
        saveTimeoutRef.current = setTimeout(() => {
          salvarConfigs(configs);
        }, 1000);
      }
    }

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [configs, onConfigChange, tenantId, salvarConfigs]);

  const handleStageToggle = (productId: string, stage: StageType) => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.productId === productId
          ? {
            ...config,
            stages: {
              ...config.stages,
              [stage]: !config.stages[stage]
            }
          }
          : config
      )
    );
  };

  // Selecionar/deselecionar todas as etapas de um produto específico
  const handleSelectAllForProduct = (productId: string) => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config => {
        if (config.productId === productId) {
          // Verificar se todas as etapas estão selecionadas
          const allSelected = Object.values(config.stages).every(v => v === true);
          // Se todas estão selecionadas, desmarcar todas; senão, marcar todas
          const newValue = !allSelected;
          return {
            ...config,
            stages: {
              [StageType.PURCHASE]: newValue,
              [StageType.CUTTING]: newValue,
              [StageType.PRINTING]: newValue,
              [StageType.SEWING]: newValue,
              [StageType.REVISION]: newValue,
              [StageType.PACKING]: newValue,
              [StageType.DELIVERY]: newValue,
            }
          };
        }
        return config;
      })
    );
  };

  const handleSelectAll = (stage: StageType) => {
    const allSelected = configs.every(config => config.stages[stage]);
    setConfigs(prevConfigs =>
      prevConfigs.map(config => ({
        ...config,
        stages: {
          ...config.stages,
          [stage]: !allSelected
        }
      }))
    );
  };

  // Selecionar/deselecionar uma etapa específica para todos os produtos de um pedido (orçamento)
  const handleSelectStageForOrder = (numeroOrcamento: string, stage: StageType) => {
    // Filtrar apenas os produtos deste orçamento
    const orderProducts = configs.filter(c => c.productId.split('-')[0] === numeroOrcamento);
    // Verificar se todos os produtos deste orçamento têm esta etapa selecionada
    const allSelected = orderProducts.every(c => c.stages[stage]);

    setConfigs(prevConfigs =>
      prevConfigs.map(config => {
        if (config.productId.split('-')[0] === numeroOrcamento) {
          return {
            ...config,
            stages: {
              ...config.stages,
              [stage]: !allSelected
            }
          };
        }
        return config;
      })
    );
  };

  // Atualizar data de início de uma etapa específica
  const handleDateChange = (productId: string, stage: StageType, date: string) => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.productId === productId
          ? {
            ...config,
            stageDates: {
              ...config.stageDates,
              [stage]: date || undefined
            }
          }
          : config
      )
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedConfigs = [...configs].sort((a, b) => {
    const numeroOrcamentoA = a.productId.split('-')[0];
    const numeroOrcamentoB = b.productId.split('-')[0];

    const numeroA = Number(numeroOrcamentoA);
    const numeroB = Number(numeroOrcamentoB);
    const bothNumeric = !Number.isNaN(numeroA) && !Number.isNaN(numeroB);
    const compareNumero = bothNumeric
      ? numeroA - numeroB
      : numeroOrcamentoA.localeCompare(numeroOrcamentoB);

    if (sortField === 'numeroOrcamento') {
      return sortDirection === 'asc' ? compareNumero : -compareNumero;
    }

    if (compareNumero !== 0) {
      return compareNumero;
    }

    let compareA: string | number;
    let compareB: string | number;

    switch (sortField) {
      case 'productName':
        compareA = a.productName.toLowerCase();
        compareB = b.productName.toLowerCase();
        break;
      case 'cliente':
        compareA = a.cliente.toLowerCase();
        compareB = b.cliente.toLowerCase();
        break;
      case 'quantidade':
        compareA = a.quantidade;
        compareB = b.quantidade;
        break;
      default:
        return 0;
    }

    if (typeof compareA === 'string' && typeof compareB === 'string') {
      return sortDirection === 'asc'
        ? compareA.localeCompare(compareB)
        : compareB.localeCompare(compareA);
    }
    return sortDirection === 'asc'
      ? (compareA as number) - (compareB as number)
      : (compareB as number) - (compareA as number);
  });

  const stages = Object.values(StageType);

  // Agrupar por nome de produto quando em modo byProduct
  interface ProductGroup {
    productName: string;
    items: ProductStageConfig[];
    totalQuantidade: number;
    clientes: string[];
  }

  const groupedByProduct: ProductGroup[] = React.useMemo(() => {
    if (viewMode !== 'byProduct') return [];

    const groups = new Map<string, ProductGroup>();

    for (const config of configs) {
      const existing = groups.get(config.productName);
      if (existing) {
        existing.items.push(config);
        existing.totalQuantidade += config.quantidade;
        if (!existing.clientes.includes(config.cliente)) {
          existing.clientes.push(config.cliente);
        }
      } else {
        groups.set(config.productName, {
          productName: config.productName,
          items: [config],
          totalQuantidade: config.quantidade,
          clientes: [config.cliente],
        });
      }
    }

    // Ordenar grupos alfabeticamente pelo nome do produto
    return Array.from(groups.values()).sort((a, b) =>
      a.productName.toLowerCase().localeCompare(b.productName.toLowerCase())
    );
  }, [configs, viewMode]);

  // Função para selecionar/deselecionar uma etapa para todo o grupo de produto
  const handleSelectStageForGroup = (productName: string, stage: StageType) => {
    const groupProducts = configs.filter(c => c.productName === productName);
    const allSelected = groupProducts.every(c => c.stages[stage]);

    setConfigs(prevConfigs =>
      prevConfigs.map(config => {
        if (config.productName === productName) {
          return {
            ...config,
            stages: {
              ...config.stages,
              [stage]: !allSelected
            }
          };
        }
        return config;
      })
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const calendarIsOpen = calendarModal?.open ?? false;
  const showCalendar = calendarIsOpen || bulkCalendarMode;

  // Reusable stage cell renderer with multi-select support (no calendar icon)
  const renderStageCell = (config: ProductStageConfig, stage: StageType) => {
    const isActive = config.stages[stage];
    const Icon = STAGE_ICONS[stage];
    const stageDate = config.stageDates[stage] || '';
    const taskKey = `${config.productId}:${stage}`;
    const isSelected = selectedTasks.has(taskKey);

    return (
      <TableCell key={stage} className="px-1 py-1.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <button
            draggable={isActive && isSelected}
            onDragStart={isActive && isSelected ? handleDragStart : undefined}
            onDragEnd={isActive && isSelected ? handleDragEnd : undefined}
            onClick={(e) => {
              if (isActive && (e.ctrlKey || e.metaKey || selectedTasks.size > 0)) {
                handleTaskSelect(config.productId, stage, e);
              } else {
                handleStageToggle(config.productId, stage);
              }
            }}
            className={`
              p-1.5 rounded transition-all duration-200 flex-shrink-0
              ${isActive
                ? isSelected
                  ? 'bg-primary text-white shadow-md ring-2 ring-primary ring-offset-1 scale-110 cursor-grab active:cursor-grabbing'
                  : `${STAGE_COLORS[stage]} text-white shadow-sm hover:shadow-md`
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }
            `}
            title={
              isActive && isSelected
                ? 'Selecionado — Ctrl+clique para desmarcar, ou arraste para o calendário'
                : isActive
                  ? `${STAGE_LABELS[stage]}${stageDate ? ` (${format(parseISO(stageDate), "dd/MM", { locale: ptBR })})` : ''} — Ctrl+clique para selecionar`
                  : `Adicionar ${STAGE_LABELS[stage]}`
            }
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
          {isActive && stageDate && (
            <span className="text-[9px] text-muted-foreground leading-none">
              {format(parseISO(stageDate), "dd/MM", { locale: ptBR })}
            </span>
          )}
        </div>
      </TableCell>
    );
  };

  // Handle drop on calendar panel from external drag
  const handleCalendarDrop = useCallback((droppedTasks: { productId: string; stage: StageType; productName: string }[]) => {
    // Set the dropped tasks as selected and open bulk calendar
    const newSelection = new Set<string>();
    droppedTasks.forEach(t => newSelection.add(`${t.productId}:${t.stage}`));
    setSelectedTasks(newSelection);
    setBulkCalendarMode(true);
    setCalendarModal(null);
  }, []);

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 space-y-4">
      {/* Título simples igual tabela de produtos */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h3 className="text-lg font-medium text-primary flex items-center gap-2">
          <span className="bg-primary text-white p-1 rounded-md text-xs">ETAPAS</span>
          Configuração de Etapas por Produto
        </h3>
        <div className="flex items-center gap-2">
          {/* Botão Calendário */}
          <button
            onClick={() => {
              if (showCalendar) {
                setCalendarModal(null);
                setBulkCalendarMode(false);
              } else {
                setBulkCalendarMode(true);
                setCalendarModal(null);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              showCalendar
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
            title={showCalendar ? 'Fechar calendário' : 'Abrir calendário para agendar'}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Calendário
          </button>
          {/* Toggle de Visualização */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setViewMode('byOrder')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'byOrder'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Ordenar por Pedido"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Por Pedido</span>
            </button>
            <button
              onClick={() => setViewMode('byProduct')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'byProduct'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Agrupar por Tipo de Produto"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Por Produto</span>
            </button>
          </div>
          {isSaving && (
            <span className="text-xs text-blue-500 flex items-center gap-1">
              <span className="animate-spin">⏳</span> Salvando...
            </span>
          )}
          {!isSaving && !isLoading && tenantId && (
            <span className="text-xs text-green-500">✓ Salvo</span>
          )}
          <span className="text-xs text-gray-500">{sortedConfigs.length} produtos</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-muted-foreground">Carregando configurações...</span>
        </div>
      ) : (
        /* Layout flex: tabela + painel calendário lado a lado */
        <div className="flex gap-0 rounded-md border overflow-hidden bg-background">
          {/* Tabela - encolhe quando o painel abre */}
          <div className="flex-1 min-w-0 overflow-x-auto transition-all duration-300">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('numeroOrcamento')}
                  >
                    <div className="flex items-center">
                      Pedido
                      <SortIcon field="numeroOrcamento" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Produto
                      <SortIcon field="productName" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('cliente')}
                  >
                    <div className="flex items-center">
                      Cliente
                      <SortIcon field="cliente" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('quantidade')}
                  >
                    <div className="flex items-center">
                      Qtd
                      <SortIcon field="quantidade" />
                    </div>
                  </TableHead>
                  {stages.map(stage => {
                    const Icon = STAGE_ICONS[stage];
                    const activeCount = configs.filter(c => c.stages[stage]).length;
                    const allSelected = configs.length > 0 && activeCount === configs.length;

                    return (
                      <TableHead
                        key={stage}
                        className="px-2 py-3 text-center font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectAll(stage)}
                        title={`${allSelected ? 'Desmarcar' : 'Marcar'} todos - ${STAGE_LABELS[stage]}`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <Icon className="h-4 w-4" />
                          <span className="text-[10px]">{STAGE_LABELS[stage]}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4 + stages.length} className="px-4 py-4 text-center text-muted-foreground">
                      <div className="text-center py-8 bg-accent/30 rounded-lg">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <h4 className="text-lg font-medium text-gray-600">Nenhum produto disponível</h4>
                        <p className="text-gray-500 mt-1">Adicione produtos para configurar as etapas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : viewMode === 'byProduct' ? (
                  // Visualização agrupada por tipo de produto
                  groupedByProduct.map((group) => (
                    <React.Fragment key={group.productName}>
                      {/* Cabeçalho do grupo de produto */}
                      <TableRow className="bg-gray-50 border-t-4 border-gray-300">
                        <TableCell colSpan={4} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-sm">{group.productName}</span>
                            <Badge variant="outline" className="text-xs">
                              {group.items.length} {group.items.length === 1 ? 'pedido' : 'pedidos'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Total: {group.totalQuantidade} un
                            </Badge>
                          </div>
                        </TableCell>
                        {/* Botões de etapas para o grupo de produto */}
                        {stages.map(stage => {
                          const Icon = STAGE_ICONS[stage];
                          const allSelected = group.items.every(c => c.stages[stage]);

                          return (
                            <TableCell key={stage} className="px-2 py-2 text-center">
                              <button
                                onClick={() => handleSelectStageForGroup(group.productName, stage)}
                                className="p-1 rounded transition-all duration-200 hover:bg-gray-100"
                                title={`${allSelected ? 'Desmarcar' : 'Marcar'} ${STAGE_LABELS[stage]} para todos os "${group.productName}"`}
                              >
                                <Icon className={`h-4 w-4 ${allSelected ? 'text-muted-foreground' : 'text-gray-300'}`} />
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {/* Itens do grupo */}
                      {group.items.map(config => {
                        const numeroOrcamento = config.productId.split('-')[0];
                        return (
                          <TableRow
                            key={config.productId}
                            className="hover:bg-muted/50 border-b border-gray-200"
                          >
                            <TableCell className="px-4 py-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSelectAllForProduct(config.productId)}
                                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                                  title={Object.values(config.stages).every(v => v) ? 'Desmarcar todas as etapas' : 'Marcar todas as etapas'}
                                >
                                  {Object.values(config.stages).every(v => v) ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                <span className="text-sm font-medium">{numeroOrcamento}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-1.5 align-middle">
                              <span className="text-sm text-muted-foreground">{config.productName}</span>
                            </TableCell>
                            <TableCell className="px-4 py-1.5 align-middle">
                              <span className="text-sm">{config.cliente}</span>
                            </TableCell>
                            <TableCell className="px-4 py-1.5 align-middle">
                              <Badge variant="outline" className="font-medium">
                                {config.quantidade}
                              </Badge>
                            </TableCell>
                            {stages.map(stage => renderStageCell(config, stage))}
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))
                ) : (
                  // Visualização por pedido (padrão)
                  sortedConfigs.map((config, index) => {
                    // Extrair número base do orçamento (antes do hífen)
                    const numeroOrcamentoAtual = config.productId.split('-')[0];
                    const numeroOrcamentoAnterior = index > 0 ? sortedConfigs[index - 1].productId.split('-')[0] : null;
                    const isNovoOrcamento = numeroOrcamentoAnterior === null || numeroOrcamentoAtual !== numeroOrcamentoAnterior;

                    // Obter dados do orçamento para o cabeçalho
                    const pedidoAtual = orders.find(o => o.id === config.productId);
                    const empresaOrcamento = pedidoAtual?.empresa || '';

                    return (
                      <React.Fragment key={config.productId}>
                        {/* Cabeçalho do orçamento (como na impressão) */}
                        {isNovoOrcamento && (
                          <TableRow className="bg-gray-50 border-t-4 border-gray-300">
                            <TableCell colSpan={4} className="px-4 py-2">
                              <div className="font-semibold text-sm">
                                Orçamento: {numeroOrcamentoAtual} - {empresaOrcamento} - {config.cliente.toUpperCase()}
                              </div>
                            </TableCell>
                            {/* Botões de etapas para o orçamento */}
                            {stages.map(stage => {
                              const Icon = STAGE_ICONS[stage];
                              // Verificar se todos os produtos deste orçamento têm esta etapa selecionada
                              const orderProducts = configs.filter(c => c.productId.split('-')[0] === numeroOrcamentoAtual);
                              const allSelected = orderProducts.length > 0 && orderProducts.every(c => c.stages[stage]);

                              return (
                                <TableCell key={stage} className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => handleSelectStageForOrder(numeroOrcamentoAtual, stage)}
                                    className="p-1 rounded transition-all duration-200 hover:bg-gray-100"
                                    title={`${allSelected ? 'Desmarcar' : 'Marcar'} ${STAGE_LABELS[stage]} para todo o pedido ${numeroOrcamentoAtual}`}
                                  >
                                    <Icon className={`h-4 w-4 ${allSelected ? 'text-muted-foreground' : 'text-gray-300'}`} />
                                  </button>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        )}

                        {/* Linha do produto */}
                        <TableRow
                          className="hover:bg-muted/50 border-b border-gray-200"
                        >
                          <TableCell className="px-4 py-1.5 align-middle">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSelectAllForProduct(config.productId)}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                title={Object.values(config.stages).every(v => v) ? 'Desmarcar todas as etapas' : 'Marcar todas as etapas'}
                              >
                                {Object.values(config.stages).every(v => v) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                              <span className="text-sm font-medium">{numeroOrcamentoAtual}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-1.5 align-middle">
                            <span className="text-sm font-medium">{config.productName}</span>
                          </TableCell>
                          <TableCell className="px-4 py-1.5 align-middle">
                            <span className="text-sm">{config.cliente}</span>
                          </TableCell>
                          <TableCell className="px-4 py-1.5 align-middle">
                            <Badge variant="outline" className="font-medium">
                              {config.quantidade}
                            </Badge>
                          </TableCell>
                          {stages.map(stage => renderStageCell(config, stage))}
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Painel de Calendário - inline ao lado da tabela */}
          <CalendarModal
            open={showCalendar}
            onOpenChange={(open) => {
              if (!open) {
                setCalendarModal(null);
                setBulkCalendarMode(false);
              }
            }}
            productId={calendarModal?.productId ?? ''}
            productName={calendarModal?.productName ?? ''}
            stage={calendarModal?.stage ?? StageType.PURCHASE}
            currentDate={calendarModal?.currentDate ?? ''}
            onDateChange={handleDateChange}
            allConfigs={configs}
            bulkMode={bulkCalendarMode}
            bulkTasks={bulkCalendarMode ? getBulkTasks() : undefined}
            onBulkDateChange={handleBulkDateChange}
            onTasksDrop={handleCalendarDrop}
            isDraggingTasks={isDragging}
          />
        </div>
      )}

      {/* Floating action bar for selected tasks */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-300">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
            title="Arraste para o calendário"
          >
            <GripVertical className="h-4 w-4 opacity-60" />
            <span className="font-medium text-sm">
              {selectedTasks.size} tarefa{selectedTasks.size > 1 ? 's' : ''} selecionada{selectedTasks.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-px h-5 bg-primary-foreground/30" />
          <button
            onClick={openBulkCalendar}
            className="flex items-center gap-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Agendar
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
            title="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
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
  salvarDuracoesGlobais,
  carregarDuracoesGlobais,
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
  Trash2,
  Play,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
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
  observacao?: string;
  stages: Partial<Record<StageType, boolean>>;
  stageDates: Partial<Record<StageType, string>>; // Data de início de cada etapa
  stageDurations?: Partial<Record<StageType, number>>; // Duração em dias de cada etapa (override individual)
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

// Durações padrão por etapa (em dias)
const DEFAULT_STAGE_DURATIONS: Record<StageType, number> = {
  [StageType.PURCHASE]: 3,
  [StageType.CUTTING]: 2,
  [StageType.PRINTING]: 2,
  [StageType.SEWING]: 3,
  [StageType.REVISION]: 1,
  [StageType.PACKING]: 1,
  [StageType.DELIVERY]: 1,
};

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
  const [globalDurations, setGlobalDurations] = useState<Record<StageType, number>>({ ...DEFAULT_STAGE_DURATIONS });
  const [showDurationEditor, setShowDurationEditor] = useState(false);
  const [showObservationColumn, setShowObservationColumn] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const durationSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);
  const durationsLoadDone = useRef(false);
  const { toast } = useToast();

  // Distribuir datas automaticamente: do pedido mais antigo ao mais recente
  // Regra: Todas as compras do mesmo pedido começam no mesmo dia.
  // Cada produto segue suas etapas sequencialmente.
  // O próximo pedido só começa após TODOS os produtos do pedido atual terminarem.
  // IMPORTANTE: Datas já configuradas manualmente são mantidas.
  const handleAutoDistribute = useCallback(() => {
    const stages = Object.values(StageType);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // 1. Agrupar configs por número do pedido
    const orderGroups: Map<string, typeof configs> = new Map();
    configs.forEach(config => {
      const orderNum = config.productId.split('-')[0];
      if (!orderGroups.has(orderNum)) {
        orderGroups.set(orderNum, []);
      }
      orderGroups.get(orderNum)!.push(config);
    });

    // 2. Ordenar pedidos do mais antigo ao mais recente
    const sortedOrderNums = [...orderGroups.keys()].sort((a, b) => {
      return (parseInt(a) || 0) - (parseInt(b) || 0);
    });

    // 3. Processar cada pedido sequencialmente
    let orderStartDate = new Date(today); // Data de início do pedido atual
    const allUpdatedConfigs: ProductStageConfig[] = [];

    sortedOrderNums.forEach(orderNum => {
      const orderConfigs = orderGroups.get(orderNum)!;
      // Ordenar produtos dentro do pedido por sub-índice
      orderConfigs.sort((a, b) => {
        const subA = parseInt(a.productId.split('-')[1]) || 0;
        const subB = parseInt(b.productId.split('-')[1]) || 0;
        return subA - subB;
      });

      let orderMaxEndDate = new Date(orderStartDate); // Rastrear quando o pedido inteiro termina

      // Processar cada produto do pedido
      orderConfigs.forEach(config => {
        const newStageDates: Partial<Record<StageType, string>> = {};
        const newStageDurations: Partial<Record<StageType, number>> = {};
        const activeStages = stages.filter(stage => config.stages[stage]);

        // A primeira etapa começa na data de início do pedido
        // As etapas seguintes são sequenciais a partir do fim da anterior
        // RESPEITAR datas já configuradas manualmente
        let currentDate = new Date(orderStartDate);

        activeStages.forEach((stage) => {
          // SEMPRE usar globalDurations como fonte de verdade para auto-distribuição
          // (são os valores mostrados no cabeçalho da tabela)
          const duration = globalDurations[stage];
          newStageDurations[stage] = duration;

          // Se já existe uma data configurada manualmente, mantê-la
          const existingDate = config.stageDates[stage];
          if (existingDate) {
            newStageDates[stage] = existingDate;
            // Avançar currentDate para após o término desta etapa (usando a data manual)
            const manualDate = parseISO(existingDate);
            manualDate.setHours(12, 0, 0, 0);
            currentDate = addDays(manualDate, duration);
          } else {
            // Sem data manual: atribuir automaticamente
            newStageDates[stage] = format(currentDate, 'yyyy-MM-dd');
            // Avançar a data atual pela duração desta etapa
            currentDate = addDays(currentDate, duration);
          }
        });

        // Rastrear a data mais tardia de término dentro deste pedido
        if (currentDate > orderMaxEndDate) {
          orderMaxEndDate = new Date(currentDate);
        }

        allUpdatedConfigs.push({
          ...config,
          stageDates: newStageDates,
          stageDurations: newStageDurations,
        });
      });

      // O próximo pedido começa quando TODOS os produtos deste pedido terminarem
      orderStartDate = new Date(orderMaxEndDate);
    });

    setConfigs(allUpdatedConfigs);

    // Calcular tempo total de produção
    let maxEndDate = today;
    allUpdatedConfigs.forEach(config => {
      const activeStages = stages.filter(stage => config.stages[stage]);
      activeStages.forEach(stage => {
        const startDate = config.stageDates[stage] ? parseISO(config.stageDates[stage]!) : null;
        const duration = config.stageDurations?.[stage] ?? globalDurations[stage];
        if (startDate) {
          const endDate = addDays(startDate, duration);
          if (endDate > maxEndDate) maxEndDate = endDate;
        }
      });
    });

    const totalDays = Math.ceil((maxEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    toast({
      title: "📅 Datas distribuídas!",
      description: `${allUpdatedConfigs.length} produto(s) agendados. Tempo total estimado: ${totalDays} dias (até ${format(maxEndDate, "dd/MM/yyyy", { locale: ptBR })}).`,
    });
  }, [configs, globalDurations, toast]);

  // Atualizar duração global de uma etapa
  const handleGlobalDurationChange = useCallback((stage: StageType, newDuration: number) => {
    if (newDuration < 1) newDuration = 1;
    if (newDuration > 90) newDuration = 90;
    setGlobalDurations(prev => ({ ...prev, [stage]: newDuration }));
  }, []);

  // Atualizar duração individual de uma etapa para um produto específico
  const handleIndividualDurationChange = useCallback((productId: string, stage: StageType, newDuration: number) => {
    if (newDuration < 1) newDuration = 1;
    if (newDuration > 90) newDuration = 90;
    setConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.productId === productId
          ? {
            ...config,
            stageDurations: {
              ...config.stageDurations,
              [stage]: newDuration,
            }
          }
          : config
      )
    );
  }, []);

  // Carregar durações globais do banco de dados
  useEffect(() => {
    if (!tenantId) return;
    const carregarDuracoes = async () => {
      try {
        const saved = await carregarDuracoesGlobais(tenantId);
        if (saved) {
          setGlobalDurations(prev => ({ ...prev, ...saved }));
        }
      } catch (error) {
        console.error('Erro ao carregar durações globais:', error);
      } finally {
        durationsLoadDone.current = true;
      }
    };
    carregarDuracoes();
  }, [tenantId]);

  // Salvar durações globais com debounce
  useEffect(() => {
    if (!tenantId || !durationsLoadDone.current) return;

    if (durationSaveTimeoutRef.current) {
      clearTimeout(durationSaveTimeoutRef.current);
    }

    durationSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await salvarDuracoesGlobais(globalDurations, tenantId);
        console.log('Durações globais salvas com sucesso');
      } catch (error) {
        console.error('Erro ao salvar durações globais:', error);
      }
    }, 1000);

    return () => {
      if (durationSaveTimeoutRef.current) {
        clearTimeout(durationSaveTimeoutRef.current);
      }
    };
  }, [globalDurations, tenantId]);

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
        // Se não tem tenantId, criar configs padrão com durações globais
        const defaultConfigs: ProductStageConfig[] = orders.map(order => ({
          productId: order.id,
          productName: order.name,
          cliente: order.client,
          quantidade: order.quantity,
          observacao: '',
          stages: {
            [StageType.PURCHASE]: true,
            [StageType.CUTTING]: true,
            [StageType.PRINTING]: true,
            [StageType.SEWING]: true,
            [StageType.REVISION]: true,
            [StageType.PACKING]: true,
            [StageType.DELIVERY]: true,
          },
          stageDates: {},
          stageDurations: { ...globalDurations },
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
            // Sincronizar durações individuais com as globais atuais
            // (as globais são a fonte de verdade)
            const mergedDurations: Partial<Record<StageType, number>> = { ...globalDurations };
            return {
              ...saved,
              productName: order.name, // Garantir que o nome está atualizado
              cliente: order.client,
              quantidade: order.quantity,
              observacao: saved.observacao || '',
              stageDurations: mergedDurations,
            };
          }
          // Produto novo - criar config padrão com durações globais
          return {
            productId: order.id,
            productName: order.name,
            cliente: order.client,
            quantidade: order.quantity,
            observacao: '',
            stages: {
              [StageType.PURCHASE]: true,
              [StageType.CUTTING]: true,
              [StageType.PRINTING]: true,
              [StageType.SEWING]: true,
              [StageType.REVISION]: true,
              [StageType.PACKING]: true,
              [StageType.DELIVERY]: true,
            },
            stageDates: {},
            stageDurations: { ...globalDurations },
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
          observacao: '',
          stages: {
            [StageType.PURCHASE]: true,
            [StageType.CUTTING]: true,
            [StageType.PRINTING]: true,
            [StageType.SEWING]: true,
            [StageType.REVISION]: true,
            [StageType.PACKING]: true,
            [StageType.DELIVERY]: true,
          },
          stageDates: {},
          stageDurations: { ...globalDurations },
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

  const handleObservationChange = useCallback((productId: string, observacao: string) => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.productId === productId
          ? {
            ...config,
            observacao: observacao.slice(0, 140),
          }
          : config
      )
    );
  }, []);

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

  // Função para limpar todas as datas de um pedido (todos os produtos do orçamento)
  const handleClearOrderDates = (numeroOrcamento: string) => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config => {
        if (config.productId.split('-')[0] === numeroOrcamento) {
          return {
            ...config,
            stageDates: {}
          };
        }
        return config;
      })
    );

    toast({
      title: "Datas removidas!",
      description: `Todas as datas do pedido ${numeroOrcamento} foram removidas.`,
    });
  };

  // Função para limpar todas as datas de um grupo de produto (todas as instâncias do produto)
  const handleClearProductGroupDates = (productName: string) => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config => {
        if (config.productName === productName) {
          return {
            ...config,
            stageDates: {}
          };
        }
        return config;
      })
    );

    toast({
      title: "Datas removidas!",
      description: `Todas as datas para o produto "${productName}" foram removidas.`,
    });
  };

  // Função para limpar TODAS as datas de todos os produtos (global)
  const handleClearAllDates = useCallback(() => {
    setConfigs(prevConfigs =>
      prevConfigs.map(config => ({
        ...config,
        stageDates: {}
      }))
    );

    toast({
      title: "Datas removidas!",
      description: "Todas as datas de todos os produtos foram removidas.",
    });
  }, [toast]);

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
    const duration = config.stageDurations?.[stage] ?? globalDurations[stage];
    const isCustomDuration = config.stageDurations?.[stage] !== undefined && config.stageDurations[stage] !== globalDurations[stage];

    return (
      <TableCell key={stage} className="px-1 py-1 text-center">
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
                  ? `${STAGE_LABELS[stage]} (${duration}d)${stageDate ? ` — ${format(parseISO(stageDate), "dd/MM", { locale: ptBR })}` : ''} — Ctrl+clique para selecionar`
                  : `Adicionar ${STAGE_LABELS[stage]}`
            }
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
          {isActive && stageDate && (
            <span className="text-[11px] font-semibold leading-none bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm">
              {format(parseISO(stageDate), "dd/MM", { locale: ptBR })}
            </span>
          )}
          {isActive && showDurationEditor && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); handleIndividualDurationChange(config.productId, stage, duration - 1); }}
                className="w-4 h-4 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-[9px] font-bold leading-none"
              >
                -
              </button>
              <span className={`text-[10px] font-bold min-w-[16px] text-center leading-none ${isCustomDuration ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                }`}
                title={isCustomDuration ? `Duração personalizada (global: ${globalDurations[stage]}d)` : `Duração padrão global`}
              >
                {duration}d
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleIndividualDurationChange(config.productId, stage, duration + 1); }}
                className="w-4 h-4 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-[9px] font-bold leading-none"
              >
                +
              </button>
            </div>
          )}
        </div>
      </TableCell>
    );
  };

  const renderObservationCell = (config: ProductStageConfig) => {
    if (!showObservationColumn) return null;

    return (
      <TableCell className="px-2 py-1 align-middle min-w-[220px]">
        <input
          type="text"
          value={config.observacao || ''}
          onChange={(e) => handleObservationChange(config.productId, e.target.value)}
          placeholder="Observação da tarefa"
          maxLength={140}
          className="w-full h-7 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Distribuir Datas */}
          <button
            onClick={handleAutoDistribute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-md"
            title="Distribuir datas automaticamente do pedido mais antigo ao mais recente"
          >
            <Play className="h-3.5 w-3.5" />
            Distribuir Datas
          </button>
          {/* Botão Limpar Todas as Datas */}
          {configs.some(c => Object.keys(c.stageDates).length > 0) && (
            <button
              onClick={handleClearAllDates}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm hover:shadow-md"
              title="Limpar todas as datas de todos os produtos"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar Datas
            </button>
          )}
          {/* Botão Durações */}
          <button
            onClick={() => setShowDurationEditor(!showDurationEditor)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${showDurationEditor
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            title="Configurar durações padrão de cada etapa"
          >
            <Clock className="h-3.5 w-3.5" />
            Durações
          </button>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${showCalendar
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
          <button
            onClick={() => setShowObservationColumn(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${showObservationColumn
              ? 'bg-primary text-white border-primary'
              : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            title={showObservationColumn ? 'Ocultar coluna de observação' : 'Mostrar coluna de observação'}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showObservationColumn ? 'Ocultar Obs' : 'Mostrar Obs'}</span>
          </button>
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

      {/* Painel de Durações Expandido */}
      {showDurationEditor && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duração Padrão por Etapa (dias)
            </h4>
            <button
              onClick={() => setGlobalDurations({ ...DEFAULT_STAGE_DURATIONS })}
              className="text-xs text-amber-600 hover:text-amber-800 underline"
            >
              Restaurar padrão
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Object.values(StageType).map(stage => {
              const Icon = STAGE_ICONS[stage];
              return (
                <div key={stage} className="flex flex-col items-center gap-1.5 p-2 bg-white dark:bg-gray-900 rounded-lg border border-amber-100 dark:border-amber-900">
                  <div className={`p-1.5 rounded ${STAGE_COLORS[stage]} text-white`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 text-center leading-tight">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleGlobalDurationChange(stage, globalDurations[stage] - 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={globalDurations[stage]}
                      onChange={(e) => handleGlobalDurationChange(stage, parseInt(e.target.value) || 1)}
                      className="w-10 h-5 text-center text-xs font-bold border border-amber-200 rounded bg-white dark:bg-gray-800 text-amber-800 dark:text-amber-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => handleGlobalDurationChange(stage, globalDurations[stage] + 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[9px] text-amber-500">
                    {globalDurations[stage] === 1 ? '1 dia' : `${globalDurations[stage]} dias`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-2">
            💡 Ajuste as durações e clique em <strong>Distribuir Datas</strong> para reorganizar automaticamente.
          </p>
        </div>
      )}

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
              <TableHeader className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
                <TableRow className="bg-muted/60">
                  <TableHead
                    className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('numeroOrcamento')}
                  >
                    <div className="flex items-center">
                      Pedido
                      <SortIcon field="numeroOrcamento" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Produto
                      <SortIcon field="productName" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('cliente')}
                  >
                    <div className="flex items-center">
                      Cliente
                      <SortIcon field="cliente" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="px-4 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
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
                        className="px-2 py-2 text-center font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectAll(stage)}
                        title={`${allSelected ? 'Desmarcar' : 'Marcar'} todos - ${STAGE_LABELS[stage]}`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <Icon className="h-4 w-4" />
                          <span className="text-[10px]">{STAGE_LABELS[stage]}</span>
                          <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                            {globalDurations[stage]}d
                          </span>
                        </div>
                      </TableHead>
                    );
                  })}
                  {showObservationColumn && (
                    <TableHead className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        Observação
                      </div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4 + stages.length + (showObservationColumn ? 1 : 0)} className="px-4 py-4 text-center text-muted-foreground">
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
                        <TableCell colSpan={4} className="px-4 py-1.5">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-sm">{group.productName}</span>
                            <Badge variant="outline" className="text-xs">
                              {group.items.length} {group.items.length === 1 ? 'pedido' : 'pedidos'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Total: {group.totalQuantidade} un
                            </Badge>
                            {group.items.some(item => Object.keys(item.stageDates).length > 0) && (
                              <button
                                onClick={() => handleClearProductGroupDates(group.productName)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                                title="Limpar todas as datas deste grupo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Limpar datas
                              </button>
                            )}
                          </div>
                        </TableCell>
                        {/* Botões de etapas para o grupo de produto */}
                        {stages.map(stage => {
                          const Icon = STAGE_ICONS[stage];
                          const allSelected = group.items.every(c => c.stages[stage]);

                          return (
                            <TableCell key={stage} className="px-2 py-1.5 text-center">
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
                        {showObservationColumn && (
                          <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                            Observação
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Itens do grupo */}
                      {group.items.map(config => {
                        const numeroOrcamento = config.productId.split('-')[0];
                        return (
                          <TableRow
                            key={config.productId}
                            className="hover:bg-muted/50 border-b border-gray-200"
                          >
                            <TableCell className="px-4 py-1 align-middle">
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
                            <TableCell className="px-4 py-1 align-middle">
                              <span className="text-sm text-muted-foreground">{config.productName}</span>
                            </TableCell>
                            <TableCell className="px-4 py-1 align-middle">
                              <span className="text-sm">{config.cliente}</span>
                            </TableCell>
                            <TableCell className="px-4 py-1 align-middle">
                              <Badge variant="outline" className="font-medium">
                                {config.quantidade}
                              </Badge>
                            </TableCell>
                            {stages.map(stage => renderStageCell(config, stage))}
                            {renderObservationCell(config)}
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
                            <TableCell colSpan={4} className="px-4 py-1.5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-sm">
                                  Orçamento: {numeroOrcamentoAtual} - {empresaOrcamento} - {config.cliente.toUpperCase()}
                                </div>
                                {configs.some(c => c.productId.split('-')[0] === numeroOrcamentoAtual && Object.keys(c.stageDates).length > 0) && (
                                  <button
                                    onClick={() => handleClearOrderDates(numeroOrcamentoAtual)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    title="Limpar todas as datas deste pedido"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Limpar datas
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            {/* Botões de etapas para o orçamento */}
                            {stages.map(stage => {
                              const Icon = STAGE_ICONS[stage];
                              // Verificar se todos os produtos deste orçamento têm esta etapa selecionada
                              const orderProducts = configs.filter(c => c.productId.split('-')[0] === numeroOrcamentoAtual);
                              const allSelected = orderProducts.length > 0 && orderProducts.every(c => c.stages[stage]);

                              return (
                                <TableCell key={stage} className="px-2 py-1.5 text-center">
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
                            {showObservationColumn && (
                              <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                                Observação
                              </TableCell>
                            )}
                          </TableRow>
                        )}

                        {/* Linha do produto */}
                        <TableRow
                          className="hover:bg-muted/50 border-b border-gray-200"
                        >
                          <TableCell className="px-4 py-1 align-middle">
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
                          <TableCell className="px-4 py-1 align-middle">
                            <span className="text-sm font-medium">{config.productName}</span>
                          </TableCell>
                          <TableCell className="px-4 py-1 align-middle">
                            <span className="text-sm">{config.cliente}</span>
                          </TableCell>
                          <TableCell className="px-4 py-1 align-middle">
                            <Badge variant="outline" className="font-medium">
                              {config.quantidade}
                            </Badge>
                          </TableCell>
                          {stages.map(stage => renderStageCell(config, stage))}
                          {renderObservationCell(config)}
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

"use client"

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function ProductStatusTable({ orders, onConfigChange }: ProductStatusTableProps) {
  const [configs, setConfigs] = useState<ProductStageConfig[]>([]);
  const [sortField, setSortField] = useState<SortField>('numeroOrcamento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Inicializar configurações com todos os pedidos
  useEffect(() => {
    const initialConfigs: ProductStageConfig[] = orders.map(order => ({
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
      stageDates: {} // Datas inicialmente vazias
    }));
    setConfigs(initialConfigs);
  }, [orders]);

  // Atualizar configurações quando houver mudanças
  useEffect(() => {
    if (configs.length > 0) {
      onConfigChange(configs);
    }
  }, [configs]);

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 space-y-4">
      {/* Título simples igual tabela de produtos */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h3 className="text-lg font-medium text-primary flex items-center gap-2">
          <span className="bg-primary text-white p-1 rounded-md text-xs">ETAPAS</span>
          Configuração de Etapas por Produto
        </h3>
        <span className="text-xs text-gray-500">{sortedConfigs.length} produtos</span>
      </div>

      {/* Tabela igual à tabela de produtos */}
      <div className="rounded-md border overflow-hidden bg-background">
        <div className="overflow-x-auto">
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
              {sortedConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4 + stages.length} className="px-4 py-4 text-center text-muted-foreground">
                    <div className="text-center py-8 bg-accent/30 rounded-lg">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <h4 className="text-lg font-medium text-gray-600">Nenhum produto disponível</h4>
                      <p className="text-gray-500 mt-1">Adicione produtos para configurar as etapas</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
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
                        {stages.map(stage => {
                          const isActive = config.stages[stage];
                          const Icon = STAGE_ICONS[stage];
                          const stageDate = config.stageDates[stage] || '';

                          return (
                            <TableCell key={stage} className="px-1 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  onClick={() => handleStageToggle(config.productId, stage)}
                                  className={`
                                    p-1.5 rounded transition-all duration-200 flex-shrink-0
                                    ${isActive
                                      ? `${STAGE_COLORS[stage]} text-white shadow-sm hover:shadow-md`
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }
                                  `}
                                  title={`${isActive ? 'Remover' : 'Adicionar'} ${STAGE_LABELS[stage]}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </button>
                                {isActive && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        className={`p-1 rounded hover:bg-gray-100 transition-colors ${stageDate ? 'text-primary' : 'text-gray-400'}`}
                                        title={stageDate ? format(parseISO(stageDate), "dd/MM/yyyy", { locale: ptBR }) : `Definir data de ${STAGE_LABELS[stage]}`}
                                      >
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={stageDate ? parseISO(stageDate) : undefined}
                                        onSelect={(date) => handleDateChange(config.productId, stage, date ? format(date, 'yyyy-MM-dd') : '')}
                                        locale={ptBR}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

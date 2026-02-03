"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle2, XCircle, Save } from 'lucide-react';
import { Order, StageType } from '@/types/planejamento';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onApply: (config: ProductStageConfig[]) => void;
}

export interface ProductStageConfig {
  productId: string;
  productName: string;
  stages: {
    [key in StageType]?: boolean;
  };
}

const STAGE_LABELS: Record<StageType, string> = {
  [StageType.PURCHASE]: 'Compra',
  [StageType.CUTTING]: 'Corte',
  [StageType.PRINTING]: 'Estampa',
  [StageType.SEWING]: 'Costura',
  [StageType.REVISION]: 'Revisão',
  [StageType.PACKING]: 'Embalagem',
  [StageType.DELIVERY]: 'Entrega',
};

const ALL_STAGES = [
  StageType.PURCHASE,
  StageType.CUTTING,
  StageType.PRINTING,
  StageType.SEWING,
  StageType.REVISION,
  StageType.PACKING,
  StageType.DELIVERY,
];

export default function BulkEditModal({ isOpen, onClose, orders, onApply }: BulkEditModalProps) {
  const [configs, setConfigs] = useState<ProductStageConfig[]>([]);
  const [selectAll, setSelectAll] = useState<Record<StageType, boolean>>({} as any);

  // Inicializar configurações quando o modal abrir
  useEffect(() => {
    if (isOpen && orders.length > 0) {
      const initialConfigs: ProductStageConfig[] = orders.map(order => ({
        productId: order.id,
        productName: order.name,
        stages: ALL_STAGES.reduce((acc, stage) => {
          acc[stage] = true; // Todas as etapas ativas por padrão
          return acc;
        }, {} as Record<StageType, boolean>),
      }));
      setConfigs(initialConfigs);

      // Inicializar "selecionar todos" como true
      const initialSelectAll = ALL_STAGES.reduce((acc, stage) => {
        acc[stage] = true;
        return acc;
      }, {} as Record<StageType, boolean>);
      setSelectAll(initialSelectAll);
    }
  }, [isOpen, orders]);

  const handleToggleStage = (productId: string, stage: StageType) => {
    setConfigs(prev =>
      prev.map(config =>
        config.productId === productId
          ? {
              ...config,
              stages: {
                ...config.stages,
                [stage]: !config.stages[stage],
              },
            }
          : config
      )
    );
  };

  const handleToggleAll = (stage: StageType) => {
    const newValue = !selectAll[stage];
    setSelectAll(prev => ({ ...prev, [stage]: newValue }));

    setConfigs(prev =>
      prev.map(config => ({
        ...config,
        stages: {
          ...config.stages,
          [stage]: newValue,
        },
      }))
    );
  };

  const handleApply = () => {
    onApply(configs);
    onClose();
  };

  const countActiveStages = (config: ProductStageConfig) => {
    return Object.values(config.stages).filter(Boolean).length;
  };

  const totalStages = configs.reduce((sum, config) => sum + countActiveStages(config), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="text-blue-600" size={24} />
            Edição em Massa - Etapas de Produção
          </DialogTitle>
          <DialogDescription>
            Selecione quais etapas serão criadas para cada produto. Use os checkboxes de cabeçalho para ativar/desativar etapas em massa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-y">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {configs.length} produto(s)
            </Badge>
            <Badge variant="default" className="text-sm">
              {totalStages} etapa(s) ativas
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <CheckCircle2 size={16} className="inline mr-1 text-green-600" />
            Ativa
            <XCircle size={16} className="inline ml-3 mr-1 text-red-600" />
            Desativada
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px] sticky left-0 bg-background z-10">
                  Produto
                </TableHead>
                {ALL_STAGES.map(stage => (
                  <TableHead key={stage} className="text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
                      <Checkbox
                        checked={selectAll[stage]}
                        onCheckedChange={() => handleToggleAll(stage)}
                        className="h-5 w-5"
                      />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map(config => (
                <TableRow key={config.productId}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{config.productName}</span>
                      <span className="text-xs text-muted-foreground">#{config.productId}</span>
                      <Badge variant="outline" className="mt-1 w-fit text-xs">
                        {countActiveStages(config)}/{ALL_STAGES.length} etapas
                      </Badge>
                    </div>
                  </TableCell>
                  {ALL_STAGES.map(stage => (
                    <TableCell key={stage} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={config.stages[stage] ?? false}
                          onCheckedChange={() => handleToggleStage(config.productId, stage)}
                          className="h-5 w-5"
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleApply} className="gap-2">
            <Save size={16} />
            Aplicar e Criar Etapas ({totalStages})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

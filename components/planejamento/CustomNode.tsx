"use client"

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ProductionNodeData, StageType } from '@/types/planejamento';
import { getStageStyle } from '@/lib/planejamento/styles';
import { 
  ShoppingCart, 
  Scissors, 
  Palette, 
  Pocket, 
  CheckCircle2, 
  Package, 
  Truck,
  Clock,
  Users
} from 'lucide-react';

const icons = {
  [StageType.PURCHASE]: ShoppingCart,
  [StageType.CUTTING]: Scissors,
  [StageType.PRINTING]: Palette,
  [StageType.SEWING]: Pocket,
  [StageType.REVISION]: CheckCircle2,
  [StageType.PACKING]: Package,
  [StageType.DELIVERY]: Truck,
};

const CustomNode: React.FC<NodeProps<ProductionNodeData>> = ({ data, selected }) => {
  const Icon = icons[data.type] || Package;
  const styles = getStageStyle(data.type);
  const hasGroup = !!data.groupId;

  return (
    <div className={`relative px-3 py-1.5 shadow-lg rounded-lg border-2 transition-all min-w-[280px] max-w-[320px] ${selected ? 'ring-2 ring-blue-500 scale-105' : ''} ${hasGroup ? 'ring-2 ring-purple-400 ring-offset-1' : ''} ${styles.bg} ${styles.border} ${styles.text}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Indicador de Grupo */}
      {hasGroup && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full p-1 shadow-md">
          <Users size={12} />
        </div>
      )}
      
      {/* Linha 1: Ícone + Empresa + Pedido + Contato */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className="flex-shrink-0 p-1 bg-white/70 rounded backdrop-blur-sm">
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-black truncate" title={data.empresa}>
          {data.empresa || 'Empresa'}
        </span>
        <span className="text-[10px] font-black">#{data.productId || 'ID'}</span>
        <span className="text-[10px] font-black truncate flex-1" title={data.cliente}>
          {data.cliente || 'Contato'}
        </span>
      </div>
      
      {/* Linha 2: Produto */}
      <div className="text-[12px] font-bold leading-tight truncate mb-1" title={data.productName}>
        {data.productName || 'Produto'}
      </div>
      
      {/* Linha 3: Qtd + Prazo */}
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/50 rounded">
          <span>{data.quantidade || 0}</span>
          <span className="opacity-60">un</span>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/50 rounded">
          <Clock size={11} />
          <span>{data.duration}d</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default React.memo(CustomNode);

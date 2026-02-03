
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ProductionNodeData, StageType } from '../types';
import { getStageStyle } from '../utils/styles';
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

  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl border-2 transition-all min-w-[200px] ${selected ? 'ring-2 ring-blue-500 scale-105' : ''} ${styles.bg} ${styles.border} ${styles.text}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white/60 rounded-lg backdrop-blur-sm">
          <Icon size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold opacity-70 leading-none mb-1">{data.type}</span>
          <h3 className="text-sm font-bold truncate leading-tight">{data.label}</h3>
        </div>
      </div>

      <div className="space-y-1.5 mt-3 pt-3 border-t border-black/5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1 opacity-80">
            <Clock size={12} />
            <span>{data.duration} dias</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
             {data.endDate}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] opacity-80">
          <Users size={12} />
          <span>{data.orderIds.length} Pedidos</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default React.memo(CustomNode);

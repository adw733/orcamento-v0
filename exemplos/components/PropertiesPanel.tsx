
import React from 'react';
import { Node } from 'reactflow';
import { ProductionNodeData, Order } from '../types';
import { X, Clock, Users, Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: Node<ProductionNodeData> | null;
  allOrders: Order[];
  onUpdate: (id: string, data: Partial<ProductionNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  allOrders,
  onUpdate,
  onDelete,
  onClose
}) => {
  if (!selectedNode) return null;

  const data = selectedNode.data;

  const toggleOrder = (orderId: string) => {
    const newOrderIds = data.orderIds.includes(orderId)
      ? data.orderIds.filter(id => id !== orderId)
      : [...data.orderIds, orderId];
    onUpdate(selectedNode.id, { orderIds: newOrderIds });
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-white shadow-2xl rounded-2xl border border-gray-100 flex flex-col z-20 animate-in slide-in-from-right-10 duration-200">
      <div className="p-5 border-b flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Propriedades do Lote</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome da Etapa</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex items-center gap-1">
            <Clock size={14} /> Duração (Dias)
          </label>
          <input
            type="number"
            min="0"
            value={data.duration}
            onChange={(e) => onUpdate(selectedNode.id, { duration: parseInt(e.target.value) || 0 })}
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block flex items-center gap-1">
            <Users size={14} /> Pedidos Associados
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {allOrders.map(order => (
              <label 
                key={order.id} 
                className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all hover:border-blue-300 ${data.orderIds.includes(order.id) ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
              >
                <input
                  type="checkbox"
                  checked={data.orderIds.includes(order.id)}
                  onChange={() => toggleOrder(order.id)}
                  className="hidden"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600">#{order.id}</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border">{order.quantity}un</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{order.name}</div>
                </div>
                {data.orderIds.includes(order.id) && (
                  <div className="ml-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">
                    ✓
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
           <div className="flex justify-between text-xs mb-1">
             <span className="text-gray-500">Início:</span>
             <span className="font-bold text-gray-700">{data.startDate}</span>
           </div>
           <div className="flex justify-between text-xs font-bold text-blue-600">
             <span>Previsão de Fim:</span>
             <span>{data.endDate}</span>
           </div>
        </div>
      </div>

      <div className="p-6 border-t bg-white">
        <button
          onClick={() => {
            onDelete(selectedNode.id);
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 p-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
        >
          <Trash2 size={18} />
          Excluir Etapa
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;

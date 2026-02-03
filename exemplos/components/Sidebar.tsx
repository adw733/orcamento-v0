
import React from 'react';
import { Order, StageType } from '../types';
import { Plus, Package, Calendar } from 'lucide-react';

interface SidebarProps {
  orders: Order[];
  onAddNode: (type: StageType) => void;
  onAddOrder: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ orders, onAddNode, onAddOrder }) => {
  const nodeTemplates = Object.values(StageType);

  return (
    <div className="w-80 h-full bg-white border-r flex flex-col overflow-hidden shadow-xl z-10">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            F
          </div>
          FluxoFabril
        </h1>
        <p className="text-sm text-gray-500 mt-1">Gestão de Grafos de Produção</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Etapas de Lote</h2>
            <span className="text-[10px] text-gray-400">Arraste para o canvas</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {nodeTemplates.map((type) => (
              <button
                key={type}
                onClick={() => onAddNode(type)}
                className="flex items-center gap-3 p-3 text-sm text-left font-medium border rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white">
                  <Plus size={16} className="text-gray-400 group-hover:text-blue-600" />
                </div>
                {type}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedidos Ativos</h2>
            <button 
              onClick={onAddOrder}
              className="p-1 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="p-3 bg-gray-50 border rounded-xl hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-400">#{order.id}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-gray-200 rounded-full font-medium">{order.quantity} un</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-800">{order.name}</h4>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: order.color.toLowerCase() }}></div>
                  <span>{order.client}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      <div className="p-6 border-t bg-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-600">
           <Calendar size={18} />
           <span className="font-medium">Hoje: {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

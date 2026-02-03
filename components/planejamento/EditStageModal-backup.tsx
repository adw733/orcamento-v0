"use client"

import React, { useState, useMemo } from 'react';
import { Node } from 'reactflow';
import { ProductionNodeData, Order, StageType } from '@/types/planejamento';
import { 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckCircle2,
  Info,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  parseISO,
  startOfDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStageStyle } from '@/lib/planejamento/styles';

interface EditStageModalProps {
  selectedNode: Node<ProductionNodeData> | null;
  allOrders: Order[];
  onUpdate: (id: string, data: Partial<ProductionNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isRoot: boolean;
}

const EditStageModal: React.FC<EditStageModalProps> = ({
  selectedNode,
  allOrders,
  onUpdate,
  onDelete,
  onClose,
  isRoot
}) => {
  if (!selectedNode) return null;

  const data = selectedNode.data;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const styles = getStageStyle(data.type);

  const startDate = data.startDate ? parseISO(data.startDate) : null;
  const endDate = data.endDate ? parseISO(data.endDate) : null;

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleDayClick = (day: Date) => {
    if (!isRoot) return; // Se não for raiz, o início é automático
    
    const clickedDay = startOfDay(day);
    onUpdate(selectedNode.id, { 
      manualStartDate: format(clickedDay, 'yyyy-MM-dd')
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    onUpdate(selectedNode.id, { duration: isNaN(val) ? 0 : val });
  };

  const toggleOrder = (orderId: string) => {
    const newOrderIds = data.orderIds.includes(orderId)
      ? data.orderIds.filter(id => id !== orderId)
      : [...data.orderIds, orderId];
    onUpdate(selectedNode.id, { orderIds: newOrderIds });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header compacto */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shadow-sm ${styles.bg} ${styles.text}`}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{data.type}</h2>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{data.label || 'Nova Etapa'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* Nome da etapa */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Nome da Etapa</label>
            <input
              type="text"
              value={data.label}
              onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 transition-all text-gray-800 font-medium outline-none placeholder:text-gray-300"
              placeholder="Ex: Lote Camisetas Verão"
            />
          </div>

          {/* Duração */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block flex items-center gap-2">
              <Clock size={14} className="text-blue-600" /> Duração (Dias)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={data.duration}
                onChange={handleDurationChange}
                className="w-24 text-2xl font-bold text-gray-900 outline-none bg-transparent"
                placeholder="0"
              />
              <span className="text-sm font-medium text-gray-400">dias úteis</span>
            </div>
          </div>

          {/* Data de início (apenas para root) */}
          {isRoot && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block flex items-center gap-2">
                <CalendarIcon size={14} className="text-gray-600" /> Data de Início
              </label>
              <input
                type="date"
                value={data.manualStartDate || data.startDate || ''}
                onChange={(e) => onUpdate(selectedNode.id, { manualStartDate: e.target.value })}
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium"
              />
            </div>
          )}

          {/* Datas calculadas */}
          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-md">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-xs opacity-70 uppercase tracking-wide block mb-1">Início</span>
                <div className="font-bold">{data.startDate || 'Não definido'}</div>
              </div>
              <ArrowRight size={16} className="opacity-50" />
              <div className="text-right">
                <span className="text-xs opacity-70 uppercase tracking-wide block mb-1">Término</span>
                <div className="font-bold">{data.endDate || 'Não definido'}</div>
              </div>
            </div>
          </div>

          {/* Pedidos associados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <Users size={14} className="text-blue-500" /> Orçamentos
              </label>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-bold">
                {data.orderIds.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
              {allOrders.map(order => (
                <div 
                  key={order.id}
                  onClick={() => toggleOrder(order.id)}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${data.orderIds.includes(order.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-600">#{order.id}</span>
                      <span className="text-xs text-gray-400">{order.quantity} un</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">{order.name}</div>
                    <div className="text-xs text-gray-500 truncate">{order.client}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${data.orderIds.includes(order.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                    {data.orderIds.includes(order.id) && <CheckCircle2 size={12} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isRoot && (
            <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <Info className="text-amber-600 flex-shrink-0" size={16} />
              <p className="text-xs text-amber-900 leading-relaxed">
                Esta etapa depende de processos anteriores. A data de início é calculada automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={() => {
              if (confirm('Deseja excluir esta etapa?')) {
                onDelete(selectedNode.id);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all text-sm border border-red-200"
          >
            <Trash2 size={16} />
            Excluir
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all text-sm"
          >
            Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStageModal;

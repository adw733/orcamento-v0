
import React, { useState, useMemo } from 'react';
import { Node } from 'reactflow';
import { ProductionNodeData, Order, StageType } from '../types';
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
  addDays,
  startOfDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStageStyle } from '../utils/styles';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Lado Esquerdo: Identificação e Pedidos */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl shadow-sm ${styles.bg} ${styles.text}`}>
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Configurar Etapa</h2>
                <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">{data.type}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="group">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block group-focus-within:text-blue-500 transition-colors">Identificação do Lote</label>
              <input
                type="text"
                value={data.label}
                onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
                className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-blue-500 transition-all text-gray-800 font-bold text-lg outline-none placeholder:text-gray-300 shadow-inner"
                placeholder="Ex: Lote Camisetas Verão"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Users size={14} className="text-blue-500" /> Pedidos Associados
                </label>
                <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-black">
                  {data.orderIds.length} Selecionados
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                {allOrders.map(order => (
                  <div 
                    key={order.id}
                    onClick={() => toggleOrder(order.id)}
                    className={`flex items-center p-5 rounded-[22px] border-2 cursor-pointer transition-all ${data.orderIds.includes(order.id) ? 'border-blue-500 bg-blue-50/40 shadow-md ring-4 ring-blue-500/5' : 'border-gray-50 hover:border-gray-200 bg-white'}`}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">REF #{order.id}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{order.quantity} un</span>
                      </div>
                      <div className="text-base font-bold text-gray-900">{order.name}</div>
                      <div className="text-xs text-gray-400 font-medium">{order.client}</div>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${data.orderIds.includes(order.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-100 bg-gray-50'}`}>
                      {data.orderIds.includes(order.id) && <CheckCircle2 size={16} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Calendário e Prazo (Foco em Agilidade) */}
        <div className="w-full md:w-[440px] bg-slate-50 p-8 flex flex-col border-l border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <CalendarIcon size={14} className="text-blue-500" /> Agendamento Rápido
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400">
              <X size={22} />
            </button>
          </div>

          {/* Duração em destaque */}
          <div className="mb-6 p-6 bg-white rounded-[24px] shadow-sm border border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Duração da Etapa (Dias)</label>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Clock size={24} />
              </div>
              <input
                type="number"
                min="0"
                value={data.duration}
                onChange={handleDurationChange}
                className="flex-1 text-3xl font-black text-gray-900 outline-none focus:text-blue-600 transition-colors"
                placeholder="0"
              />
              <span className="text-sm font-bold text-gray-300 uppercase">Dias</span>
            </div>
          </div>

          {/* Calendário: Clique para selecionar Início */}
          <div className={`bg-white rounded-[28px] p-6 shadow-xl shadow-slate-200/50 border border-white mb-6 transition-opacity ${!isRoot ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-black text-gray-800 uppercase tracking-widest text-center min-w-[140px]">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-3">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="text-[9px] font-black text-gray-300 text-center py-1">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day, i) => {
                const isSelected = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
                const isStart = startDate && isSameDay(day, startDate);
                const isEnd = endDate && isSameDay(day, endDate);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                return (
                  <button
                    key={i}
                    disabled={!isCurrentMonth}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative aspect-square text-xs font-bold rounded-xl flex items-center justify-center transition-all
                      ${!isCurrentMonth ? 'text-transparent cursor-default' : ''}
                      ${isStart ? 'bg-blue-600 text-white shadow-lg z-10 scale-110' : ''}
                      ${isEnd ? 'bg-blue-600 text-white shadow-lg z-10 scale-110' : ''}
                      ${isSelected && !isStart && !isEnd ? 'bg-blue-50 text-blue-700' : ''}
                      ${!isSelected && isCurrentMonth ? 'hover:bg-blue-100/30 text-gray-700' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {isToday(day) && !isStart && !isEnd && (
                      <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumo de Prazos */}
          <div className="space-y-4 flex-1">
             <div className="p-5 bg-blue-600 text-white rounded-[24px] shadow-lg shadow-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase opacity-60 tracking-widest block mb-1">Início</span>
                  <div className="text-sm font-black">{data.startDate}</div>
                </div>
                <ArrowRight size={20} className="opacity-40" />
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase opacity-60 tracking-widest block mb-1">Entrega Final</span>
                  <div className="text-sm font-black">{data.endDate}</div>
                </div>
             </div>
            
            <div className="bg-blue-50 p-5 rounded-[22px] border border-blue-100 flex gap-4">
               <Info className="text-blue-500 flex-shrink-0" size={18} />
               <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                {isRoot 
                  ? "Selecione a data de início no calendário acima e defina os dias de duração para calcular o prazo automaticamente."
                  : "Esta etapa depende de processos anteriores, por isso a data de início é calculada pelo fluxo. Você pode ajustar apenas a duração."}
               </p>
            </div>
          </div>

          <div className="pt-8 mt-auto flex gap-3">
            <button
              onClick={() => {
                if (confirm('Deseja excluir esta etapa?')) {
                  onDelete(selectedNode.id);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-red-500 hover:bg-red-50 rounded-2xl font-black transition-all text-xs"
            >
              <Trash2 size={16} />
              Excluir
            </button>
            <button
              onClick={onClose}
              className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-black shadow-lg hover:bg-gray-800 transition-all text-sm"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStageModal;

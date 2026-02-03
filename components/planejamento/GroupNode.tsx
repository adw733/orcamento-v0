'use client';

import React from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { ExecutionGroup } from '@/types/planejamento';
import { Users, Calendar, Trash2 } from 'lucide-react';

interface GroupNodeData extends ExecutionGroup {
  onDelete: (groupId: string) => void;
}

const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ data, selected }) => {
  return (
    <>
      {/* Resize handles */}
      <NodeResizer
        isVisible={selected}
        minWidth={400}
        minHeight={300}
        lineClassName="border-2"
        handleClassName="h-3 w-3 bg-white border-2 rounded"
      />
      
      <div
        className={`
          relative rounded-xl p-6 w-full h-full
          border-4 border-dashed transition-all
          ${selected ? 'border-opacity-100 shadow-2xl' : 'border-opacity-50 shadow-lg'}
        `}
        style={{
          borderColor: data.color,
          backgroundColor: `${data.color}08`
        }}
      >
      {/* Header do Grupo */}
      <div 
        className="absolute -top-4 left-6 px-4 py-2 rounded-lg shadow-md flex items-center gap-3 bg-white"
        style={{ borderColor: data.color, borderWidth: '2px' }}
      >
        <div 
          className="p-1.5 rounded-full text-white"
          style={{ backgroundColor: data.color }}
        >
          <Users size={16} />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-sm">{data.name}</h3>
          {data.deadline && (
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
              <Calendar size={12} />
              <span>Prazo: {new Date(data.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete(data.id);
          }}
          className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-colors"
          title="Excluir grupo"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Área interna do grupo */}
      <div className="h-full flex items-center justify-center text-gray-400 text-sm pointer-events-none">
        {data.nodeIds.length === 0 ? (
          <div className="text-center">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p>Arraste tarefas para este grupo</p>
          </div>
        ) : (
          <div className="absolute bottom-4 right-4 bg-white px-3 py-1.5 rounded-full shadow text-xs font-medium">
            {data.nodeIds.length} tarefa(s)
          </div>
        )}
      </div>

      {/* Notas */}
      {data.notes && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-1.5 rounded shadow-sm text-xs max-w-[300px]">
          <p className="text-gray-600 line-clamp-2">{data.notes}</p>
        </div>
      )}
      </div>
    </>
  );
};

export default React.memo(GroupNode);

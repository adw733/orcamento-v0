
import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  Node, 
  applyNodeChanges, 
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowProvider,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { LayoutGrid, CalendarDays } from 'lucide-react';

import Sidebar from './components/Sidebar';
import CustomNode from './components/CustomNode';
import EditStageModal from './components/EditStageModal';
import TimelineView from './components/TimelineView';
import { Order, StageType, ProductionNodeData } from './types';
import { calculateSchedules } from './utils/scheduling';

const nodeTypes = {
  manufacturing: CustomNode,
};

const initialOrders: Order[] = [
  { id: '001', name: 'Camiseta Algodão Azul', client: 'Loja Verão', quantity: 150, color: 'Blue' },
  { id: '002', name: 'Moletom Canguru Vermelho', client: 'SportWay', quantity: 80, color: 'Red' },
  { id: '003', name: 'Camiseta Algodão Vermelha', client: 'Loja Verão', quantity: 120, color: 'Red' },
];

const initialNodes: Node<ProductionNodeData>[] = [
  {
    id: 'node-1',
    type: 'manufacturing',
    position: { x: 50, y: 150 },
    data: { label: 'Compra Tecidos 001/003', type: StageType.PURCHASE, duration: 2, orderIds: ['001', '003'], onDataChange: () => {} },
  },
  {
    id: 'node-2',
    type: 'manufacturing',
    position: { x: 50, y: 350 },
    data: { label: 'Compra Tecidos Moletom', type: StageType.PURCHASE, duration: 3, orderIds: ['002'], onDataChange: () => {} },
  },
  {
    id: 'node-3',
    type: 'manufacturing',
    position: { x: 350, y: 250 },
    data: { label: 'Estampa Mista (Flor)', type: StageType.PRINTING, duration: 1, orderIds: ['001', '003'], onDataChange: () => {} },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-3', source: 'node-1', target: 'node-3', animated: true },
];

type ViewMode = 'graph' | 'calendar';

const AppContent: React.FC = () => {
  const [nodes, setNodes] = useState<Node<ProductionNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');

  // Recalculate schedules whenever graph topology or node durations change
  const scheduledNodes = useMemo(() => {
    return calculateSchedules(nodes, edges);
  }, [nodes, edges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleTimelineNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleAddNode = useCallback((type: StageType) => {
    const newNode: Node<ProductionNodeData> = {
      id: `node-${uuidv4().substring(0, 8)}`,
      type: 'manufacturing',
      position: { x: 250, y: 250 },
      data: { 
        label: `Novo ${type}`, 
        type, 
        duration: 2, 
        orderIds: [],
        onDataChange: () => {} 
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
    
    if (viewMode === 'calendar') {
      setViewMode('graph');
    }
  }, [viewMode]);

  const handleUpdateNode = useCallback((id: string, partialData: Partial<ProductionNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...partialData } };
        }
        return node;
      })
    );
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, []);

  const handleAddOrder = useCallback(() => {
    const newId = (orders.length + 1).toString().padStart(3, '0');
    const newOrder: Order = {
      id: newId,
      name: `Novo Pedido ${newId}`,
      client: 'Cliente Genérico',
      quantity: 50,
      color: 'Gray'
    };
    setOrders([...orders, newOrder]);
  }, [orders]);

  const selectedNode = scheduledNodes.find(n => n.id === selectedNodeId) || null;
  const isRoot = useMemo(() => {
    if (!selectedNodeId) return false;
    return !edges.some(e => e.target === selectedNodeId);
  }, [selectedNodeId, edges]);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <Sidebar 
        orders={orders} 
        onAddNode={handleAddNode} 
        onAddOrder={handleAddOrder}
      />
      
      <div className="flex-1 relative bg-gray-100 flex flex-col h-full">
        {/* Header Control Bar */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between pointer-events-none">
           {/* Legend - Only visible in Graph Mode */}
           {viewMode === 'graph' ? (
             <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex items-center gap-4 pointer-events-auto">
               <div className="text-sm font-bold text-gray-700">Fluxo:</div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div> Compra
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <div className="w-3 h-3 bg-purple-400 rounded-full"></div> Estampa
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <div className="w-3 h-3 bg-pink-400 rounded-full"></div> Costura
                  </div>
               </div>
             </div>
           ) : <div />}

           {/* View Toggle */}
           <div className="bg-white p-1.5 rounded-xl border shadow-sm flex items-center gap-1 pointer-events-auto">
             <button
               onClick={() => setViewMode('graph')}
               className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                 viewMode === 'graph' 
                   ? 'bg-blue-100 text-blue-700 shadow-sm' 
                   : 'text-gray-500 hover:bg-gray-100'
               }`}
             >
               <LayoutGrid size={16} />
               Grafo
             </button>
             <button
               onClick={() => setViewMode('calendar')}
               className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                 viewMode === 'calendar' 
                   ? 'bg-blue-100 text-blue-700 shadow-sm' 
                   : 'text-gray-500 hover:bg-gray-100'
               }`}
             >
               <CalendarDays size={16} />
               Calendário
             </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full h-full relative">
          {viewMode === 'graph' ? (
            <ReactFlow
              nodes={scheduledNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-100/50"
            >
              <Background color="#cbd5e1" gap={20} />
              <Controls />
            </ReactFlow>
          ) : (
            <div className="pt-24 h-full">
              <TimelineView 
                nodes={scheduledNodes} 
                onNodeClick={handleTimelineNodeClick}
                selectedNodeId={selectedNodeId}
              />
            </div>
          )}
        </div>

        {selectedNode && (
          <EditStageModal
            selectedNode={selectedNode}
            allOrders={orders}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
            isRoot={isRoot}
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
};

export default App;

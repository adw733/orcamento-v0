"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { LayoutGrid, CalendarDays, Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

import Sidebar from '@/components/planejamento/Sidebar';
import CustomNode from '@/components/planejamento/CustomNode';
import EditStageModal from '@/components/planejamento/EditStageModal';
import GroupModal from '@/components/planejamento/GroupModal';
import GroupNode from '@/components/planejamento/GroupNode';
import TimelineView from '@/components/planejamento/TimelineView';
import ProductStatusTable, { ProductStageConfig } from '@/components/planejamento/ProductStatusTable';
import { Order, StageType, ProductionNodeData, ExecutionGroup } from '@/types/planejamento';
import { calculateSchedules } from '@/lib/planejamento/scheduling';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';

const nodeTypes = {
  manufacturing: CustomNode,
  group: GroupNode,
};

type ViewMode = 'graph' | 'calendar' | 'tabela';

interface PlanejamentoContentProps {
  onHeaderActions?: (actions: React.ReactNode) => void;
}

const PlanejamentoContent: React.FC<PlanejamentoContentProps> = ({ onHeaderActions }) => {
  const [nodes, setNodes] = useState<Node<ProductionNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tabela');
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<ExecutionGroup[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const { tenantId } = useCurrentUser();
  const { toast } = useToast();

  // Função para criar etapas baseadas na configuração (vinda do bulk edit ou padrão)
  const criarEtapasComConfig = useCallback((pedido: Order, indexProduto: number, stageConfig?: Partial<Record<StageType, boolean>>, stageDates?: Partial<Record<StageType, string>>) => {
    // Se não houver config, usar todas as etapas
    const etapasDisponiveis = [
      StageType.PURCHASE,
      StageType.CUTTING,
      StageType.PRINTING,
      StageType.SEWING,
      StageType.REVISION,
      StageType.PACKING,
      StageType.DELIVERY
    ];

    // Filtrar apenas etapas ativas
    const etapasAtivas = stageConfig
      ? etapasDisponiveis.filter(etapa => stageConfig[etapa] === true)
      : etapasDisponiveis; // Se não houver config, usar todas

    const novasEtapas: Node<ProductionNodeData>[] = [];
    const espacamentoHorizontal = 300;
    const espacamentoVertical = 200;
    const yBase = 100 + (indexProduto * espacamentoVertical);
    const duracaoPadrao = 2; // Duração em dias

    etapasAtivas.forEach((etapa, index) => {
      const nodeId = `${pedido.id}-${etapa.toLowerCase().replace(/\s+/g, '-')}`;
      const xPos = 100 + (index * espacamentoHorizontal);

      // Usar data do stageDates ou undefined
      const startDateStr = stageDates?.[etapa];
      let endDateStr: string | undefined = undefined;
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duracaoPadrao);
        endDateStr = endDate.toISOString().split('T')[0];
        console.log(`[criarEtapas] ${pedido.name} - ${etapa}: startDate=${startDateStr}, endDate=${endDateStr}`);
      }

      novasEtapas.push({
        id: nodeId,
        type: 'manufacturing',
        position: { x: xPos, y: yBase },
        data: {
          label: `${pedido.name} - ${etapa}`,
          type: etapa,
          duration: duracaoPadrao,
          orderIds: [pedido.id],
          productName: pedido.name,
          productId: pedido.id,
          cliente: pedido.client,
          empresa: pedido.empresa,
          quantidade: pedido.quantity,
          startDate: startDateStr,
          endDate: endDateStr,
          manualStartDate: startDateStr,
          onDataChange: () => { }
        }
      });
    });

    return novasEtapas;
  }, []);

  // Handler para aplicar configuração do bulk edit
  const handleApplyBulkEdit = useCallback((configs: ProductStageConfig[]) => {
    const todosNos: Node<ProductionNodeData>[] = [];

    configs.forEach((config, index) => {
      // Encontrar o pedido correspondente
      const pedido = orders.find(o => o.id === config.productId);
      if (!pedido) return;

      // Criar etapas apenas para as selecionadas, com datas
      const nosEtapas = criarEtapasComConfig(pedido, index, config.stages, config.stageDates);
      todosNos.push(...nosEtapas);
    });

    setNodes(todosNos);
    setEdges([]); // Limpar conexões antigas

    const totalEtapas = todosNos.length;
    const totalProdutos = configs.length;

    toast({
      title: "Etapas atualizadas!",
      description: `${totalEtapas} etapa(s) criadas para ${totalProdutos} produto(s).`,
    });
  }, [orders, criarEtapasComConfig, toast]);

  // Carregar orçamentos do Supabase - PRIORIZA ORÇAMENTOS EM EXECUÇÃO
  useEffect(() => {
    const carregarOrcamentos = async () => {
      if (!tenantId) return;

      try {
        setIsLoading(true);

        // 1. Carregar TODOS os produtos primeiro
        const { data: produtosData, error: prodError } = await supabase
          .from('produtos')
          .select('id, nome, codigo')
          .eq('tenant_id', tenantId);

        if (prodError) {
          console.error('Erro ao carregar produtos:', prodError);
          throw prodError;
        }

        // Criar Map para busca rápida de nomes de produtos
        const produtosMap = new Map<string, string>(
          (produtosData || []).map((p: any) => [p.id, p.nome])
        );

        console.log(`Carregados ${produtosData?.length || 0} produtos no Map`);
        console.log('Exemplos de produtos:', Array.from(produtosMap.entries()).slice(0, 3));

        // 2. Buscar APENAS orçamentos em execução (status 4)
        const { data: orcamentos, error } = await supabase
          .from('orcamentos')
          .select('id, numero, status, itens')
          .eq('tenant_id', tenantId)
          .eq('status', '4') // APENAS Em Execução
          .is('deleted_at', null) // Excluir orçamentos na lixeira
          .order('numero', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (orcamentos && orcamentos.length > 0) {
          // Criar um pedido separado para cada produto de cada orçamento
          const pedidos: Order[] = [];

          orcamentos.forEach((orc: any) => {
            // Extrair contato e empresa do número do orçamento
            // Formato esperado: "0208 - PRODUTO - AS CALDEIRARIA - SANDRO"
            //                     [0]      [1]          [2]           [3]
            // Mas pode vir: "0208 - AS CALDEIRARIA - SANDRO" (sem PRODUTO)
            //                [0]          [1]          [2]
            const numeroPartes = orc.numero.split(' - ');

            // Se tiver 4 partes: [numero, produto, empresa, contato]
            // Se tiver 3 partes: [numero, empresa, contato]
            let empresaNome: string;
            let contatoNome: string;

            if (numeroPartes.length === 4) {
              empresaNome = numeroPartes[2];
              contatoNome = numeroPartes[3];
            } else if (numeroPartes.length === 3) {
              empresaNome = numeroPartes[1];
              contatoNome = numeroPartes[2];
            } else {
              empresaNome = 'Empresa não informada';
              contatoNome = numeroPartes[numeroPartes.length - 1] || 'Contato não informado';
            }

            const numeroBase = orc.numero.split(' - ')[0];

            try {
              const itensData = typeof orc.itens === 'string' ? JSON.parse(orc.itens) : orc.itens;
              const items = itensData?.items || [];

              // Criar um pedido para CADA produto do orçamento
              if (items.length > 0) {
                items.forEach((item: any, index: number) => {
                  // Buscar nome do produto no Map pelo produtoId
                  const produtoId = item.produtoId || item.produto_id || item.id_produto;
                  const produtoNome = produtosMap.get(produtoId) || 'Produto não identificado';
                  const quantidade = item.quantidade || item.qtd || item.qty || 0;

                  pedidos.push({
                    id: `${numeroBase}-${index + 1}`, // Ex: 0001-1, 0001-2
                    name: produtoNome,
                    client: contatoNome,
                    empresa: empresaNome,
                    quantity: quantidade,
                    color: getColorForStatus(orc.status),
                    status: orc.status,
                  });
                });
              } else {
                // Se não houver itens, criar um pedido genérico
                pedidos.push({
                  id: numeroBase,
                  name: 'Produto não informado',
                  client: contatoNome,
                  empresa: empresaNome,
                  quantity: 1,
                  color: getColorForStatus(orc.status),
                  status: orc.status,
                });
              }
            } catch (e) {
              console.error('Erro ao processar itens do orçamento:', e);
              // Em caso de erro, criar um pedido genérico
              pedidos.push({
                id: numeroBase,
                name: 'Erro ao carregar produto',
                client: contatoNome,
                empresa: empresaNome,
                quantity: 1,
                color: getColorForStatus(orc.status),
                status: orc.status,
              });
            }
          });

          setOrders(pedidos);

          // NÃO criar etapas automaticamente - aguardar configuração do usuário
          // O usuário deve abrir o modal de edição em massa para escolher as etapas
          setNodes([]);

          // Notificação sobre produtos carregados
          if (pedidos.length > 0) {
            const numOrcamentos = orcamentos.length;
            const numProdutos = pedidos.length;
            toast({
              title: "Produtos carregados",
              description: `${numProdutos} produto(s) de ${numOrcamentos} orçamento(s). Clique em "Editar Etapas" para configurar o planejamento.`,
            });
          }
        } else {
          setOrders([]);
          toast({
            title: "Nenhum orçamento em execução",
            description: "Não há orçamentos em execução para planejar.",
          });
        }
      } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os orçamentos.",
          variant: "destructive",
        });
        setOrders([]); // Limpar orçamentos em caso de erro
      } finally {
        setIsLoading(false);
      }
    };

    carregarOrcamentos();
  }, [tenantId, toast]);

  const getColorForStatus = (status: string): string => {
    const colors: Record<string, string> = {
      '1': '#22c55e', // verde - Finalizado
      '4': '#3b82f6', // azul - Em Execução
      '5': '#eab308', // amarelo - Proposta
    };
    return colors[status] || '#6b7280';
  };

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

  // Detectar quando um node é solto após drag
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'group') return; // Não processar grupos

      // Encontrar se o node está dentro de algum grupo
      const groupNode = nodes.find(n => {
        if (n.type !== 'group') return false;

        // Verificar se o node está dentro da área do grupo
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const groupX = n.position.x;
        const groupY = n.position.y;
        const groupWidth = typeof n.style?.width === 'number' ? n.style.width : 600;
        const groupHeight = typeof n.style?.height === 'number' ? n.style.height : 400;

        return (
          nodeX >= groupX &&
          nodeX <= groupX + groupWidth &&
          nodeY >= groupY &&
          nodeY <= groupY + groupHeight
        );
      });

      if (groupNode) {
        const groupId = groupNode.id.replace('group-', '');

        // Adicionar node ao grupo e definir como filho (parentNode)
        setNodes(prev => prev.map(n => {
          if (n.id === node.id) {
            // Calcular posição relativa ao grupo
            const relativeX = node.position.x - groupNode.position.x;
            const relativeY = node.position.y - groupNode.position.y;

            return {
              ...n,
              data: { ...n.data, groupId },
              parentNode: groupNode.id, // Define o grupo como parent
              position: { x: relativeX, y: relativeY }, // Posição relativa
              extent: 'parent' // Mantém dentro do parent
            };
          }
          return n;
        }));

        setGroups(prev => prev.map(g => {
          if (g.id === groupId && !g.nodeIds.includes(node.id)) {
            return {
              ...g,
              nodeIds: [...g.nodeIds, node.id]
            };
          }
          return g;
        }));

        toast({
          title: 'Tarefa adicionada ao grupo',
          description: `A tarefa foi adicionada ao grupo "${(groupNode.data as any).name}".`,
        });
      } else {
        // Remover do grupo se estava em algum
        const currentGroupId = node.data.groupId;
        if (currentGroupId) {
          setNodes(prev => prev.map(n => {
            if (n.id === node.id) {
              // Converter posição relativa de volta para absoluta
              const parentNode = nodes.find(pn => pn.id === n.parentNode);
              const absoluteX = parentNode ? n.position.x + parentNode.position.x : n.position.x;
              const absoluteY = parentNode ? n.position.y + parentNode.position.y : n.position.y;

              return {
                ...n,
                data: { ...n.data, groupId: undefined },
                parentNode: undefined, // Remove o parent
                position: { x: absoluteX, y: absoluteY }, // Posição absoluta
                extent: undefined
              };
            }
            return n;
          }));

          setGroups(prev => prev.map(g => {
            if (g.id === currentGroupId) {
              return {
                ...g,
                nodeIds: g.nodeIds.filter(id => id !== node.id)
              };
            }
            return g;
          }));
        }
      }
    },
    [nodes, toast]
  );

  // Funções para gerenciar grupos
  const createGroup = useCallback((groupData: Omit<ExecutionGroup, 'id' | 'nodeIds'>) => {
    const newGroup: ExecutionGroup = {
      id: uuidv4(),
      nodeIds: [],
      ...groupData
    };

    setGroups(prev => [...prev, newGroup]);

    // Criar node visual do grupo no canvas
    const groupNode: Node = {
      id: `group-${newGroup.id}`,
      type: 'group',
      position: { x: 100, y: 100 },
      data: {
        ...newGroup,
        onDelete: deleteGroup
      },
      style: {
        width: 600,
        height: 400,
        zIndex: -1
      },
      draggable: true,
      selectable: true
    };

    setNodes(prev => [...prev, groupNode]);

    toast({
      title: 'Grupo criado',
      description: `Grupo "${newGroup.name}" criado com sucesso! Arraste tarefas para dentro dele.`,
    });
  }, [toast]);

  const removeNodeFromGroup = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, groupId: undefined }
        };
      }
      return node;
    }));

    setGroups(prev => prev.map(group => ({
      ...group,
      nodeIds: group.nodeIds.filter(id => id !== nodeId)
    })));
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    const groupNodeId = `group-${groupId}`;

    // Remover grupo e resetar filhos
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setNodes(prev => {
      const groupNode = prev.find(n => n.id === groupNodeId);

      return prev
        .filter(n => n.id !== groupNodeId) // Remove o grupo
        .map(node => {
          if (node.parentNode === groupNodeId) {
            // Converter posição relativa para absoluta
            const absoluteX = groupNode ? node.position.x + groupNode.position.x : node.position.x;
            const absoluteY = groupNode ? node.position.y + groupNode.position.y : node.position.y;

            return {
              ...node,
              data: { ...node.data, groupId: undefined },
              parentNode: undefined,
              position: { x: absoluteX, y: absoluteY },
              extent: undefined
            };
          }
          return node;
        });
    });
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleTimelineNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Handler para quando uma barra de tarefa é arrastada para um novo dia no Gantt
  const handleTaskDateChange = useCallback((nodeId: string, newStartDate: string) => {
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id !== nodeId) return node;

      const duration = node.data.duration || 2;
      const startDate = new Date(newStartDate + 'T12:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
      const endDateStr = endDate.toISOString().split('T')[0];

      return {
        ...node,
        data: {
          ...node.data,
          startDate: newStartDate,
          endDate: endDateStr,
          manualStartDate: newStartDate,
        }
      };
    }));

    toast({
      title: "Tarefa movida!",
      description: `Reagendada para ${new Date(newStartDate + 'T12:00:00').toLocaleDateString('pt-BR')}.`,
    });
  }, [toast]);

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
        onDataChange: () => { }
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

  // Enviar botões de ação para o header do parent (MUST be before any early return)
  useEffect(() => {
    if (!onHeaderActions) return;
    onHeaderActions(
      <>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button
            variant={viewMode === 'tabela' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('tabela')}
            className="gap-2 h-8"
            disabled={orders.length === 0}
          >
            <Package size={15} />
            Etapas
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-2 h-8"
          >
            <CalendarDays size={15} />
            Calendário
          </Button>
          <Button
            variant={viewMode === 'graph' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('graph')}
            className="gap-2 h-8"
          >
            <LayoutGrid size={15} />
            Grafo
          </Button>
        </div>
        {viewMode === 'graph' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGroupModalOpen(true)}
            className="gap-2 h-8"
          >
            <Plus size={15} />
            Novo Grupo
          </Button>
        )}
      </>
    );
  }, [viewMode, orders.length, onHeaderActions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <div className="flex-1 relative bg-muted/30 flex flex-col h-full">
        {/* Content Area */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {/* Tabela de Status de Produtos */}
          {viewMode === 'tabela' && (
            <div className="h-full px-4 pt-2 pb-2 bg-background overflow-y-auto">
              <ProductStatusTable
                orders={orders}
                onConfigChange={handleApplyBulkEdit}
                onClose={() => setViewMode('calendar')}
                tenantId={tenantId}
              />
            </div>
          )}

          {/* Vista Calendário / Timeline */}
          {viewMode === 'calendar' && (
            <TimelineView
              nodes={scheduledNodes}
              onNodeClick={handleTimelineNodeClick}
              selectedNodeId={selectedNodeId}
              onTaskDateChange={handleTaskDateChange}
            />
          )}

          {/* Vista Grafo */}
          {viewMode === 'graph' && (
            <ReactFlow
              nodes={scheduledNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
            >
              <Background color="hsl(var(--muted-foreground) / 0.1)" gap={20} />
              <Controls />
            </ReactFlow>
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

        {/* Modal de Grupos */}
        <GroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onSave={createGroup}
          selectedNodeIds={[]}
        />
      </div>
    </div>
  );
};

interface PlanejamentoFluxoProps {
  onHeaderActions?: (actions: React.ReactNode) => void;
}

export default function PlanejamentoFluxo({ onHeaderActions }: PlanejamentoFluxoProps) {
  return (
    <ReactFlowProvider>
      <PlanejamentoContent onHeaderActions={onHeaderActions} />
    </ReactFlowProvider>
  );
}

import { addDays, format, isBefore, parseISO, differenceInDays } from 'date-fns';
import { Node, Edge } from 'reactflow';
import { ProductionNodeData } from '@/types/planejamento';

export const calculateSchedules = (nodes: Node<ProductionNodeData>[], edges: Edge[]) => {
  const updatedNodes = [...nodes];
  const today = new Date();

  // Create a dependency map
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach(n => {
    adj[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach(e => {
    adj[e.source].push(e.target);
    inDegree[e.target]++;
  });

  // Topological sort / CPM forward pass
  const queue: string[] = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  const startDates: Record<string, Date> = {};

  // Initial nodes start at manualStartDate, startDate
  queue.forEach(id => {
    const node = updatedNodes.find(n => n.id === id);
    if (node?.data.manualStartDate) {
      startDates[id] = parseISO(node.data.manualStartDate);
    } else if (node?.data.startDate) {
      startDates[id] = parseISO(node.data.startDate);
    }
  });

  const processed: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    processed.push(u);

    const nodeIndex = updatedNodes.findIndex(n => n.id === u);
    if (nodeIndex === -1) continue;

    const start = startDates[u];
    if (start) {
      const duration = updatedNodes[nodeIndex].data.duration || 0;
      const end = addDays(start, duration);

      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        data: {
          ...updatedNodes[nodeIndex].data,
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        }
      };

      adj[u].forEach(v => {
        inDegree[v]--;

        // The next node starts only after the LAST parent ends
        if (!startDates[v] || isBefore(startDates[v], end)) {
          startDates[v] = end;
        }

        if (inDegree[v] === 0) {
          queue.push(v);
        }
      });
    } else {
      // If no start date, we still need to process children to keep topological order
      // but they won't have start dates either unless they have multiple parents
      adj[u].forEach(v => {
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      });
    }
  }

  return updatedNodes;
};

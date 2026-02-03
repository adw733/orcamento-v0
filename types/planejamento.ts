export enum StageType {
  PURCHASE = 'Compra Material',
  CUTTING = 'Corte',
  PRINTING = 'Estampa',
  SEWING = 'Costura',
  REVISION = 'Revisão',
  PACKING = 'Embalagem',
  DELIVERY = 'Entrega'
}

export interface ExecutionGroup {
  id: string;
  name: string;
  color: string;
  deadline?: string;
  nodeIds: string[];
  notes?: string;
}

export interface Order {
  id: string;
  name: string;
  client: string;
  empresa?: string; // Nome da empresa
  quantity: number;
  color: string;
  status?: string; // Status do orçamento (1-6)
}

export interface ProductionNodeData {
  label: string;
  type: StageType;
  duration: number; // In days
  orderIds: string[];
  startDate?: string;
  endDate?: string;
  manualStartDate?: string;
  productName?: string; // Nome do produto
  productId?: string; // ID do produto (ex: 0001-1)
  cliente?: string; // Nome do cliente/contato
  empresa?: string; // Nome da empresa
  quantidade?: number; // Quantidade do produto
  groupId?: string; // ID do grupo de execução
  onDataChange: (id: string, newData: Partial<ProductionNodeData>) => void;
}

export interface NodeMetadata {
  id: string;
  data: ProductionNodeData;
}

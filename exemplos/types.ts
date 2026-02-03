
export enum StageType {
  PURCHASE = 'Compra Material',
  CUTTING = 'Corte',
  PRINTING = 'Estampa',
  SEWING = 'Costura',
  REVISION = 'Revisão',
  PACKING = 'Embalagem',
  DELIVERY = 'Entrega'
}

export interface Order {
  id: string;
  name: string;
  client: string;
  quantity: number;
  color: string;
}

export interface ProductionNodeData {
  label: string;
  type: StageType;
  duration: number; // In days
  orderIds: string[];
  startDate?: string;
  endDate?: string;
  manualStartDate?: string;
  onDataChange: (id: string, newData: Partial<ProductionNodeData>) => void;
}

export interface NodeMetadata {
  id: string;
  data: ProductionNodeData;
}

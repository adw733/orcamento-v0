# Planejamento Agent - Sistema de Orçamentos

## Papel
Você é um especialista na lógica de negócio de planejamento de produção, cronogramas e gerenciamento de fluxos de trabalho.

## Conhecimento Técnico

### Stack de Planejamento
- **Gráficos**: React Flow para visualização de fluxos
- **Cronogramas**: date-fns para manipulação de datas
- **State Management**: React hooks (useState, useCallback, useMemo)
- **Types**: TypeScript com tipos específicos de planejamento

### Fluxo de Trabalho
```
Orçamento (status=4)
  → Extrair produtos
  → Configurar etapas (Compra → Corte → Impressão → Costura → Revisão → Embalagem → Entrega)
  → Definir datas de cada etapa
  → Criar grupos de execução
  → Visualizar em grafo ou calendário
  → Acompanhar progresso
```

## Estrutura de Dados

### StageType (Tipos de Etapa)
```typescript
enum StageType {
  PURCHASE = 'Compra',
  CUTTING = 'Corte',
  PRINTING = 'Impressão',
  SEWING = 'Costura',
  REVISION = 'Revisão',
  PACKING = 'Embalagem',
  DELIVERY = 'Entrega'
}
```

### Order (Pedido)
```typescript
interface Order {
  id: string;              // Ex: "0001-1" (orçamento-item)
  name: string;            // Nome do produto
  client: string;          // Nome do contato
  empresa: string;         // Nome da empresa
  quantity: number;        // Quantidade
  color: string;           // Cor para visualização
  status: string;          // Status do orçamento
}
```

### ProductionNodeData (Dados do Nó)
```typescript
interface ProductionNodeData {
  label: string;           // Rótulo do nó
  type: StageType;         // Tipo da etapa
  duration: number;        // Duração em dias
  orderIds: string[];      // IDs dos pedidos
  productName: string;     // Nome do produto
  productId: string;       // ID do produto
  cliente: string;         // Cliente
  empresa: string;         // Empresa
  quantidade: number;      // Quantidade
  startDate?: string;      // Data de início (ISO)
  endDate?: string;        // Data de fim (ISO)
  groupId?: string;        // ID do grupo (se aplicável)
  onDataChange: () => void;
}
```

### ProductStageConfig (Configuração de Etapas)
```typescript
interface ProductStageConfig {
  productId: string;           // ID do produto
  productName: string;         // Nome do produto
  cliente: string;             // Cliente
  quantidade: number;          // Quantidade
  stages: Partial<Record<StageType, boolean>>;  // Etapas ativas
  stageDates: Partial<Record<StageType, string>>; // Datas das etapas
}
```

## Responsabilidades

### 1. Criação de Etapas
- Gerar nós de etapas para cada produto
- Calcular datas automaticamente
- Posicionar nós no grafo
- Conectar etapas em sequência

### 2. Cálculo de Cronogramas
- Calcular datas de início/fim
- Considerar duração padrão (2 dias)
- Sobrepor etapas quando possível
- Calcular data de entrega final

### 3. Gerenciamento de Grupos
- Criar grupos de execução
- Adicionar/remover tarefas de grupos
- Calcular datas baseadas no grupo
- Visualizar grupos no grafo

### 4. Visualização
- Grafo de fluxo (React Flow)
- Timeline/Cronograma
- Tabela de status de produtos
- Alternar entre visualizações

## Lógica de Negócio

### Duração Padrão
```typescript
const DURACAO_PADRAO = 2; // dias

// Cálculo de endDate
function calculateEndDate(startDate: string, duration: number): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + duration);
  return end.toISOString().split('T')[0];
}
```

### Criação de Etapas
```typescript
function criarEtapasComConfig(
  pedido: Order,
  indexProduto: number,
  stageConfig?: Partial<Record<StageType, boolean>>,
  stageDates?: Partial<Record<StageType, string>>
): Node<ProductionNodeData>[] {

  const etapasAtivas = stageConfig
    ? etapasDisponiveis.filter(etapa => stageConfig[etapa] === true)
    : etapasDisponiveis;

  const espacamentoHorizontal = 300;
  const espacamentoVertical = 200;
  const yBase = 100 + (indexProduto * espacamentoVertical);

  return etapasAtivas.map((etapa, index) => {
    const nodeId = `${pedido.id}-${etapa.toLowerCase().replace(/\s+/g, '-')}`;
    const xPos = 100 + (index * espacamentoHorizontal);

    // Usar data do stageDates ou undefined
    const startDateStr = stageDates?.[etapa];
    let endDateStr: string | undefined = undefined;
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + DURACAO_PADRAO);
      endDateStr = endDate.toISOString().split('T')[0];
    }

    return {
      id: nodeId,
      type: 'manufacturing',
      position: { x: xPos, y: yBase },
      data: {
        label: `${pedido.name} - ${etapa}`,
        type: etapa,
        duration: DURACAO_PADRAO,
        orderIds: [pedido.id],
        productName: pedido.name,
        productId: pedido.id,
        cliente: pedido.client,
        empresa: pedido.empresa,
        quantidade: pedido.quantity,
        startDate: startDateStr,
        endDate: endDateStr,
        onDataChange: () => {}
      }
    };
  });
}
```

### Sequenciamento de Etapas
```typescript
// Etapas devem seguir ordem lógica
const ORDEM_ETAPAS = [
  StageType.PURCHASE,
  StageType.CUTTING,
  StageType.PRINTING,
  StageType.SEWING,
  StageType.REVISION,
  StageType.PACKING,
  StageType.DELIVERY
];

// Conectar etapas em sequência
function conectarEtapas(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];

  nodes.forEach((node, index) => {
    if (index < nodes.length - 1) {
      edges.push({
        id: `e-${node.id}-${nodes[index + 1].id}`,
        source: node.id,
        target: nodes[index + 1].id,
        animated: true,
        type: 'smoothstep'
      });
    }
  });

  return edges;
}
```

## Componentes de Planejamento

### 1. ProductStatusTable
Tabela para configurar etapas e datas de cada produto.

**Funcionalidades:**
- Listar todos os produtos dos orçamentos em execução
- Checkbox para ativar/desativar etapas
- Seletor de data para cada etapa ativa
- Seleção por pedido ou produto
- Botão de aplicar configuração

**Arquivo**: `components/planejamento/ProductStatusTable.tsx`

### 2. PlanejamentoFluxo
Componente principal com grafo de fluxo.

**Funcionalidades:**
- Visualizar grafo de etapas
- Arrastar e soltar nós
- Criar/editar grupos
- Alternar para visualização de calendário
- Editar nós individualmente

**Arquivo**: `components/planejamento-fluxo.tsx`

### 3. TimelineView
Visualização de cronograma/timeline.

**Funcionalidades:**
- Mostrar cronograma temporal
- Clicar em nós para editar
- Visualizar sobreposições
- Destacar datas críticas

**Arquivo**: `components/planejamento/TimelineView.tsx`

### 4. CustomNode
Nó customizado para React Flow.

**Funcionalidades:**
- Mostrar informações do produto
- Indicador de status da etapa
- Ícone da etapa
- Cor por tipo de etapa

**Arquivo**: `components/planejamento/CustomNode.tsx`

## Cores e Ícones

### Cores por Etapa
```typescript
const STAGE_COLORS = {
  [StageType.PURCHASE]: 'bg-blue-500',
  [StageType.CUTTING]: 'bg-purple-500',
  [StageType.PRINTING]: 'bg-green-500',
  [StageType.SEWING]: 'bg-yellow-500',
  [StageType.REVISION]: 'bg-orange-500',
  [StageType.PACKING]: 'bg-pink-500',
  [StageType.DELIVERY]: 'bg-teal-500'
};
```

### Ícones por Etapa (lucide-react)
```typescript
import {
  ShoppingCart,        // PURCHASE
  Scissors,           // CUTTING
  Printer,            // PRINTING
  Needle,             // SEWING (custom)
  Search,             // REVISION
  Package,            // PACKING
  Truck               // DELIVERY
} from 'lucide-react';
```

## Estados de Planejamento

### Status de Orçamento
- **5 - Proposta**: Orçamento ainda em proposta (não aparece no planejamento)
- **4 - Execução**: Orçamento em execução (aparece no planejamento)
- **3 - Cobrança**: Em fase de cobrança
- **2 - Entregue**: Entregue ao cliente
- **1 - Finalizada**: Concluído

### Status de Etapa
- **Planejada**: Data definida, não iniciada
- **Em Andamento**: Dentro do período de execução
- **Concluída**: Data final atingida
- **Atrasada**: Data final ultrapassada

## Boas Práticas

### Performance
- Usar `useMemo` para cálculos de schedules
- Usar `useCallback` para handlers de eventos
- Evitar re-renders do React Flow
- Virtualizar listas grandes

### UX
- Feedback visual imediato
- Toasts para ações concluídas
- Confirmação para ações destrutivas
- Loading states para operações longas

### Dados
- Sempre fazer backup antes de alterar
- Validar datas antes de salvar
- Tratar timezone corretamente
- Usar ISO format para datas

## Debugging

### Problemas Comuns

**Etapas não aparecem:**
- Verificar se orçamento está em execução (status=4)
- Verificar se `stageConfig` tem etapas ativas
- Verificar se `tenantId` está definido

**Datas incorretas:**
- Verificar fuso horário (UTC vs local)
- Usar `date-fns` com locale pt-BR
- Armazenar em UTC, exibir em local

**Performance lenta:**
- Limpar nós/edges não usados
- Usar memoização adequada
- Virtualizar listas grandes

### Logs Úteis
```typescript
// Ver produtos carregados
console.log('Carregados X produtos no Map');
console.log('Exemplos de produtos:', produtosMap);

// Ver criação de etapas
console.log(`[criarEtapas] ${pedido.name} - ${etapa}: startDate=${startDateStr}, endDate=${endDateStr}`);

// Ver configuração aplicada
console.log(`Etapas atualizadas: ${totalEtapas} etapa(s) para ${totalProdutos} produto(s)`);
```

## Fluxo de Trabalho Típico

### 1. Acessar Planejamento
```
Dashboard → Orçamentos → 4 - Em Execução → Planejamento
```

### 2. Configurar Etapas
```
1. Clicar em "Editar Etapas"
2. ProductStatusTable abre
3. Para cada produto:
   - Selecionar etapas desejadas (checkbox)
   - Definir data de início de cada etapa (calendário)
4. Clicar em "Aplical" ou fechar modal
5. Etapas são criadas no grafo
```

### 3. Gerenciar Fluxo
```
1. Ver grafo com todas as etapas
2. Arrastar nós para reorganizar
3. Criar grupos se necessário
4. Clicar em nó para editar
5. Alternar para calendário para ver timeline
```

### 4. Acompanhar Progresso
```
1. Ver cronograma em modo calendário
2. Identificar etapas atrasadas
3. Revisar datas se necessário
4. Atualizar status das etapas
```

## Arquivos de Referência

### Componentes
- `components/planejamento-fluxo.tsx` - Fluxo principal
- `components/planejamento/ProductStatusTable.tsx` - Tabela de configuração
- `components/planejamento/TimelineView.tsx` - Visualização temporal
- `components/planejamento/CustomNode.tsx` - Nó customizado
- `components/planejamento/EditStageModal.tsx` - Modal de edição
- `components/planejamento/GroupModal.tsx` - Modal de grupos
- `components/planejamento/GroupNode.tsx` - Nó de grupo

### Tipos
- `types/planejamento.ts` - Todos os tipos de planejamento

### Lógica
- `lib/planejamento/scheduling.ts` - Cálculos de cronograma

## Exemplos de Tarefas

### Adicionar Nova Etapa
```typescript
// 1. Adicionar em StageType enum
enum StageType {
  // ... etapas existentes
  QUALITY = 'Qualidade'
}

// 2. Adicionar cor e ícone
const STAGE_COLORS = {
  // ... cores existentes
  [StageType.QUALITY]: 'bg-indigo-500'
};

// 3. Adicionar em ProductStatusTable
// Adicionar checkbox e calendário para nova etapa
```

### Modificar Duração Padrão
```typescript
// Em planejamento-fluxo.tsx
const DURACAO_PADRAO = 3; // mudar de 2 para 3 dias

// Atualizar cálculo de endDate
endDate.setDate(endDate.getDate() + DURACAO_PADRAO);
```

### Adicionar Filtro de Produtos
```typescript
// Em ProductStatusTable.tsx
const [filtroCliente, setFiltroCliente] = useState<string>('');

// Filtrar configs
const configsFiltradas = configs.filter(config =>
  config.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
);
```

## Integração com Supabase

### Buscar Orçamentos em Execução
```typescript
const { data: orcamentos } = await supabase
  .from('orcamentos')
  .select('id, numero, status, itens')
  .eq('tenant_id', tenantId)
  .eq('status', '4') // Apenas Em Execução
  .is('deleted_at', null)
  .order('numero', { ascending: false })
  .limit(50);
```

### Salvar Configuração de Planejamento
```typescript
// TODO: Implementar tabela de planejamento_config
const { error } = await supabase
  .from('planejamento_config')
  .insert({
    tenant_id: tenantId,
    orcamento_id: orcamentoId,
    produto_id: produtoId,
    stages: stageConfig,
    stage_dates: stageDates,
    created_at: new Date().toISOString()
  });
```

## Ferramentas

- **React Flow**: https://reactflow.dev
- **date-fns**: https://date-fns.org
- **lucide-react**: https://lucide.dev

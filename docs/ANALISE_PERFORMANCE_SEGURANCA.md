# Análise de Performance e Segurança - Sistema de Orçamento

## 📊 Visão Geral do Sistema

### Stack Tecnológico
- **Frontend**: Next.js 15.2.4 com React 19
- **Backend/Database**: Supabase (PostgreSQL 15.8)
- **UI**: TailwindCSS + shadcn/ui + Radix UI
- **PDF**: @react-pdf/renderer, puppeteer
- **Estado**: React hooks (sem gerenciador global)

### Volume de Dados Atual
- **Orçamentos**: 95 registros (75 ativos, 20 excluídos)
- **Itens de Orçamento**: 178 registros
- **Tamanho das tabelas principais**:
  - `orcamentos`: 38MB (principalmente coluna JSON `itens`)
  - `itens_orcamento`: 26MB
  - `gastos_receitas`: 408kB

---

## 🚨 Problemas Identificados

### 1. Performance de Queries

#### Problemas Críticos:
- **SELECT sem limites**: `lista-orcamentos.tsx` carrega TODOS os orçamentos sem paginação
- **SELECT '*' excessivo**: Queries carregam colunas desnecessárias, especialmente JSONB `itens`
- **JSONB redundante**: Tabela `orcamentos` tem coluna `itens` JSONB duplicando dados da tabela `itens_orcamento`
- **N+1 queries**: Múltiplas queries separadas em vez de joins otimizados

#### Exemplos de Problemas:
```typescript
// ❌ PROBLEMA: Carrega todos os orçamentos sem limite
const { data, error } = await supabase
  .from("orcamentos")
  .select("id, numero, data, cliente:cliente_id(nome, cnpj), itens, created_at, updated_at, status, prazo_entrega")
  .is("deleted_at", null)
// .limit(50) ← FALTANDO!
```

### 2. Estrutura de Banco de Dados

#### Problemas de Design:
- **Dados duplicados**: JSON `itens` na tabela `orcamentos` + tabela `itens_orcamento`
- **Índices subutilizados**: Faltam índices compostos para queries comuns
- **Soft delete implementado mas não otimizado**: `deleted_at` sem índice composto

#### Índices Faltantes:
```sql
-- Índices necessários para performance
CREATE INDEX idx_orcamentos_status_deleted_at ON orcamentos(status, deleted_at);
CREATE INDEX idx_orcamentos_cliente_id ON orcamentos(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orcamentos_numero ON orcamentos(numero) WHERE deleted_at IS NULL;
CREATE INDEX idx_itens_orcamento_produto_id ON itens_orcamento(produto_id);
```

### 3. Arquitetura Frontend

#### Problemas:
- **Componentes monolíticos**: `gerador-orcamento.tsx` com 3112 linhas
- **Múltiplas responsabilidades**: Componentes gerenciam estado + queries + UI
- **Re-renders excessivos**: Estados não otimizados causam renders desnecessários
- **Carregamento de dados ineficiente**: Sem cache ou memoização

---

## 🛠️ Soluções Recomendadas (SEM CUSTOS ADICIONAIS)

### 1. Otimizações Imediatas de Queries

#### A. Implementar Paginação
```typescript
// ✅ MELHORIA: Adicionar paginação em todas as listas
const { data, error } = await supabase
  .from("orcamentos")
  .select("id, numero, data, cliente:cliente_id(nome, cnpj), status, created_at")
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
  .range(0, 49) // Primeiros 50 registros
```

#### B. Selecionar Colunas Específicas
```typescript
// ✅ MELHORIA: Evitar carregar JSONB quando não necessário
const { data, error } = await supabase
  .from("orcamentos")
  .select(`
    id, 
    numero, 
    data, 
    status,
    cliente:cliente_id(nome, cnpj),
    created_at,
    updated_at
  `)
  .is("deleted_at", null)
```

#### C. Otimizar Queries com Joins
```typescript
// ✅ MELHORIA: Buscar itens relacionados em uma query
const { data, error } = await supabase
  .from("orcamentos")
  .select(`
    id, numero, data, status,
    cliente:cliente_id(nome, cnpj),
    itens_orcamento(
      id, quantidade, valor_unitario, 
      produto:produto_id(nome, codigo)
    )
  `)
  .is("deleted_at", null)
  .eq("status", "5")
```

### 2. Melhorias no Banco de Dados

#### A. Criar Índices Otimizados
```sql
-- Índices compostos para queries comuns
CREATE INDEX CONCURRENTLY idx_orcamentos_status_deleted_created 
ON orcamentos(status, deleted_at, created_at DESC);

CREATE INDEX CONCURRENTLY idx_orcamentos_cliente_deleted 
ON orcamentos(cliente_id, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_itens_orcamento_produto_quantidade 
ON itens_orcamento(produto_id, quantidade);
```

#### B. Otimizar Estrutura (Longo Prazo)
```sql
-- Remover coluna redundante JSON (após migração completa)
-- ALTER TABLE orcamentos DROP COLUMN itens;

-- Adicionar colunas computadas para performance
ALTER TABLE orcamentos ADD COLUMN valor_total numeric 
GENERATED ALWAYS AS (
  (SELECT COALESCE(SUM(quantidade * valor_unitario), 0) 
   FROM itens_orcamento 
   WHERE itens_orcamento.orcamento_id = orcamentos.id)
) STORED;
```

### 3. Otimizações Frontend

#### A. Implementar Memoização
```typescript
// ✅ MELHORIA: Memoizar componentes pesados
import { memo, useMemo, useCallback } from 'react';

const ListaOrcamentos = memo(function ListaOrcamentos({ ...props }) {
  const orcamentosFiltrados = useMemo(() => {
    return orcamentos.filter(orcamento => 
      orcamento.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orcamento.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orcamentos, searchTerm]);

  const handleSelectOrcamento = useCallback((id: string) => {
    onSelectOrcamento(id);
  }, [onSelectOrcamento]);
});
```

#### B. Implementar Cache Local
```typescript
// ✅ MELHORIA: Cache simples com React Query ou SWR
import { useQuery, useQueryClient } from '@tanstack/react-query';

const useOrcamentos = (pagina: number = 0) => {
  return useQuery({
    queryKey: ['orcamentos', pagina],
    queryFn: () => carregarOrcamentosPaginados(pagina),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
};
```

#### C. Dividir Componentes Grandes
```typescript
// ✅ MELHORIA: Separar responsabilidades
// gerador-orcamento.tsx → dividir em:
// - OrcamentoForm.tsx (formulário principal)
// - OrcamentoItens.tsx (gestão de itens)
// - OrcamentoPreview.tsx (visualização)
// - OrcamentoActions.tsx (botões de ação)
```

### 4. Melhorias de Segurança

#### A. Validar Dados no Cliente
```typescript
// ✅ MELHORIA: Validações com Zod
import { z } from 'zod';

const OrcamentoSchema = z.object({
  numero: z.string().min(1),
  data: z.string().datetime(),
  cliente_id: z.string().uuid().nullable(),
  itens: z.array(z.object({
    produto_id: z.string().uuid(),
    quantidade: z.number().min(1),
    valor_unitario: z.number().min(0)
  }))
});
```

#### B. Implementar RLS (Row Level Security)
```sql
-- ✅ MELHORIA: Políticas de segurança no Supabase
CREATE POLICY "Usuários só podem ver seus orçamentos" ON orcamentos
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários só podem editar seus orçamentos" ON orcamentos
FOR UPDATE USING (auth.uid() = user_id);
```

---

## 📋 Plano de Implementação (Priorizado)

### 🔥 Fase 1: Crítico (1-2 dias)
1. **Adicionar paginação** em `lista-orcamentos.tsx`
2. **Remover SELECT '*'** e usar colunas específicas
3. **Criar índices** básicos no banco
4. **Implementar memoização** em componentes de lista

### ⚡ Fase 2: Importante (1 semana)
1. **Otimizar queries com joins** em vez de N+1
2. **Implementar cache local** simples
3. **Dividir componente `gerador-orcamento.tsx`**
4. **Adicionar validações** com Zod

### 🚀 Fase 3: Otimização Avançada (2-3 semanas)
1. **Migrar dados JSON** para estrutura normalizada
2. **Implementar React Query** para gerenciamento de cache
3. **Adicionar colunas computadas** no banco
4. **Implementar RLS** completo

---

## 💾 Estratégia de Backup

### Backup Automático (Gratuito no Supabase)
```sql
-- Configurar backups diários automáticos
-- Já disponível no plano gratuito do Supabase:
-- - 7 dias de backup point-in-time
-- - Backup diário automático
-- - Exportação manual via SQL
```

### Backup Manual Adicional
```typescript
// ✅ Script de backup local
const exportarDados = async () => {
  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*')
    .is('deleted_at', null);
  
  const { data: itens } = await supabase
    .from('itens_orcamento')
    .select('*');
  
  // Salvar como JSON local
  const backup = {
    data: new Date().toISOString(),
    orcamentos,
    itens
  };
  
  // Download automático
  const blob = new Blob([JSON.stringify(backup, null, 2)]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
};
```

---

## 📈 Métricas de Performance Esperadas

### Antes das Otimizações:
- **Carregamento lista**: 3-5 segundos (todos os registros)
- **Tamanho transferido**: ~2MB por carregamento
- **Queries por página**: 8-12 queries separadas
- **Memory usage**: Alto (JSONB grande)

### Após Otimizações:
- **Carregamento lista**: <500ms (50 registros paginados)
- **Tamanho transferido**: ~50KB por carregamento
- **Queries por página**: 2-3 queries otimizadas
- **Memory usage**: Reduzido em 70%

---

## 🔧 Scripts de Migração

### Script para Criar Índices
```sql
-- migration_001_performance_indexes.sql
CREATE INDEX CONCURRENTLY idx_orcamentos_status_deleted_created 
ON orcamentos(status, deleted_at, created_at DESC);

CREATE INDEX CONCURRENTLY idx_orcamentos_cliente_deleted 
ON orcamentos(cliente_id, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_itens_orcamento_produto_quantidade 
ON itens_orcamento(produto_id, quantidade);

CREATE INDEX CONCURRENTLY idx_clientes_nome_upper 
ON clientes(UPPER(nome));
```

### Script para Limpar Dados
```sql
-- Limpar orçamentos na lixeira antigos (mais de 90 dias)
DELETE FROM orcamentos 
WHERE deleted_at IS NOT NULL 
AND deleted_at < NOW() - INTERVAL '90 days';
```

---

## 🎯 Conclusão

O sistema tem uma base sólida mas precisa de otimizações de performance. As melhorias principais são:

1. **Paginação e seleção específica de colunas** - Impacto imediato
2. **Índices compostos** - Melhora drástica em queries  
3. **Memoização e cache** - Melhora UX significativa
4. **Normalização de dados** - Longo prazo, mas essencial

Todas as soluções propostas utilizam apenas os serviços já contratados (Supabase plano gratuito) e podem ser implementadas gradualmente sem downtime.

**Próximo passo**: Implementar Fase 1 (crítico) para resultados imediatos.

# Database/Backend Agent - Sistema de Orçamentos

## Papel
Você é um especialista em banco de dados Supabase, schema SQL, migrations e consultas otimizadas para o sistema de orçamentos.

## Conhecimento Técnico

### Stack de Banco de Dados
- **SGBD**: PostgreSQL (via Supabase)
- **ORM**: Supabase Client (direto, sem ORM adicional)
- **Migrations**: Supabase Migrations
- **Auth**: Supabase Auth (tenant_id no app_metadata)
- **Storage**: Supabase Storage (para arquivos)

### Estrutura do Banco
```
Schema: public
├── tenants                    # Multi-tenancy
├── usuarios                  # Usuários do sistema
├── produtos                  # Catálogo de produtos
├── materiais                 # Materiais para produção
├── clientes                  # Clientes/Empresas
├── orcamentos                # Orçamentos (header)
├── orcamento_itens           # Itens do orçamento
└── planejamento_etapas       # Etapas de planejamento
```

## Responsabilidades

### 1. Schema Design
- Criar tabelas com colunas apropriadas
- Definir relacionamentos (foreign keys)
- Implementar índices para performance
- Adicionar constraints e defaults
- Documentar schema com comentários

### 2. Migrations
- Criar migrations versionadas
- Usar snake_case para nomes de tabelas/colunas
- Incluir rollback nas migrations
- Testar migrations em ambiente de desenvolvimento
- Documentar mudanças de schema

### 3. RLS (Row Level Security)
- Implementar políticas de segurança por tenant
- Usar `auth.uid()` e `tenant_id` para isolamento
- Testar políticas de acesso
- Documentar cada policy

### 4. Consultas Otimizadas
- Usar índices apropriados
- Evitar N+1 queries
- Usar joins quando necessário
- Paginar resultados grandes
- Cachear consultas frequentes

## Schema Atual

### Tabela: tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: usuarios
```sql
CREATE TABLE usuarios (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  papel VARCHAR(50) DEFAULT 'user',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
-- RLS: Usuários só vêem dados do próprio tenant
```

### Tabela: produtos
```sql
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(100),
  descricao TEXT,
  valor_custo DECIMAL(10,2),
  valor_venda DECIMAL(10,2),
  unidade VARCHAR(20) DEFAULT 'un',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Index: idx_produtos_tenant_id
```

### Tabela: orcamentos
```sql
CREATE TABLE orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  numero VARCHAR(50) NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  status VARCHAR(20) DEFAULT 'proposta', -- proposta, execucao, finalizado, etc
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_entrega DATE,
  prazo_dias INTEGER,
  valor_total DECIMAL(12,2),
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  observacoes TEXT,
  itens JSONB, -- Estrutura JSON com itens do orçamento
  deleted_at TIMESTAMP, -- Soft delete
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Index: idx_orcamentos_tenant_status
-- Index: idx_orcamentos_numero
```

### Tabela: clientes
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Convenções de Nomenclatura

### Tabelas e Colunas
- **Tabelas**: snake_case plural (`orcamentos`, `produtos`)
- **Colunas**: snake_case (`tenant_id`, `data_entrega`)
- **PK**: `id` (UUID)
- **FK**: `{tabela}_id` (`cliente_id`, `tenant_id`)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`

### Tipos de Dados
- **IDs**: `UUID`
- **Dinheiro**: `DECIMAL(10,2)` ou `DECIMAL(12,2)`
- **Datas**: `DATE` ou `TIMESTAMP`
- **Status**: `VARCHAR(20)` com valores específicos
- **JSON**: `JSONB` para dados estruturados

## Boas Práticas

### Multi-tenancy
```sql
-- SEMPRE incluir tenant_id nas queries
SELECT * FROM produtos
WHERE tenant_id = auth.uid()
  AND deleted_at IS NULL;

-- Nas migrations, adicionar:
ALTER TABLE produtos ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_produtos_tenant_id ON produtos(tenant_id);
```

### Soft Delete
```sql
-- Usar deleted_at em vez de DELETE
UPDATE orcamentos SET deleted_at = NOW() WHERE id = $1;

-- Nas queries, SEMPRE verificar:
SELECT * FROM orcamentos
WHERE tenant_id = $1
  AND deleted_at IS NULL;
```

### JSONB para Itens
```sql
-- Estrutura de itens do orçamento
CREATE TABLE orcamentos (
  itens JSONB DEFAULT '{
    "items": [
      {
        "produtoId": "uuid",
        "quantidade": 10,
        "valorUnitario": 100.00,
        "subtotal": 1000.00
      }
    ],
    "total": 1000.00
  }'::jsonb
);
```

## Migrations

### Estrutura de Migration
```sql
-- migrations/XXX_add_feature.sql

-- Up
ALTER TABLE produtos ADD COLUMN nova_coluna VARCHAR(100);
CREATE INDEX idx_produtos_nova_coluna ON produtos(nova_coluna);

-- Down (Rollback)
DROP INDEX IF EXISTS idx_produtos_nova_coluna;
ALTER TABLE produtos DROP COLUMN IF EXISTS nova_coluna;
```

### Aplicar Migration
```bash
# Via Supabase CLI
supabase migration up nome_da_migration

# Via código (não recomendado em produção)
npm run migration:apply
```

## RLS Policies

### Exemplo de Policies
```sql
-- Habilitar RLS
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas do seu tenant
CREATE POLICY "Users can view own tenant"
ON orcamentos FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM usuarios
    WHERE id = auth.uid()
  )
);

-- Policy: Usuários podem inserir do seu tenant
CREATE POLICY "Users can insert own tenant"
ON orcamentos FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM usuarios
    WHERE id = auth.uid()
  )
);

-- Policy: Apenas itens não deletados
CREATE POLICY "No soft deletes"
ON orcamentos FOR ALL
USING (deleted_at IS NULL);
```

## Consultas com Supabase Client

### Exemplos de Código
```typescript
import { supabase } from '@/lib/supabase';

// SELECT com filtros
const { data, error } = await supabase
  .from('produtos')
  .select('*')
  .eq('tenant_id', tenantId)
  .is('deleted_at', null)
  .order('nome', { ascending: true });

// INSERT
const { data, error } = await supabase
  .from('orcamentos')
  .insert({
    tenant_id: tenantId,
    numero: '0001',
    cliente_id: clientId,
    status: 'proposta'
  });

// UPDATE
const { error } = await supabase
  .from('produtos')
  .update({ valor_venda: 150.00 })
  .eq('id', productId)
  .eq('tenant_id', tenantId);

// Soft Delete
const { error } = await supabase
  .from('orcamentos')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', orcamentoId);
```

## Performance

### Otimizações
```sql
-- Criar índices compostos
CREATE INDEX idx_orcamentos_tenant_status
ON orcamentos(tenant_id, status)
WHERE deleted_at IS NULL;

-- Usar COALESCE para valores nulos
SELECT COALESCE(valor_venda, 0) AS valor FROM produtos;

-- Paginar queries grandes
SELECT * FROM orcamentos
LIMIT 50 OFFSET 0;

-- Usar views para queries complexas
CREATE VIEW vw_orcamentos_resumo AS
SELECT
  o.id,
  o.numero,
  c.nome AS cliente,
  o.status,
  o.valor_total
FROM orcamentos o
LEFT JOIN clientes c ON o.cliente_id = c.id;
```

## Debugging

### Ver Queries Executadas
```typescript
// Ativar log de queries no Supabase client
supabase.on('postgres', (payload) => {
  console.log('Query:', payload);
});
```

### Testar Queries
```sql
-- Testar no SQL Editor do Supabase Dashboard
EXPLAIN ANALYZE SELECT * FROM produtos WHERE tenant_id = '...';
```

## Backup e Restore

### Backup
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Via script do sistema
npm run backup:database
```

### Restore
```bash
# Via Supabase CLI
supabase db reset --db-url "postgresql://..."

# Via script do sistema
npm run restore:database
```

## Segurança

### Melhores Práticas
- Nunca expor `service_role_key` no client
- Sempre validar `tenant_id` nas queries
- Usar RLS para todas as tabelas
- Rotacionar chaves periodicamente
- Monitorar queries suspeitas via Supabase Dashboard

## Arquivos de Referência

### Configuração
- `lib/supabase/client.ts` - Client browser
- `lib/supabase/server.ts` - Server actions
- `lib/supabase/middleware.ts` - Middleware de autenticação

### Migrations
- Backup em `backup_supabase/`
- Histórico de migrations no Supabase Dashboard

## Ferramentas Úteis

- **Supabase Dashboard**: https://app.supabase.com
- **SQL Editor**: Testar queries diretamente
- **Database Reports**: Ver performance e queries lentas
- **Table Editor**: Interface visual para dados

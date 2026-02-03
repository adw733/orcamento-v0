-- =====================================================
-- CRIAÇÃO DA TABELA TAREFAS_PLANEJAMENTO
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Criar a tabela de tarefas de planejamento
CREATE TABLE IF NOT EXISTS tarefas_planejamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  dependencias TEXT[], -- Array de UUIDs de tarefas dependentes
  cor VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
  responsavel VARCHAR(255),
  observacoes TEXT,
  duracao_horas INTEGER DEFAULT 24, -- Duração estimada em horas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_tenant ON tarefas_planejamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_orcamento ON tarefas_planejamento(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_status ON tarefas_planejamento(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_datas ON tarefas_planejamento(data_inicio, data_fim);

-- 3. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tarefas_planejamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tarefas_planejamento_updated_at
  BEFORE UPDATE ON tarefas_planejamento
  FOR EACH ROW
  EXECUTE FUNCTION update_tarefas_planejamento_updated_at();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE tarefas_planejamento ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS para isolamento multi-tenant
CREATE POLICY "tenant_select" ON tarefas_planejamento FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON tarefas_planejamento FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON tarefas_planejamento FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON tarefas_planejamento FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 6. Verificar criação
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tarefas_planejamento'
ORDER BY ordinal_position;

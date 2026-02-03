import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const SQL = `
CREATE TABLE IF NOT EXISTS tarefas_planejamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  dependencias TEXT[],
  cor VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
  responsavel VARCHAR(255),
  observacoes TEXT,
  duracao_horas INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_tenant ON tarefas_planejamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_orcamento ON tarefas_planejamento(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_status ON tarefas_planejamento(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_planejamento_datas ON tarefas_planejamento(data_inicio, data_fim);

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

ALTER TABLE tarefas_planejamento ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarefas_planejamento' AND policyname = 'tenant_select') THEN
    CREATE POLICY "tenant_select" ON tarefas_planejamento FOR SELECT TO authenticated 
    USING (tenant_id = (SELECT get_tenant_id()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarefas_planejamento' AND policyname = 'tenant_insert') THEN
    CREATE POLICY "tenant_insert" ON tarefas_planejamento FOR INSERT TO authenticated 
    WITH CHECK (tenant_id = (SELECT get_tenant_id()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarefas_planejamento' AND policyname = 'tenant_update') THEN
    CREATE POLICY "tenant_update" ON tarefas_planejamento FOR UPDATE TO authenticated 
    USING (tenant_id = (SELECT get_tenant_id()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarefas_planejamento' AND policyname = 'tenant_delete') THEN
    CREATE POLICY "tenant_delete" ON tarefas_planejamento FOR DELETE TO authenticated 
    USING (tenant_id = (SELECT get_tenant_id()));
  END IF;
END $$;
`;

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ 
        success: false, 
        error: 'Variáveis de ambiente não configuradas' 
      }, { status: 500 });
    }
    
    // Criar cliente Supabase com service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Executar SQL
    const { data, error } = await supabase.rpc('exec_sql', { query: SQL });
    
    if (error) {
      console.error('Erro ao executar SQL:', error);
      return Response.json({ 
        success: false, 
        error: error.message,
        hint: 'Você pode executar o SQL manualmente no Supabase Dashboard'
      }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Tabela tarefas_planejamento criada com sucesso!',
      data 
    });
    
  } catch (error: any) {
    console.error('Erro na migration:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

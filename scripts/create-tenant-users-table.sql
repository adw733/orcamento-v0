-- =====================================================
-- CRIAR TABELA TENANT_USERS PARA MULTI-USUÁRIOS POR EMPRESA
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Criar tabela tenant_users
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que cada usuário só pode estar em um tenant uma vez
  UNIQUE(tenant_id, user_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);

-- Habilitar RLS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
DROP POLICY IF EXISTS "tenant_select" ON tenant_users;
DROP POLICY IF EXISTS "tenant_insert" ON tenant_users;
DROP POLICY IF EXISTS "tenant_update" ON tenant_users;
DROP POLICY IF EXISTS "tenant_delete" ON tenant_users;

CREATE POLICY "tenant_select" ON tenant_users FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON tenant_users FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON tenant_users FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON tenant_users FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tenant_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenant_users_updated_at ON tenant_users;
CREATE TRIGGER trigger_update_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_users_updated_at();

-- Verificar criação
SELECT 'Tabela tenant_users criada com sucesso!' as status;

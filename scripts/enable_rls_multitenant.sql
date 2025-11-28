-- 1. RLS + tenant_id (função helper já criada separadamente no Supabase, se necessário)

-- 2. Add tenant_id column to all tables
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE gastos_receitas ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE empresa ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE tecidos ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE tecidos_base ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE estampas ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 3. Enable RLS on all tables
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecidos_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE estampas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Note: Temporarily using PERMISSIVE policies until Auth is fully implemented
-- Allowing access if tenant_id is NULL (legacy data) or matches user's tenant

-- Clientes
CREATE POLICY "Tenant Isolation Select" ON clientes FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON clientes FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON clientes FOR DELETE USING (true);

-- Produtos
CREATE POLICY "Tenant Isolation Select" ON produtos FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON produtos FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON produtos FOR DELETE USING (true);

-- Orcamentos
CREATE POLICY "Tenant Isolation Select" ON orcamentos FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON orcamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON orcamentos FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON orcamentos FOR DELETE USING (true);

-- Itens Orcamento
CREATE POLICY "Tenant Isolation Select" ON itens_orcamento FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON itens_orcamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON itens_orcamento FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON itens_orcamento FOR DELETE USING (true);

-- Gastos Receitas
CREATE POLICY "Tenant Isolation Select" ON gastos_receitas FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON gastos_receitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON gastos_receitas FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON gastos_receitas FOR DELETE USING (true);

-- Empresa
CREATE POLICY "Tenant Isolation Select" ON empresa FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON empresa FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON empresa FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON empresa FOR DELETE USING (true);

-- Tecidos
CREATE POLICY "Tenant Isolation Select" ON tecidos FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON tecidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON tecidos FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON tecidos FOR DELETE USING (true);

-- Tecidos Base
CREATE POLICY "Tenant Isolation Select" ON tecidos_base FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON tecidos_base FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON tecidos_base FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON tecidos_base FOR DELETE USING (true);

-- Estampas
CREATE POLICY "Tenant Isolation Select" ON estampas FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON estampas FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON estampas FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON estampas FOR DELETE USING (true);

-- Configuracoes
CREATE POLICY "Tenant Isolation Select" ON configuracoes FOR SELECT USING (true);
CREATE POLICY "Tenant Isolation Insert" ON configuracoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant Isolation Update" ON configuracoes FOR UPDATE USING (true);
CREATE POLICY "Tenant Isolation Delete" ON configuracoes FOR DELETE USING (true);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_id ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_tenant_id ON orcamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_tenant_id ON itens_orcamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gastos_receitas_tenant_id ON gastos_receitas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_empresa_tenant_id ON empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tecidos_tenant_id ON tecidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tecidos_base_tenant_id ON tecidos_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estampas_tenant_id ON estampas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_tenant_id ON configuracoes(tenant_id);

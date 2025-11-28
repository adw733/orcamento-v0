-- 1. Create helper function to get tenant_id in PUBLIC schema
CREATE OR REPLACE FUNCTION public.get_tenant_id() RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
$$ LANGUAGE sql STABLE;

-- 2. Add tenant_id column and enable RLS
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clientes',
    'produtos',
    'orcamentos',
    'itens_orcamento',
    'gastos_receitas',
    'empresa',
    'tecidos',
    'tecidos_base',
    'estampas',
    'configuracoes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Add column if not exists
    EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.get_tenant_id()', t);
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
    
    -- Create index
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I (tenant_id)', t, t);
    
    -- Drop existing policies to avoid conflicts
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation SELECT" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation INSERT" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation UPDATE" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation DELETE" ON %I', t);

    -- Create policies
    -- SELECT: tenant_id IS NULL OR tenant_id = public.get_tenant_id()
    EXECUTE format('CREATE POLICY "Tenant Isolation SELECT" ON %I FOR SELECT USING (tenant_id IS NULL OR tenant_id = public.get_tenant_id())', t);
    
    -- INSERT: tenant_id = public.get_tenant_id()
    EXECUTE format('CREATE POLICY "Tenant Isolation INSERT" ON %I FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id())', t);
    
    -- UPDATE: tenant_id = public.get_tenant_id()
    EXECUTE format('CREATE POLICY "Tenant Isolation UPDATE" ON %I FOR UPDATE USING (tenant_id = public.get_tenant_id())', t);
    
    -- DELETE: tenant_id = public.get_tenant_id()
    EXECUTE format('CREATE POLICY "Tenant Isolation DELETE" ON %I FOR DELETE USING (tenant_id = public.get_tenant_id())', t);
    
  END LOOP;
END $$;

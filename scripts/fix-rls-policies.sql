-- =====================================================
-- SCRIPT DE CORREÇÃO DE RLS PARA MULTI-TENANT SEGURO
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. TECIDOS - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "tenant_isolation" ON tecidos;
DROP POLICY IF EXISTS "Tenant Isolation SELECT" ON tecidos;
DROP POLICY IF EXISTS "Tenant Isolation INSERT" ON tecidos;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE" ON tecidos;
DROP POLICY IF EXISTS "Tenant Isolation DELETE" ON tecidos;
DROP POLICY IF EXISTS "tenant_select" ON tecidos;
DROP POLICY IF EXISTS "tenant_insert" ON tecidos;
DROP POLICY IF EXISTS "tenant_update" ON tecidos;
DROP POLICY IF EXISTS "tenant_delete" ON tecidos;

CREATE POLICY "tenant_select" ON tecidos FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON tecidos FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON tecidos FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON tecidos FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 2. TECIDOS_BASE - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "tenant_isolation" ON tecidos_base;
DROP POLICY IF EXISTS "Tenant Isolation SELECT" ON tecidos_base;
DROP POLICY IF EXISTS "Tenant Isolation INSERT" ON tecidos_base;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE" ON tecidos_base;
DROP POLICY IF EXISTS "Tenant Isolation DELETE" ON tecidos_base;
DROP POLICY IF EXISTS "tenant_select" ON tecidos_base;
DROP POLICY IF EXISTS "tenant_insert" ON tecidos_base;
DROP POLICY IF EXISTS "tenant_update" ON tecidos_base;
DROP POLICY IF EXISTS "tenant_delete" ON tecidos_base;

CREATE POLICY "tenant_select" ON tecidos_base FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON tecidos_base FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON tecidos_base FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON tecidos_base FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 3. ESTAMPAS - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "tenant_isolation" ON estampas;
DROP POLICY IF EXISTS "Tenant Isolation SELECT" ON estampas;
DROP POLICY IF EXISTS "Tenant Isolation INSERT" ON estampas;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE" ON estampas;
DROP POLICY IF EXISTS "Tenant Isolation DELETE" ON estampas;
DROP POLICY IF EXISTS "tenant_select" ON estampas;
DROP POLICY IF EXISTS "tenant_insert" ON estampas;
DROP POLICY IF EXISTS "tenant_update" ON estampas;
DROP POLICY IF EXISTS "tenant_delete" ON estampas;

CREATE POLICY "tenant_select" ON estampas FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON estampas FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON estampas FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON estampas FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 4. CONFIGURACOES - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "tenant_isolation" ON configuracoes;
DROP POLICY IF EXISTS "Tenant Isolation SELECT" ON configuracoes;
DROP POLICY IF EXISTS "Tenant Isolation INSERT" ON configuracoes;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE" ON configuracoes;
DROP POLICY IF EXISTS "Tenant Isolation DELETE" ON configuracoes;
DROP POLICY IF EXISTS "tenant_select" ON configuracoes;
DROP POLICY IF EXISTS "tenant_insert" ON configuracoes;
DROP POLICY IF EXISTS "tenant_update" ON configuracoes;
DROP POLICY IF EXISTS "tenant_delete" ON configuracoes;

CREATE POLICY "tenant_select" ON configuracoes FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON configuracoes FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON configuracoes FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON configuracoes FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 5. GASTOS_RECEITAS - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "tenant_isolation" ON gastos_receitas;
DROP POLICY IF EXISTS "Tenant Isolation SELECT" ON gastos_receitas;
DROP POLICY IF EXISTS "Tenant Isolation INSERT" ON gastos_receitas;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE" ON gastos_receitas;
DROP POLICY IF EXISTS "Tenant Isolation DELETE" ON gastos_receitas;
DROP POLICY IF EXISTS "tenant_select" ON gastos_receitas;
DROP POLICY IF EXISTS "tenant_insert" ON gastos_receitas;
DROP POLICY IF EXISTS "tenant_update" ON gastos_receitas;
DROP POLICY IF EXISTS "tenant_delete" ON gastos_receitas;

CREATE POLICY "tenant_select" ON gastos_receitas FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON gastos_receitas FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON gastos_receitas FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON gastos_receitas FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 6. TIPOS_TAMANHO - Remover política permissiva e criar novas
DROP POLICY IF EXISTS "Enable all operations for tipos_tamanho" ON tipos_tamanho;
DROP POLICY IF EXISTS "tenant_select" ON tipos_tamanho;
DROP POLICY IF EXISTS "tenant_insert" ON tipos_tamanho;
DROP POLICY IF EXISTS "tenant_update" ON tipos_tamanho;
DROP POLICY IF EXISTS "tenant_delete" ON tipos_tamanho;

CREATE POLICY "tenant_select" ON tipos_tamanho FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_insert" ON tipos_tamanho FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_update" ON tipos_tamanho FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "tenant_delete" ON tipos_tamanho FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

-- 7. Verificar resultado final
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

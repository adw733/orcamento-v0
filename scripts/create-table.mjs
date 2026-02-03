// Script simplificado para criar a tabela via API
import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler .env.local
const envPath = join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]+)=(.+)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

// SQL para criar a tabela
const sql = `
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

CREATE POLICY IF NOT EXISTS "tenant_select" ON tarefas_planejamento FOR SELECT TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY IF NOT EXISTS "tenant_insert" ON tarefas_planejamento FOR INSERT TO authenticated 
WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY IF NOT EXISTS "tenant_update" ON tarefas_planejamento FOR UPDATE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY IF NOT EXISTS "tenant_delete" ON tarefas_planejamento FOR DELETE TO authenticated 
USING (tenant_id = (SELECT get_tenant_id()));
`;

// Extrair project ref da URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('🚀 Executando SQL no Supabase via API...\n');
console.log(`Project: ${projectRef}`);
console.log('Criando tabela tarefas_planejamento...\n');

// Fazer requisição POST para Database API
const url = new URL(`${SUPABASE_URL}/rest/v1/rpc`);

const postData = JSON.stringify({
  query: sql
});

const options = {
  hostname: url.hostname,
  port: 443,
  path: '/rest/v1/rpc',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Prefer': 'return=minimal'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', data || '(empty)');
    
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
      console.log('\n✅ Tabela criada com sucesso!');
      console.log('\n🔄 Recarregue a página do planejamento para ver as mudanças.');
    } else {
      console.log('\n❌ Erro ao criar tabela. Execute manualmente no SQL Editor:');
      console.log(`👉 https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
  console.log(`\n👉 Execute manualmente: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
});

req.write(postData);
req.end();

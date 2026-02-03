// Script para criar a tabela tarefas_planejamento no Supabase
// Execute com: node scripts/run-migration.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
const envPath = path.join(__dirname, '..', '.env.local');
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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas no .env.local');
  process.exit(1);
}

// Ler o arquivo SQL
const sqlPath = path.join(__dirname, 'create_tarefas_planejamento.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('🚀 Executando migration no Supabase...');
console.log(`📄 Lendo arquivo: ${sqlPath}`);
console.log(`🔗 URL: ${SUPABASE_URL}\n`);

// Extrair o host e path da URL
const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

// Primeiro, vamos tentar criar a função exec_sql se não existir
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text) 
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
`;

// Função para fazer requisição HTTP
function makeRequest(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Executar via psql se disponível (método alternativo)
async function executeViaSupabaseCLI() {
  const { execSync } = require('child_process');
  
  try {
    console.log('🔄 Tentando executar via Supabase CLI...\n');
    
    // Tentar executar via psql direto no Supabase
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      throw new Error('Não foi possível extrair o project ref da URL');
    }
    
    console.log(`📦 Project Ref: ${projectRef}`);
    console.log('');
    console.log('⚠️  Método automático não disponível.');
    console.log('');
    console.log('✋ AÇÃO NECESSÁRIA:');
    console.log('');
    console.log('Por favor, execute manualmente o seguinte comando no SQL Editor do Supabase:');
    console.log(`👉 https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('');
    console.log('Ou copie e cole o conteúdo do arquivo:');
    console.log(`📄 ${sqlPath}`);
    console.log('');
    
    // Mostrar o conteúdo do SQL
    console.log('═'.repeat(80));
    console.log('SQL A SER EXECUTADO:');
    console.log('═'.repeat(80));
    console.log(sqlContent);
    console.log('═'.repeat(80));
    
    return false;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

// Executar
(async () => {
  try {
    await executeViaSupabaseCLI();
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
})();

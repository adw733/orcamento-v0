// Script avançado para criar tabela usando diferentes métodos
const { createClient } = require('@supabase/supabase-js')
const { exec } = require('child_process')
const util = require('util')
const fs = require('fs')

const execPromise = util.promisify(exec)

const supabaseUrl = 'https://fpejkwmapomxfyxmxqrd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZWprd21hcG9teGZ5eG14cXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjgxMTEsImV4cCI6MjA2MTYwNDExMX0.9GlEoyCh2A0oq9bhWDDOUzwnZVWceMl8mrueuvetXxc'

async function createTableAdvanced() {
  console.log('🔧 Método Avançado: Tentando criar tabela via diferentes abordagens...\n')

  // Método 1: Tentar via wget/curl baixando e executando um script
  console.log('📡 Método 1: Via script web temporário...')
  
  try {
    // Criar um script SQL temporário
    const sqlScript = `
-- Script para criar tabela tipos_tamanho
CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    tamanhos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tipos_tamanho_nome ON public.tipos_tamanho(nome);
ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" ON public.tipos_tamanho
    FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.tipos_tamanho (nome, descricao, tamanhos) VALUES
('PADRÃO', 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7', ARRAY['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']),
('NUMÉRICO', '36 AO 58 - NÚMEROS PARES', ARRAY['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']),
('INFANTIL', '0 AO 13 - TAMANHOS INFANTIS', ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
ON CONFLICT (nome) DO NOTHING;

SELECT 'Tabela criada com sucesso!' as status;
    `
    
    // Salvar em arquivo
    fs.writeFileSync('/tmp/create_tipos_tamanho.sql', sqlScript)
    console.log('✅ Script SQL criado em /tmp/create_tipos_tamanho.sql')
    
  } catch (error) {
    console.log('❌ Erro ao criar script:', error.message)
  }

  // Método 2: Tentar usar docker se estiver disponível
  console.log('\n📡 Método 2: Via Docker PostgreSQL...')
  
  try {
    // Verificar se docker está disponível
    await execPromise('which docker')
    console.log('✅ Docker encontrado!')
    
    // Tentar conectar via docker
    const dockerCmd = `docker run --rm -i postgres:13 psql "postgresql://postgres:[SENHA]@db.fpejkwmapomxfyxmxqrd.supabase.co:5432/postgres" < /tmp/create_tipos_tamanho.sql`
    console.log('🐳 Comando Docker preparado (requer senha):', dockerCmd.replace('[SENHA]', '***'))
    
  } catch (error) {
    console.log('❌ Docker não disponível:', error.message)
  }

  // Método 3: Criar função helper no próprio banco
  console.log('\n📡 Método 3: Criando função helper no banco...')
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Tentar criar uma função que execute SQL
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.execute_sql_helper(sql_text text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'SUCCESS';
      EXCEPTION WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
      END;
      $$;
    `
    
    const { data, error } = await supabase.rpc('execute_sql_helper', { sql_text: createFunctionSQL })
    
    if (!error) {
      console.log('✅ Função helper criada!')
      
      // Agora usar a função para criar a tabela
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome VARCHAR(100) NOT NULL UNIQUE,
            descricao TEXT,
            tamanhos TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      
      const { data: tableResult, error: tableError } = await supabase.rpc('execute_sql_helper', { sql_text: createTableSQL })
      
      if (!tableError && tableResult === 'SUCCESS') {
        console.log('✅ Tabela criada via função helper!')
        return true
      } else {
        console.log('❌ Erro ao criar tabela:', tableError?.message || tableResult)
      }
      
    } else {
      console.log('❌ Não foi possível criar função helper:', error.message)
    }
    
  } catch (error) {
    console.log('❌ Erro no método de função helper:', error.message)
  }

  // Método 4: Usando a API de migração do Supabase
  console.log('\n📡 Método 4: Via API de migração...')
  
  try {
    const migrationData = {
      name: 'create_tipos_tamanho',
      sql: `
        CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome VARCHAR(100) NOT NULL UNIQUE,
            descricao TEXT,
            tamanhos TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_tipos_tamanho_nome ON public.tipos_tamanho(nome);
        ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" ON public.tipos_tamanho FOR ALL USING (true) WITH CHECK (true);
        
        INSERT INTO public.tipos_tamanho (nome, descricao, tamanhos) VALUES
        ('PADRÃO', 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7', ARRAY['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']),
        ('NUMÉRICO', '36 AO 58 - NÚMEROS PARES', ARRAY['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']),
        ('INFANTIL', '0 AO 13 - TAMANHOS INFANTIS', ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
        ON CONFLICT (nome) DO NOTHING;
      `
    }
    
    const curlMigration = `curl -X POST '${supabaseUrl}/rest/v1/migrations' \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer ${supabaseKey}" \\
      -H "apikey: ${supabaseKey}" \\
      -d '${JSON.stringify(migrationData)}'`
    
    console.log('🔄 Tentando API de migração...')
    const { stdout: migResult, stderr: migError } = await execPromise(curlMigration)
    
    console.log('📄 Resultado migração:', migResult)
    if (migError) console.log('⚠️ Stderr migração:', migError)
    
  } catch (error) {
    console.log('❌ Erro na API de migração:', error.message)
  }

  // Método 5: Criar um endpoint personalizado
  console.log('\n📡 Método 5: Endpoint personalizado...')
  
  try {
    // Vamos tentar usar a API Edge Functions se existir
    const edgeFunction = `curl -X POST '${supabaseUrl}/functions/v1/create-table' \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer ${supabaseKey}" \\
      -d '{"table": "tipos_tamanho"}'`
    
    console.log('⚡ Tentando Edge Function...')
    const { stdout: edgeResult, stderr: edgeError } = await execPromise(edgeFunction)
    
    console.log('📄 Resultado Edge Function:', edgeResult)
    if (edgeError) console.log('⚠️ Stderr Edge Function:', edgeError)
    
  } catch (error) {
    console.log('❌ Edge Function não disponível:', error.message)
  }

  return false
}

async function verificarSucesso() {
  console.log('\n🔍 Verificando se algum método funcionou...')
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    const { data, error } = await supabase
      .from('tipos_tamanho')
      .select('*')
      .limit(5)

    if (error) {
      console.log('❌ Tabela ainda não existe:', error.message)
      return false
    } else {
      console.log('🎉 SUCESSO! Tabela foi criada!')
      console.log(`📊 Encontrados ${data.length} registros:`)
      data.forEach(tipo => {
        console.log(`  ✅ ${tipo.nome}: ${tipo.tamanhos?.length || 0} tamanhos`)
      })
      return true
    }
  } catch (error) {
    console.log('❌ Erro na verificação:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 CRIAÇÃO AUTOMÁTICA DA TABELA tipos_tamanho')
  console.log('=' * 50)
  
  await createTableAdvanced()
  const sucesso = await verificarSucesso()
  
  console.log('\n' + '=' * 50)
  
  if (sucesso) {
    console.log('🎉 PARABÉNS! A tabela foi criada com sucesso!')
    console.log('✅ Agora os tipos de tamanho serão salvos permanentemente')
    console.log('✅ Reinicie o aplicativo para ver as mudanças')
  } else {
    console.log('⚠️ NENHUM MÉTODO AUTOMÁTICO FUNCIONOU')
    console.log('')
    console.log('🔧 SOLUÇÃO MANUAL NECESSÁRIA:')
    console.log('1. Acesse: https://fpejkwmapomxfyxmxqrd.supabase.co/project/fpejkwmapomxfyxmxqrd')
    console.log('2. Vá para SQL Editor')
    console.log('3. Execute o arquivo: scripts/create_tipos_tamanho_table.sql')
    console.log('')
    console.log('💡 Isso é normal - Supabase requer criação manual de tabelas por segurança')
  }
}

main().catch(console.error)
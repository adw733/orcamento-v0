// Script para criar tabela tipos_tamanho via comando direto
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fpejkwmapomxfyxmxqrd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZWprd21hcG9teGZ5eG14cXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjgxMTEsImV4cCI6MjA2MTYwNDExMX0.9GlEoyCh2A0oq9bhWDDOUzwnZVWceMl8mrueuvetXxc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTableViaAPI() {
  console.log('🚀 Criando tabela tipos_tamanho via API...\n')

  try {
    // Método 1: Tentar via função remota (se existir)
    console.log('📡 Tentativa 1: Via função remota...')
    
    const createTableSQL = `
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
    `

    // Tentar executar via rpc
    const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_sql', { sql: createTableSQL })
    
    if (!rpcError) {
      console.log('✅ Tabela criada via função remota!')
    } else {
      console.log('❌ Função remota não disponível:', rpcError.message)
      console.log('\n📡 Tentativa 2: Inserção direta de dados...')
      
      // Método 2: Tentar inserir dados diretamente (se a tabela já existir)
      const tiposPadrao = [
        {
          nome: 'PADRÃO',
          descricao: 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7',
          tamanhos: ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
        },
        {
          nome: 'NUMÉRICO',
          descricao: '36 AO 58 - NÚMEROS PARES',
          tamanhos: ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']
        },
        {
          nome: 'INFANTIL',
          descricao: '0 AO 13 - TAMANHOS INFANTIS',
          tamanhos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
        }
      ]

      let tableExists = false
      
      // Tentar inserir um registro para ver se a tabela existe
      const { data: testData, error: testError } = await supabase
        .from('tipos_tamanho')
        .select('id')
        .limit(1)

      if (!testError) {
        tableExists = true
        console.log('✅ Tabela já existe!')
      } else {
        console.log('❌ Tabela não existe ainda. Erro:', testError.message)
      }

      if (tableExists) {
        // Inserir dados padrão
        console.log('\n📥 Inserindo dados padrão...')
        
        for (const tipo of tiposPadrao) {
          const { data, error } = await supabase
            .from('tipos_tamanho')
            .upsert(tipo, { onConflict: 'nome' })
            .select()

          if (error) {
            console.log(`❌ Erro ao inserir ${tipo.nome}:`, error.message)
          } else {
            console.log(`✅ ${tipo.nome} inserido/atualizado com sucesso`)
          }
        }
        
        return true
      }
    }

    // Método 3: Usar curl para chamar a API de management do Supabase
    console.log('\n📡 Tentativa 3: Via curl para Supabase Management API...')
    
    const { exec } = require('child_process')
    const util = require('util')
    const execPromise = util.promisify(exec)

    // Primeiro vamos tentar um endpoint diferente
    try {
      const curlCommand = `curl -X POST '${supabaseUrl}/rest/v1/rpc/execute_sql' \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer ${supabaseKey}" \\
        -H "apikey: ${supabaseKey}" \\
        -d '{"sql": "CREATE TABLE IF NOT EXISTS public.tipos_tamanho (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, nome VARCHAR(100) NOT NULL UNIQUE, descricao TEXT, tamanhos TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"}'`

      console.log('🌐 Executando curl...')
      const { stdout, stderr } = await execPromise(curlCommand)
      
      if (stderr) {
        console.log('⚠️ Stderr:', stderr)
      }
      
      console.log('📄 Resultado curl:', stdout)
      
    } catch (curlError) {
      console.log('❌ Erro no curl:', curlError.message)
    }

    // Método 4: Criar via PostgreSQL direto (se tivermos as credenciais)
    console.log('\n📡 Tentativa 4: Via execução direta no PostgreSQL...')
    
    // Tentar usar pg para conectar diretamente
    try {
      const pgCommand = `PGPASSWORD='[SUA_SENHA]' psql -h db.fpejkwmapomxfyxmxqrd.supabase.co -p 5432 -d postgres -U postgres -c "CREATE TABLE IF NOT EXISTS public.tipos_tamanho (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, nome VARCHAR(100) NOT NULL UNIQUE, descricao TEXT, tamanhos TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"`
      
      console.log('🐘 Comando PostgreSQL preparado (requer senha):')
      console.log(pgCommand.replace('[SUA_SENHA]', '***'))
      
    } catch (pgError) {
      console.log('❌ PostgreSQL não disponível:', pgError.message)
    }

    return false

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return false
  }
}

// Função para verificar se conseguimos criar a tabela
async function verificarCriacao() {
  console.log('\n🔍 Verificando se a tabela foi criada...')
  
  try {
    const { data, error } = await supabase
      .from('tipos_tamanho')
      .select('*')
      .limit(5)

    if (error) {
      console.log('❌ Tabela ainda não existe:', error.message)
      return false
    } else {
      console.log('✅ Tabela existe e funcionando!')
      console.log(`📊 Encontrados ${data.length} registros:`)
      data.forEach(tipo => {
        console.log(`  - ${tipo.nome}: ${tipo.tamanhos?.length || 0} tamanhos`)
      })
      return true
    }
  } catch (error) {
    console.log('❌ Erro na verificação:', error.message)
    return false
  }
}

// Executar
async function main() {
  const sucesso = await createTableViaAPI()
  const existe = await verificarCriacao()
  
  if (existe) {
    console.log('\n🎉 SUCESSO! Tabela tipos_tamanho está funcionando!')
    console.log('✅ Agora você pode criar tipos de tamanho e eles serão salvos permanentemente')
  } else {
    console.log('\n⚠️ TABELA NÃO FOI CRIADA AUTOMATICAMENTE')
    console.log('📋 Opções disponíveis:')
    console.log('1. Execute o SQL manualmente no painel do Supabase')
    console.log('2. Arquivo SQL: scripts/create_tipos_tamanho_table.sql')
    console.log('3. Instruções: INSTRUCOES_CRIAR_TABELA.md')
    console.log('\n💡 A API do Supabase pode ter limitações para criar tabelas via código')
  }
}

main().catch(console.error)
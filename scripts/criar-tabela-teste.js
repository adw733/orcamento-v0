// Script para criar tabela de teste e verificar conexão com Supabase
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Carregar variáveis de ambiente do arquivo .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const envLines = envContent.split('\n')
  
  envLines.forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  console.log('Certifique-se de que .env.local existe com as variáveis:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=...')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function criarTabelaTeste() {
  try {
    console.log('🔄 Testando conexão com Supabase...\n')

    // Teste básico de conexão
    console.log('1. Verificando conectividade...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('produtos')
      .select('id')
      .limit(1)

    if (connectionError) {
      console.log('❌ Erro de conexão:', connectionError.message)
      return
    } else {
      console.log('✅ Conexão com Supabase estabelecida')
    }

    // Verificar se tabela teste já existe
    console.log('\n2. Verificando se tabela teste_conexao existe...')
    const { data: testeExiste, error: testeExisteError } = await supabase
      .from('teste_conexao')
      .select('*')
      .limit(1)

    if (!testeExisteError) {
      console.log('⚠️  Tabela teste_conexao já existe')
      
      // Listar registros existentes
      const { data: registros, error: registrosError } = await supabase
        .from('teste_conexao')
        .select('*')
        .order('created_at', { ascending: false })

      if (!registrosError && registros) {
        console.log(`📋 Encontrados ${registros.length} registros na tabela teste_conexao`)
        registros.forEach((reg, index) => {
          console.log(`   ${index + 1}. ${reg.mensagem} (${reg.created_at})`)
        })
      }
    } else {
      console.log('📝 Tabela teste_conexao não existe, será criada via SQL')
    }

    // Tentar inserir um registro de teste
    console.log('\n3. Inserindo registro de teste...')
    const agora = new Date().toISOString()
    const { data: novoRegistro, error: insertError } = await supabase
      .from('teste_conexao')
      .insert([
        {
          mensagem: `Teste de conexão executado em ${new Date().toLocaleString('pt-BR')}`,
          usuario_teste: 'Sistema',
          dados_teste: {
            timestamp: agora,
            status: 'sucesso',
            version: '1.0'
          }
        }
      ])
      .select()

    if (insertError) {
      console.log('❌ Erro ao inserir registro:', insertError.message || insertError)
      if (insertError.message && insertError.message.includes('relation "teste_conexao" does not exist')) {
        console.log('\n🛠️  SOLUÇÃO: Execute o seguinte SQL no Supabase Dashboard:')
        console.log('='.repeat(60))
        console.log(`-- Criar tabela de teste
CREATE TABLE IF NOT EXISTS public.teste_conexao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem TEXT NOT NULL,
    usuario_teste VARCHAR(100),
    dados_teste JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.teste_conexao ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY IF NOT EXISTS "Enable all operations for teste_conexao" 
ON public.teste_conexao FOR ALL USING (true) WITH CHECK (true);`)
        console.log('='.repeat(60))
      }
    } else {
      console.log('✅ Registro inserido com sucesso!')
      if (novoRegistro && novoRegistro.length > 0) {
        console.log('📄 Dados inseridos:', novoRegistro[0])
      }
    }

    // Verificar se consegue ler dados
    console.log('\n4. Testando leitura de dados...')
    const { data: todosRegistros, error: readError } = await supabase
      .from('teste_conexao')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (readError) {
      console.log('❌ Erro ao ler dados:', readError.message)
    } else {
      console.log(`✅ Leitura bem-sucedida! ${todosRegistros?.length || 0} registros encontrados`)
      if (todosRegistros && todosRegistros.length > 0) {
        console.log('📋 Últimos registros:')
        todosRegistros.forEach((reg, index) => {
          console.log(`   ${index + 1}. ID: ${reg.id.substring(0, 8)}... | ${reg.mensagem}`)
        })
      }
    }

    console.log('\n🎉 Teste de conexão concluído!')

  } catch (error) {
    console.error('💥 Erro inesperado:', error)
  }
}

// Executar o teste
criarTabelaTeste()

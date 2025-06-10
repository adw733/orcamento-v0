// Script final para criar tabela usando pg (cliente PostgreSQL nativo)
const { Client } = require('pg')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function createTableWithPg() {
  console.log('🔧 CRIAÇÃO DA TABELA VIA POSTGRESQL DIRETO')
  console.log('=' * 50)
  console.log('')
  console.log('🔑 Para criar a tabela, preciso da senha do banco PostgreSQL.')
  console.log('')
  console.log('📍 Para encontrar a senha:')
  console.log('   1. Acesse: https://fpejkwmapomxfyxmxqrd.supabase.co/project/fpejkwmapomxfyxmxqrd/settings/database')
  console.log('   2. Na seção "Connection parameters", copie a "Password"')
  console.log('   3. Ou copie a "Connection string" completa')
  console.log('')

  // Solicitar senha
  const password = await new Promise((resolve) => {
    rl.question('🔐 Digite a senha do banco PostgreSQL: ', (answer) => {
      resolve(answer.trim())
    })
  })

  if (!password) {
    console.log('❌ Senha não fornecida. Abortando.')
    rl.close()
    return
  }

  // Configuração da conexão
  const client = new Client({
    host: 'db.fpejkwmapomxfyxmxqrd.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: {
      rejectUnauthorized: false // Necessário para Supabase
    }
  })

  console.log('\n🚀 Conectando ao banco PostgreSQL...')

  try {
    // Conectar
    await client.connect()
    console.log('✅ Conectado com sucesso!')

    // SQL para criar a tabela
    const createTableSQL = `
      -- Criar tabela tipos_tamanho
      CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          nome VARCHAR(100) NOT NULL UNIQUE,
          descricao TEXT,
          tamanhos TEXT[] NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_tipos_tamanho_nome ON public.tipos_tamanho(nome);
    `

    const enableRLSSQL = `
      ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;
    `

    const createPolicySQL = `
      CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" 
      ON public.tipos_tamanho FOR ALL USING (true) WITH CHECK (true);
    `

    console.log('🏗️ Criando tabela tipos_tamanho...')
    await client.query(createTableSQL)
    console.log('✅ Tabela criada!')

    console.log('📊 Criando índices...')
    await client.query(createIndexSQL)
    console.log('✅ Índices criados!')

    console.log('🔒 Habilitando RLS...')
    await client.query(enableRLSSQL)
    console.log('✅ RLS habilitado!')

    console.log('🛡️ Criando política de segurança...')
    await client.query(createPolicySQL)
    console.log('✅ Política criada!')

    // Inserir dados padrão
    console.log('📥 Inserindo dados padrão...')
    
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

    for (const tipo of tiposPadrao) {
      try {
        const insertSQL = `
          INSERT INTO public.tipos_tamanho (nome, descricao, tamanhos) 
          VALUES ($1, $2, $3)
          ON CONFLICT (nome) DO NOTHING
          RETURNING id;
        `
        
        const result = await client.query(insertSQL, [tipo.nome, tipo.descricao, tipo.tamanhos])
        
        if (result.rows.length > 0) {
          console.log(`   ✅ ${tipo.nome} inserido`)
        } else {
          console.log(`   ℹ️ ${tipo.nome} já existe`)
        }
      } catch (insertError) {
        console.log(`   ❌ Erro ao inserir ${tipo.nome}:`, insertError.message)
      }
    }

    // Verificar resultado
    console.log('\n🔍 Verificando tabela criada...')
    const checkResult = await client.query('SELECT nome, array_length(tamanhos, 1) as qtd_tamanhos FROM public.tipos_tamanho ORDER BY nome')
    
    console.log('📊 Tipos de tamanho na tabela:')
    checkResult.rows.forEach(row => {
      console.log(`   ✅ ${row.nome}: ${row.qtd_tamanhos} tamanhos`)
    })

    console.log('\n🎉 SUCESSO TOTAL!')
    console.log('✅ Tabela tipos_tamanho criada e populada com sucesso!')
    console.log('✅ Agora você pode usar o sistema de tipos de tamanho')
    console.log('✅ Os dados serão salvos permanentemente no banco')
    console.log('✅ Reinicie o aplicativo para ver as mudanças')

  } catch (error) {
    console.log('\n❌ ERRO:', error.message)
    console.log('')
    
    if (error.message.includes('password authentication failed')) {
      console.log('🔐 Senha incorreta. Verifique a senha e tente novamente.')
    } else if (error.message.includes('connect ENOTFOUND')) {
      console.log('🌐 Erro de conexão. Verifique sua internet.')
    } else if (error.message.includes('permission denied')) {
      console.log('🚫 Permissão negada. Use a senha de administrador.')
    } else {
      console.log('💡 Execute o SQL manualmente no painel do Supabase.')
      console.log('📄 Arquivo: scripts/create_tipos_tamanho_table.sql')
    }
  } finally {
    await client.end()
    rl.close()
  }
}

// Executar
createTableWithPg().catch(console.error)
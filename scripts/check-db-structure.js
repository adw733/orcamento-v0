// Script para verificar a estrutura do banco de dados
const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseStructure() {
  try {
    console.log('Verificando estrutura do banco de dados...\n')

    // Verificar se a tabela tipos_tamanho existe
    console.log('1. Verificando tabela tipos_tamanho...')
    const { data: tiposTamanho, error: tiposTamanhoError } = await supabase
      .from('tipos_tamanho')
      .select('*')
      .limit(1)

    if (tiposTamanhoError) {
      console.log('❌ Tabela tipos_tamanho não existe ou há erro:', tiposTamanhoError.message)
      console.log('   Será necessário criar a tabela tipos_tamanho')
    } else {
      console.log('✅ Tabela tipos_tamanho existe')
    }

    // Verificar se a tabela cores existe
    console.log('\n2. Verificando tabela cores...')
    const { data: cores, error: coresError } = await supabase
      .from('cores')
      .select('*')
      .limit(1)

    if (coresError) {
      console.log('❌ Tabela cores não existe ou há erro:', coresError.message)
      console.log('   Será necessário criar a tabela cores')
    } else {
      console.log('✅ Tabela cores existe')
    }

    // Verificar se a tabela tecidos_base existe
    console.log('\n3. Verificando tabela tecidos_base...')
    const { data: tecidosBase, error: tecidosBaseError } = await supabase
      .from('tecidos_base')
      .select('*')
      .limit(1)

    if (tecidosBaseError) {
      console.log('❌ Tabela tecidos_base não existe ou há erro:', tecidosBaseError.message)
      console.log('   Será necessário criar a tabela tecidos_base')
    } else {
      console.log('✅ Tabela tecidos_base existe')
    }

    // Verificar estrutura da tabela produtos para ver se tem a coluna categoria
    console.log('\n4. Verificando estrutura da tabela produtos...')
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('categoria')
      .limit(1)

    if (produtosError) {
      console.log('❌ Erro ao verificar coluna categoria na tabela produtos:', produtosError.message)
    } else {
      console.log('✅ Coluna categoria existe na tabela produtos')
    }

    console.log('\n✅ Verificação da estrutura do banco de dados concluída!')

  } catch (error) {
    console.error('Erro ao verificar estrutura do banco:', error)
  }
}

checkDatabaseStructure()
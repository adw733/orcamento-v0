// Script para criar a tabela tipos_tamanho no Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupTiposTamanhoTable() {
  try {
    console.log('Configurando tabela tipos_tamanho...\n')

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'create-tipos-tamanho-table.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Dividir o SQL em comandos individuais (separados por ;)
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

    console.log(`Executando ${sqlCommands.length} comandos SQL...\n`)

    // Executar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i]
      if (command.length > 0) {
        console.log(`${i + 1}. Executando: ${command.substring(0, 50)}...`)
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: command })
          
          if (error) {
            console.log(`   ❌ Erro: ${error.message}`)
          } else {
            console.log(`   ✅ Sucesso`)
          }
        } catch (err) {
          console.log(`   ❌ Erro: ${err.message}`)
        }
      }
    }

    // Verificar se a tabela foi criada com sucesso
    console.log('\nVerificando se a tabela foi criada...')
    const { data, error } = await supabase
      .from('tipos_tamanho')
      .select('*')
      .limit(5)

    if (error) {
      console.log('❌ Erro ao verificar tabela:', error.message)
      console.log('\nTentando criar a tabela manualmente...')
      
      // Tentar criar a tabela de forma alternativa
      await createTableAlternative()
    } else {
      console.log('✅ Tabela tipos_tamanho criada com sucesso!')
      console.log(`   Encontrados ${data.length} registros iniciais`)
      
      if (data.length > 0) {
        console.log('   Tipos de tamanho disponíveis:')
        data.forEach(tipo => {
          console.log(`   - ${tipo.nome}: ${tipo.tamanhos?.join(', ') || 'sem tamanhos'}`)
        })
      }
    }

  } catch (error) {
    console.error('Erro ao configurar tabela:', error)
  }
}

async function createTableAlternative() {
  try {
    // Criar dados iniciais diretamente usando a API do Supabase
    const tiposIniciais = [
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

    console.log('Inserindo tipos de tamanho iniciais...')
    const { data, error } = await supabase
      .from('tipos_tamanho')
      .insert(tiposIniciais)
      .select()

    if (error) {
      console.log('❌ Erro ao inserir dados:', error.message)
    } else {
      console.log('✅ Dados iniciais inseridos com sucesso!')
      console.log(`   Inseridos ${data.length} tipos de tamanho`)
    }

  } catch (error) {
    console.error('Erro na criação alternativa:', error)
  }
}

setupTiposTamanhoTable()
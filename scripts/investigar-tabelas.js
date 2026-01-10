/**
 * Script para investigar tabelas problemáticas
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './load-env.js'

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const problematicTables = ['materiais', 'movimentacoes_financeiras', 'usuarios']

async function investigateTable(tableName) {
  console.log(`\n🔍 Investigando: ${tableName}`)
  console.log('─'.repeat(50))

  // Teste 1: HEAD request
  console.log('\n1️⃣  Teste HEAD (verificar se existe):')
  try {
    const { error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ❌ Erro: ${error.message} (código: ${error.code})`)
    } else {
      console.log(`   ✅ Tabela existe! Total de registros: ${count || 0}`)
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`)
  }

  // Teste 2: SELECT simples
  console.log('\n2️⃣  Teste SELECT (buscar dados):')
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`   ❌ Erro: ${error.message} (código: ${error.code})`)
      console.log(`   📋 Detalhes:`, JSON.stringify(error, null, 2))
    } else {
      console.log(`   ✅ SELECT funcionou! Registros: ${data?.length || 0}`)
      if (data && data.length > 0) {
        console.log(`   📄 Amostra:`, JSON.stringify(data[0], null, 2))
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`)
  }

  // Teste 3: COUNT
  console.log('\n3️⃣  Teste COUNT:')
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false })
      .limit(0)

    if (error) {
      console.log(`   ❌ Erro: ${error.message}`)
    } else {
      console.log(`   ✅ Count: ${count}`)
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`)
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   INVESTIGAÇÃO DE TABELAS PROBLEMÁTICAS     ║')
  console.log('╚══════════════════════════════════════════════╝')

  for (const table of problematicTables) {
    await investigateTable(table)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Investigação concluída')
}

main()

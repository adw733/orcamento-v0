/**
 * Script para detectar todas as tabelas disponíveis no Supabase
 * Uso: node scripts/detectar-tabelas.js
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './load-env.js'

// Carregar variáveis de ambiente
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function detectTables() {
  console.log('🔍 Detectando tabelas disponíveis no Supabase...\n')

  // Método 1: Tentar buscar via pg_catalog
  try {
    const { data: tables, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      })

    if (!error && tables) {
      console.log('✅ Método 1: RPC executado com sucesso\n')
      tables.forEach(t => console.log(`  - ${t.table_name}`))
      return
    }
  } catch (err) {
    console.log('⚠️  Método 1 (RPC) não disponível, tentando método alternativo...\n')
  }

  // Método 2: Tentar cada tabela conhecida
  const knownTables = [
    'categorias',
    'clientes',
    'configuracoes',
    'cores',
    'empresa',
    'estampas',
    'gastos_receitas',
    'itens_orcamento',
    'materiais',
    'movimentacoes_financeiras',
    'orcamentos',
    'produtos',
    'tecidos',
    'tecidos_base',
    'timeline_pedidos',
    'tipos_tamanho',
    'usuarios',
  ]

  console.log('📋 Testando tabelas conhecidas:\n')

  const existingTables = []
  const nonExistingTables = []

  for (const table of knownTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        existingTables.push(table)
        console.log(`  ✅ ${table}`)
      } else if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        nonExistingTables.push(table)
        console.log(`  ❌ ${table} (não existe)`)
      } else {
        console.log(`  ⚠️  ${table} (erro: ${error.message})`)
      }
    } catch (err) {
      console.log(`  ❌ ${table} (erro: ${err.message})`)
      nonExistingTables.push(table)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMO:')
  console.log('='.repeat(50))
  console.log(`\n✅ Tabelas existentes (${existingTables.length}):\n`)
  console.log(existingTables.map(t => `  - ${t}`).join('\n'))
  
  if (nonExistingTables.length > 0) {
    console.log(`\n❌ Tabelas NÃO existentes (${nonExistingTables.length}):\n`)
    console.log(nonExistingTables.map(t => `  - ${t}`).join('\n'))
  }

  console.log('\n' + '='.repeat(50))
  console.log('💡 SOLUÇÃO:')
  console.log('='.repeat(50))
  console.log('\nAtualize o arquivo scripts/backup-config.js com:')
  console.log('\ntables: [')
  existingTables.forEach(t => console.log(`  '${t}',`))
  console.log('],\n')

  return existingTables
}

detectTables()

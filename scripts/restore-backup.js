/**
 * SISTEMA DE RESTAURAÇÃO DE BACKUP
 * 
 * Restaura dados de um backup específico para o Supabase
 * 
 * Uso: node scripts/restore-backup.js [nome_da_pasta_backup]
 * Exemplo: node scripts/restore-backup.js backup_10_01_26_1430
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import { loadEnv } from './load-env.js'

// Carregar variáveis de ambiente
loadEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
// CONFIGURAÇÃO
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Defina as variáveis de ambiente necessárias')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const projectRoot = path.resolve(__dirname, '..')
const backupBaseDir = path.join(projectRoot, 'backup_supabase')

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase())
    })
  })
}

async function listAvailableBackups() {
  if (!fs.existsSync(backupBaseDir)) {
    return []
  }
  
  const items = fs.readdirSync(backupBaseDir)
  return items.filter(item => {
    const fullPath = path.join(backupBaseDir, item)
    return fs.statSync(fullPath).isDirectory()
  }).sort().reverse() // Mais recentes primeiro
}

async function restoreTable(table, data, mode = 'insert') {
  if (!data || data.length === 0) {
    console.log(`    ℹ️  Tabela vazia, pulando...`)
    return { success: 0, errors: 0 }
  }

  const batchSize = 100
  let success = 0
  let errors = 0

  // Se modo for 'replace', limpar tabela primeiro
  if (mode === 'replace') {
    try {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Deletar tudo
      
      if (deleteError && !deleteError.message.includes('0 rows')) {
        console.log(`    ⚠️  Aviso ao limpar tabela: ${deleteError.message}`)
      }
    } catch (err) {
      console.log(`    ⚠️  Não foi possível limpar a tabela: ${err.message}`)
    }
  }

  // Inserir dados em lotes
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    
    try {
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

      if (error) {
        console.log(`    ⚠️  Erro no lote ${Math.floor(i/batchSize) + 1}: ${error.message}`)
        errors += batch.length
      } else {
        success += batch.length
        process.stdout.write('.')
      }
    } catch (err) {
      errors += batch.length
    }
  }

  return { success, errors }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function runRestore() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║     RESTAURAÇÃO DE BACKUP DO SUPABASE       ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()

  // Obter nome do backup
  let backupName = process.argv[2]

  if (!backupName) {
    console.log('📂 Backups disponíveis:\n')
    const backups = await listAvailableBackups()
    
    if (backups.length === 0) {
      console.log('❌ Nenhum backup encontrado!')
      process.exit(1)
    }

    backups.forEach((name, index) => {
      const metaPath = path.join(backupBaseDir, name, 'metadata.json')
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        console.log(`  ${index + 1}. ${name}`)
        console.log(`     Data: ${new Date(meta.data_backup).toLocaleString('pt-BR')}`)
        console.log(`     Registros: ${meta.estatisticas.total_registros}`)
        console.log()
      } else {
        console.log(`  ${index + 1}. ${name}`)
      }
    })

    console.log('\n❌ Uso: node scripts/restore-backup.js [nome_do_backup]')
    console.log(`Exemplo: node scripts/restore-backup.js ${backups[0]}`)
    process.exit(1)
  }

  const backupDir = path.join(backupBaseDir, backupName)
  const dataDir = path.join(backupDir, 'dados')

  if (!fs.existsSync(backupDir)) {
    console.log(`❌ Backup não encontrado: ${backupDir}`)
    process.exit(1)
  }

  if (!fs.existsSync(dataDir)) {
    console.log(`❌ Pasta de dados não encontrada: ${dataDir}`)
    process.exit(1)
  }

  // Carregar metadata
  const metaPath = path.join(backupDir, 'metadata.json')
  let metadata = {}
  if (fs.existsSync(metaPath)) {
    metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    console.log(`📦 Backup: ${backupName}`)
    console.log(`📅 Data: ${new Date(metadata.data_backup).toLocaleString('pt-BR')}`)
    console.log(`📊 Total de registros: ${metadata.estatisticas.total_registros}`)
    console.log()
  }

  // Confirmar ação
  console.log('⚠️  ATENÇÃO: Esta ação irá sobrescrever dados no banco!')
  const confirm = await askQuestion('Deseja continuar? (sim/não): ')

  if (confirm !== 'sim' && confirm !== 's' && confirm !== 'yes') {
    console.log('❌ Operação cancelada pelo usuário')
    process.exit(0)
  }

  console.log()

  // Escolher modo
  console.log('Modo de restauração:')
  console.log('  1. INSERT/UPDATE (mantém dados existentes, atualiza duplicados)')
  console.log('  2. REPLACE (limpa tabelas antes de inserir)')
  const modeChoice = await askQuestion('Escolha (1 ou 2): ')
  const mode = modeChoice === '2' ? 'replace' : 'insert'

  console.log()
  console.log(`🔄 Modo selecionado: ${mode === 'replace' ? 'REPLACE' : 'INSERT/UPDATE'}`)
  console.log()

  // Listar arquivos JSON
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.startsWith('_'))

  const startTime = Date.now()
  const results = {}

  for (const file of files) {
    const table = file.replace('.json', '')
    const filePath = path.join(dataDir, file)

    try {
      console.log(`📥 Restaurando: ${table}`)
      
      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)

      process.stdout.write('  → Processando ')
      const result = await restoreTable(table, data, mode)
      
      console.log(`\n  ✅ Sucesso: ${result.success} | ❌ Erros: ${result.errors}`)
      
      results[table] = {
        total: data.length,
        success: result.success,
        errors: result.errors
      }

    } catch (error) {
      console.log(`\n  ❌ Erro ao restaurar ${table}: ${error.message}`)
      results[table] = {
        error: error.message
      }
    }
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Resumo final
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║      RESTAURAÇÃO CONCLUÍDA!                 ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()
  console.log(`⏱️  Duração: ${duration}s`)
  console.log(`📊 Tabelas processadas: ${Object.keys(results).length}`)
  
  const totalSuccess = Object.values(results).reduce((sum, r) => sum + (r.success || 0), 0)
  const totalErrors = Object.values(results).reduce((sum, r) => sum + (r.errors || 0), 0)
  
  console.log(`✅ Registros restaurados: ${totalSuccess}`)
  if (totalErrors > 0) {
    console.log(`⚠️  Registros com erro: ${totalErrors}`)
  }
  console.log()
}

// Executar
runRestore()

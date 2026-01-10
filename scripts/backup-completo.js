/**
 * SISTEMA DE BACKUP COMPLETO - SUPABASE
 * 
 * Faz backup de:
 * 1. Todas as tabelas (dados em JSON)
 * 2. Schema SQL (estrutura do banco)
 * 3. Arquivos do Storage (imagens)
 * 4. Configurações e metadata
 * 
 * Uso: node scripts/backup-completo.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'
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
  console.error('❌ ERRO: Defina as variáveis de ambiente:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
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

function getTimestamp() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `backup_${dd}_${mm}_${yy}_${hh}${min}`
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(filepath)
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      } else {
        reject(new Error(`Falha no download: ${response.statusCode}`))
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {})
      reject(err)
    })
  })
}

// ============================================
// 1. BACKUP DAS TABELAS (DADOS)
// ============================================

async function getAllTables() {
  console.log('🔍 Detectando tabelas do banco...')
  
  // Lista de tabelas conhecidas para testar
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

  const existingTables = []

  // Testar cada tabela para ver se existe
  for (const table of knownTables) {
    try {
      // Usar SELECT em vez de HEAD para verificar se tabela realmente existe
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      // Se não der erro, a tabela existe
      if (!error) {
        existingTables.push(table)
      }
    } catch (err) {
      // Tabela não existe - ignorar
    }
  }

  console.log(`✅ ${existingTables.length} tabelas encontradas e acessíveis`)
  return existingTables
}

async function fetchAllRows(table) {
  const pageSize = 1000
  let from = 0
  let allData = []

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)

    if (error) {
      if (error.code === 'PGRST116') {
        // Tabela vazia
        break
      }
      throw error
    }

    if (!data || data.length === 0) break

    allData = allData.concat(data)

    if (data.length < pageSize) break

    from += pageSize
  }

  return allData
}

async function backupTables(backupDir) {
  console.log('\n📊 INICIANDO BACKUP DAS TABELAS...')
  
  const dataDir = path.join(backupDir, 'dados')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const tables = await getAllTables()
  const results = {}

  for (const table of tables) {
    try {
      process.stdout.write(`  → ${table}... `)
      const rows = await fetchAllRows(table)
      
      const filePath = path.join(dataDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8')
      
      results[table] = { rows: rows.length, status: 'success' }
      console.log(`✅ ${rows.length} registros`)
    } catch (error) {
      console.log(`❌ ERRO: ${error.message}`)
      results[table] = { status: 'error', error: error.message }
    }
  }

  // Salvar resumo
  const summaryPath = path.join(dataDir, '_resumo.json')
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf-8')

  return results
}

// ============================================
// 2. BACKUP DO SCHEMA SQL
// ============================================

async function backupSchema(backupDir) {
  console.log('\n🗂️  INICIANDO BACKUP DO SCHEMA...')
  
  const schemaDir = path.join(backupDir, 'schema')
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true })
  }

  try {
    // Buscar schema das tabelas
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_definitions', {})
    
    if (!tablesError && tables) {
      fs.writeFileSync(
        path.join(schemaDir, 'tables.sql'),
        tables,
        'utf-8'
      )
      console.log('  ✅ Schema das tabelas exportado')
    } else {
      console.log('  ⚠️  Função get_table_definitions não encontrada (requer função SQL personalizada)')
    }

    // Alternativa: salvar estrutura em JSON
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')

    if (columns) {
      fs.writeFileSync(
        path.join(schemaDir, 'estrutura.json'),
        JSON.stringify(columns, null, 2),
        'utf-8'
      )
      console.log('  ✅ Estrutura das colunas exportada (JSON)')
    }

  } catch (error) {
    console.log(`  ⚠️  Aviso: ${error.message}`)
  }
}

// ============================================
// 3. BACKUP DO STORAGE (ARQUIVOS/IMAGENS)
// ============================================

async function backupStorage(backupDir) {
  console.log('\n🖼️  INICIANDO BACKUP DO STORAGE...')
  
  const storageDir = path.join(backupDir, 'storage')
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  try {
    // Listar todos os buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.log('  ⚠️  Não foi possível acessar buckets:', bucketsError.message)
      return
    }

    if (!buckets || buckets.length === 0) {
      console.log('  ℹ️  Nenhum bucket encontrado')
      return
    }

    console.log(`  📦 ${buckets.length} bucket(s) encontrado(s)`)

    let totalFiles = 0
    let totalSize = 0

    for (const bucket of buckets) {
      console.log(`\n  📁 Bucket: ${bucket.name}`)
      
      const bucketDir = path.join(storageDir, bucket.name)
      if (!fs.existsSync(bucketDir)) {
        fs.mkdirSync(bucketDir, { recursive: true })
      }

      // Listar arquivos do bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (filesError) {
        console.log(`    ❌ Erro ao listar arquivos: ${filesError.message}`)
        continue
      }

      if (!files || files.length === 0) {
        console.log('    ℹ️  Bucket vazio')
        continue
      }

      console.log(`    → Baixando ${files.length} arquivo(s)...`)

      for (const file of files) {
        if (file.id === null) continue // Pular pastas

        try {
          const { data } = supabase.storage
            .from(bucket.name)
            .getPublicUrl(file.name)

          if (data?.publicUrl) {
            const localPath = path.join(bucketDir, file.name)
            await downloadFile(data.publicUrl, localPath)
            
            totalFiles++
            totalSize += file.metadata?.size || 0
            process.stdout.write('.')
          }
        } catch (err) {
          console.log(`\n    ⚠️  Erro ao baixar ${file.name}: ${err.message}`)
        }
      }

      console.log(`\n    ✅ ${files.length} arquivo(s) salvos`)
    }

    console.log(`\n  📊 Total: ${totalFiles} arquivos (${formatBytes(totalSize)})`)

  } catch (error) {
    console.log(`  ❌ Erro no backup do storage: ${error.message}`)
  }
}

// ============================================
// 4. METADATA E RESUMO
// ============================================

function createMetadata(backupDir, results, startTime) {
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  const metadata = {
    projeto: 'Gerador de Orçamento',
    versao_backup: '2.0',
    data_backup: new Date().toISOString(),
    duracao_segundos: parseFloat(duration),
    supabase_url: SUPABASE_URL,
    conteudo: {
      dados: results,
      schema: 'incluído',
      storage: 'incluído'
    },
    estatisticas: {
      total_tabelas: Object.keys(results).length,
      tabelas_sucesso: Object.values(results).filter(r => r.status === 'success').length,
      total_registros: Object.values(results)
        .filter(r => r.status === 'success')
        .reduce((sum, r) => sum + (r.rows || 0), 0)
    }
  }

  const metaPath = path.join(backupDir, 'metadata.json')
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8')

  return metadata
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function runCompleteBackup() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   BACKUP COMPLETO DO SUPABASE - INICIANDO   ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()
  
  const startTime = Date.now()

  try {
    // Criar diretório de backup
    const timestamp = getTimestamp()
    const backupDir = path.join(backupBaseDir, timestamp)
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    console.log(`📂 Diretório de backup: ${backupDir}\n`)

    // Executar backups
    const results = await backupTables(backupDir)
    await backupSchema(backupDir)
    await backupStorage(backupDir)

    // Criar metadata
    const metadata = createMetadata(backupDir, results, startTime)

    // Criar README
    const readmePath = path.join(backupDir, 'README.md')
    fs.writeFileSync(readmePath, `# Backup Completo do Supabase

**Data:** ${new Date().toLocaleString('pt-BR')}  
**Duração:** ${metadata.duracao_segundos}s  
**Total de registros:** ${metadata.estatisticas.total_registros}

## Conteúdo

- \`dados/\` - Dados das tabelas em formato JSON
- \`schema/\` - Estrutura do banco de dados
- \`storage/\` - Arquivos e imagens
- \`metadata.json\` - Informações do backup

## Como Restaurar

### Dados das Tabelas
\`\`\`bash
node scripts/restore-backup.js ${timestamp}
\`\`\`

### Imagens do Storage
As imagens estão em \`storage/\` e podem ser re-enviadas manualmente pelo painel do Supabase.

## Tabelas Incluídas

${Object.entries(results)
  .map(([table, info]) => `- **${table}**: ${info.rows || 0} registros ${info.status === 'success' ? '✅' : '❌'}`)
  .join('\n')}
`, 'utf-8')

    console.log('\n╔══════════════════════════════════════════════╗')
    console.log('║         BACKUP CONCLUÍDO COM SUCESSO!       ║')
    console.log('╚══════════════════════════════════════════════╝')
    console.log()
    console.log(`📂 Local: ${backupDir}`)
    console.log(`⏱️  Duração: ${metadata.duracao_segundos}s`)
    console.log(`📊 Total de registros: ${metadata.estatisticas.total_registros}`)
    console.log(`✅ Tabelas com sucesso: ${metadata.estatisticas.tabelas_sucesso}/${metadata.estatisticas.total_tabelas}`)
    console.log()

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Executar
runCompleteBackup()

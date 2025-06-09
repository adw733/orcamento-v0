import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Configurações do Supabase (você precisa definir essas variáveis de ambiente)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas!')
  console.log('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Lista de tabelas para backup
const tables = [
  'clientes',
  'produtos', 
  'tecidos',
  'tecidos_base',
  'cores',
  'orcamentos',
  'itens_orcamento',
  'estampas',
  'empresa',
  'configuracoes'
]

async function backupTable(tableName) {
  try {
    console.log(`📊 Fazendo backup da tabela: ${tableName}`)
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
    
    if (error) {
      console.error(`❌ Erro ao fazer backup da tabela ${tableName}:`, error)
      return false
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${tableName}_backup_${timestamp}.json`
    const filepath = path.join(process.cwd(), 'sistema-versao', 'backup_supabase', filename)
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
    console.log(`✅ Backup da tabela ${tableName} salvo: ${filename} (${data?.length || 0} registros)`)
    
    return true
  } catch (err) {
    console.error(`❌ Erro inesperado ao fazer backup da tabela ${tableName}:`, err)
    return false
  }
}

async function createDatabaseBackup() {
  console.log('🚀 Iniciando backup do banco de dados Supabase...')
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`)
  console.log('=' * 50)
  
  const results = []
  
  for (const table of tables) {
    const success = await backupTable(table)
    results.push({ table, success })
  }
  
  console.log('=' * 50)
  console.log('📋 Resumo do backup:')
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`✅ Tabelas com backup bem-sucedido: ${successful}`)
  console.log(`❌ Tabelas com falha: ${failed}`)
  
  if (failed > 0) {
    console.log('\n❌ Tabelas com falha:')
    results.filter(r => !r.success).forEach(r => console.log(`  - ${r.table}`))
  }
  
  // Criar arquivo de metadados do backup
  const metadata = {
    timestamp: new Date().toISOString(),
    tables_backed_up: results.filter(r => r.success).map(r => r.table),
    tables_failed: results.filter(r => !r.success).map(r => r.table),
    total_tables: tables.length,
    successful_backups: successful,
    failed_backups: failed
  }
  
  const metadataFile = path.join(process.cwd(), 'sistema-versao', 'backup_supabase', `backup_metadata_${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))
  
  console.log(`\n📄 Metadados do backup salvos: ${path.basename(metadataFile)}`)
  console.log('🎉 Backup concluído!')
}

// Executar o backup
createDatabaseBackup().catch(console.error)
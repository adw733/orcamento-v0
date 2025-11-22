// Script de backup completo do Supabase para arquivos JSON locais
// Usa apenas serviços já existentes (Supabase + Node)

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Ajuste para ES modules em Node
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// LEIA AS VARIÁVEIS DO AMBIENTE
// Use a service role key apenas em ambiente local/seguro
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar o backup.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
})

// Tabelas principais do schema public a serem salvas
const TABLES = [
  'categorias',
  'clientes',
  'configuracoes',
  'cores',
  'empresa',
  'estampas',
  'gastos_receitas',
  'itens_orcamento',
  'orcamentos',
  'produtos',
  'tecidos',
  'tecidos_base',
  'timeline_pedidos',
  'tipos_tamanho',
]

// Diretório base de backup (ajustado para o projeto atual)
const projectRoot = path.resolve(__dirname, '..')
const backupBaseDir = path.join(projectRoot, 'backup_supabase')

function getDateFolderName() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  return `backup_${dd}_${mm}_${yy}`
}

async function fetchAllRows(table) {
  const pageSize = 1000
  let from = 0
  let to = pageSize - 1
  let allData = []

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false })
      .range(from, to)

    if (error) {
      console.error(`Erro ao buscar dados da tabela ${table}:`, error.message)
      throw error
    }

    if (!data || data.length === 0) {
      break
    }

    allData = allData.concat(data)

    if (data.length < pageSize) {
      break
    }

    from += pageSize
    to += pageSize
  }

  return allData
}

async function runBackup() {
  try {
    // Garantir diretórios
    if (!fs.existsSync(backupBaseDir)) {
      fs.mkdirSync(backupBaseDir, { recursive: true })
    }

    const dateFolder = getDateFolderName()
    const backupDir = path.join(backupBaseDir, dateFolder)

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    console.log(`Iniciando backup para pasta: ${backupDir}`)

    const meta = {
      projeto: 'Gerador de Orçamento',
      data_backup: new Date().toISOString(),
      tabelas: TABLES,
    }

    fs.writeFileSync(path.join(backupDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')

    for (const table of TABLES) {
      console.log(`-> Exportando tabela: ${table}`)
      const rows = await fetchAllRows(table)

      const filePath = path.join(backupDir, `${table}_rows.json`)
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8')

      console.log(`   ${rows.length} registros salvos em ${filePath}`)
    }

    console.log('Backup concluído com sucesso!')
  } catch (error) {
    console.error('Erro durante o backup:', error)
    process.exit(1)
  }
}

runBackup()

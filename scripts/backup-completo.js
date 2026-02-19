/**
 * SISTEMA DE BACKUP COMPLETO - SUPABASE
 * ======================================
 *
 * Salva TUDO que é necessário para restore 100%:
 *
 * 1. DADOS     - Todas as tabelas (detecção automática)
 * 2. SCHEMA    - Estrutura completa do banco (tabelas, colunas, constraints, índices, RLS, funções, triggers)
 * 3. STORAGE   - Todos os arquivos/imagens de todos os buckets (recursivo)
 * 4. AUTH      - Usuários de autenticação (emails, metadata, roles)
 * 5. ENV       - Variáveis de ambiente (censuradas para segurança)
 * 6. PUBLICO   - Arquivos da pasta public/ (imagens locais)
 * 7. RESTORE   - Script SQL completo e guia de restauração
 *
 * Uso: node scripts/backup-completo.js
 * npm run backup
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'
import { spawnSync } from 'child_process'
import { loadEnv } from './load-env.js'

loadEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
// CONFIGURAÇÃO
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não encontradas:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const projectRoot = path.resolve(__dirname, '..')
const backupBaseDir = path.join(projectRoot, 'backup_supabase')

// ============================================
// UTILITÁRIOS
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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function log(msg) { console.log(msg) }
function logOk(msg) { console.log(`  ✅ ${msg}`) }
function logWarn(msg) { console.log(`  ⚠️  ${msg}`) }
function logErr(msg) { console.log(`  ❌ ${msg}`) }
function logInfo(msg) { console.log(`  ℹ️  ${msg}`) }

async function downloadFile(url, filepath, headers = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(filepath)
    const options = { headers }

    protocol.get(url, options, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => { file.close(); resolve(true) })
        file.on('error', reject)
      } else {
        file.close()
        fs.unlink(filepath, () => {})
        reject(new Error(`HTTP ${response.statusCode}`))
      }
    }).on('error', (err) => {
      file.close()
      fs.unlink(filepath, () => {})
      reject(err)
    })
  })
}

// ============================================
// 1. BACKUP DAS TABELAS (DADOS COMPLETOS)
// ============================================

async function detectAllTables() {
  log('  🔍 Detectando todas as tabelas do banco...')

  // Tentar via information_schema primeiro
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (!error && data && data.length > 0) {
      const tables = data.map(r => r.table_name).filter(t => !t.startsWith('_'))
      return tables
    }
  } catch (e) { /* fallback abaixo */ }

  // Fallback: lista ampla de candidatos + detecção por tentativa
  const candidates = [
    'categorias', 'clientes', 'configuracoes', 'cores', 'empresa',
    'estampas', 'gastos_receitas', 'itens_orcamento', 'materiais',
    'movimentacoes_financeiras', 'orcamentos', 'produtos', 'tecidos',
    'tecidos_base', 'timeline_pedidos', 'tipos_tamanho', 'usuarios',
    'tarefas_planejamento', 'pedidos', 'fornecedores', 'notas_fiscais',
    'pagamentos', 'contas', 'categorias_financeiras', 'servicos',
    'logs', 'notificacoes', 'permissoes', 'roles', 'profiles',
  ]

  const found = []
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0)
      if (!error) found.push(table)
    } catch (e) { /* não existe */ }
  }
  return found
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
      if (error.code === 'PGRST116') break
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
  log('\n📊 INICIANDO BACKUP DAS TABELAS...')
  const dataDir = path.join(backupDir, 'dados')
  ensureDir(dataDir)

  const tables = await detectAllTables()
  log(`  ✅ ${tables.length} tabelas encontradas: ${tables.join(', ')}`)

  const results = {}

  for (const table of tables) {
    try {
      process.stdout.write(`  → ${table}... `)
      const rows = await fetchAllRows(table)
      fs.writeFileSync(path.join(dataDir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf-8')
      results[table] = { rows: rows.length, status: 'success' }
      console.log(`✅ ${rows.length} registros`)
    } catch (error) {
      console.log(`❌ ${error.message}`)
      results[table] = { status: 'error', error: error.message }
    }
  }

  fs.writeFileSync(path.join(dataDir, '_resumo.json'), JSON.stringify(results, null, 2), 'utf-8')
  return results
}

// ============================================
// 2. BACKUP DO SCHEMA COMPLETO
// ============================================

async function backupSchema(backupDir) {
  log('\n🗂️  INICIANDO BACKUP DO SCHEMA COMPLETO...')
  const schemaDir = path.join(backupDir, 'schema')
  ensureDir(schemaDir)

  let schemaSQL = '-- ============================================\n'
  schemaSQL += '-- SCHEMA COMPLETO - GERADOR DE ORÇAMENTOS\n'
  schemaSQL += `-- Data: ${new Date().toISOString()}\n`
  schemaSQL += '-- INSTRUÇÕES: Execute este arquivo no SQL Editor do Supabase\n'
  schemaSQL += '-- antes de importar os dados do backup.\n'
  schemaSQL += '-- ============================================\n\n'

  // --- COLUNAS via information_schema ---
  try {
    const { data: cols } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, character_maximum_length, is_nullable, column_default, ordinal_position, udt_name')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position')

    if (cols && cols.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'colunas.json'), JSON.stringify(cols, null, 2), 'utf-8')
      logOk(`Colunas: ${cols.length} colunas em ${[...new Set(cols.map(c => c.table_name))].length} tabelas`)

      // Gerar CREATE TABLE aproximado
      const tableMap = {}
      for (const col of cols) {
        if (!tableMap[col.table_name]) tableMap[col.table_name] = []
        tableMap[col.table_name].push(col)
      }

      schemaSQL += '-- ============================================\n'
      schemaSQL += '-- TABELAS\n'
      schemaSQL += '-- ============================================\n\n'

      for (const [table, columns] of Object.entries(tableMap)) {
        schemaSQL += `-- Tabela: ${table}\n`
        schemaSQL += `CREATE TABLE IF NOT EXISTS public."${table}" (\n`
        const colDefs = columns.map(col => {
          // Mapear tipos para SQL padrão
          let type = col.data_type
          if (col.udt_name === 'uuid') type = 'uuid'
          else if (col.udt_name === 'text') type = 'text'
          else if (col.udt_name === 'jsonb') type = 'jsonb'
          else if (col.udt_name === 'bool') type = 'boolean'
          else if (col.udt_name === 'timestamptz') type = 'timestamptz'
          else if (col.udt_name === 'int4') type = 'integer'
          else if (col.udt_name === 'int8') type = 'bigint'
          else if (col.udt_name === 'numeric') type = 'numeric'
          else if (col.udt_name === 'float8') type = 'float8'
          else if (col.character_maximum_length) type += `(${col.character_maximum_length})`

          let def = `  "${col.column_name}" ${type}`
          if (col.is_nullable === 'NO') def += ' NOT NULL'
          if (col.column_default) def += ` DEFAULT ${col.column_default}`
          return def
        })
        schemaSQL += colDefs.join(',\n')
        schemaSQL += '\n);\n\n'
      }
    } else {
      logWarn('Colunas: não acessível via information_schema (RLS ativo?)')
    }
  } catch (e) {
    logWarn(`Colunas: ${e.message}`)
  }

  // --- CONSTRAINTS ---
  try {
    const { data: constraints } = await supabase
      .from('information_schema.table_constraints')
      .select('table_name, constraint_name, constraint_type')
      .eq('table_schema', 'public')

    if (constraints && constraints.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'constraints.json'), JSON.stringify(constraints, null, 2), 'utf-8')
      logOk(`Constraints: ${constraints.length} exportadas`)
    }
  } catch (e) {
    logWarn(`Constraints: ${e.message}`)
  }

  // --- VIEWS ---
  try {
    const { data: views } = await supabase
      .from('information_schema.views')
      .select('table_name, view_definition')
      .eq('table_schema', 'public')

    if (views && views.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'views.json'), JSON.stringify(views, null, 2), 'utf-8')

      schemaSQL += '-- ============================================\n'
      schemaSQL += '-- VIEWS\n'
      schemaSQL += '-- ============================================\n\n'
      for (const view of views) {
        schemaSQL += `CREATE OR REPLACE VIEW public."${view.table_name}" AS\n${view.view_definition};\n\n`
      }
      logOk(`Views: ${views.length} exportadas`)
    }
  } catch (e) {
    logWarn(`Views: ${e.message}`)
  }

  // --- FUNÇÕES ---
  try {
    const { data: routines } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, data_type, routine_definition, external_language, routine_body')
      .eq('routine_schema', 'public')

    if (routines && routines.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'funcoes.json'), JSON.stringify(routines, null, 2), 'utf-8')
      logOk(`Funções/Procedures: ${routines.length} exportadas`)
    } else {
      logInfo('Nenhuma função customizada encontrada')
    }
  } catch (e) {
    logWarn(`Funções: ${e.message}`)
  }

  // --- ÍNDICES via pg_indexes ---
  try {
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('tablename, indexname, indexdef')
      .eq('schemaname', 'public')

    if (indexes && indexes.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'indices.json'), JSON.stringify(indexes, null, 2), 'utf-8')

      schemaSQL += '-- ============================================\n'
      schemaSQL += '-- ÍNDICES\n'
      schemaSQL += '-- ============================================\n\n'
      for (const idx of indexes) {
        // Pular índices primários que já existem no CREATE TABLE
        if (!idx.indexname.endsWith('_pkey')) {
          schemaSQL += `${idx.indexdef};\n`
        }
      }
      schemaSQL += '\n'
      logOk(`Índices: ${indexes.length} exportados`)
    }
  } catch (e) {
    logWarn(`Índices: ${e.message}`)
  }

  // --- POLÍTICAS RLS via pg_policies ---
  try {
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd, roles, qual, with_check, permissive')
      .eq('schemaname', 'public')

    if (policies && policies.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'rls_policies.json'), JSON.stringify(policies, null, 2), 'utf-8')

      schemaSQL += '-- ============================================\n'
      schemaSQL += '-- POLÍTICAS RLS\n'
      schemaSQL += '-- ============================================\n\n'
      for (const p of policies) {
        schemaSQL += `CREATE POLICY "${p.policyname}" ON public."${p.tablename}"\n`
        schemaSQL += `  AS ${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}\n`
        schemaSQL += `  FOR ${p.cmd}\n`
        if (p.roles && p.roles.length > 0) schemaSQL += `  TO ${p.roles.join(', ')}\n`
        if (p.qual) schemaSQL += `  USING (${p.qual})\n`
        if (p.with_check) schemaSQL += `  WITH CHECK (${p.with_check})\n`
        schemaSQL += ';\n\n'
      }
      logOk(`Políticas RLS: ${policies.length} exportadas`)
    } else {
      logInfo('Nenhuma política RLS encontrada')
    }
  } catch (e) {
    logWarn(`RLS Policies: ${e.message}`)
  }

  // --- TRIGGERS ---
  try {
    const { data: triggers } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, event_object_table, action_timing, action_statement')
      .eq('trigger_schema', 'public')

    if (triggers && triggers.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'triggers.json'), JSON.stringify(triggers, null, 2), 'utf-8')
      logOk(`Triggers: ${triggers.length} exportados`)
    }
  } catch (e) {
    logWarn(`Triggers: ${e.message}`)
  }

  // --- STATUS RLS POR TABELA ---
  try {
    const { data: rlsTables } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')

    if (rlsTables && rlsTables.length > 0) {
      fs.writeFileSync(path.join(schemaDir, 'rls_status.json'), JSON.stringify(rlsTables, null, 2), 'utf-8')

      schemaSQL += '-- ============================================\n'
      schemaSQL += '-- HABILITAR ROW LEVEL SECURITY\n'
      schemaSQL += '-- ============================================\n\n'
      for (const t of rlsTables) {
        if (t.rowsecurity) {
          schemaSQL += `ALTER TABLE public."${t.tablename}" ENABLE ROW LEVEL SECURITY;\n`
        }
      }
      schemaSQL += '\n'
      logOk(`RLS status: ${rlsTables.length} tabelas verificadas`)
    }
  } catch (e) {
    logWarn(`RLS status: ${e.message}`)
  }

  // Salvar SQL final
  fs.writeFileSync(path.join(schemaDir, 'schema_completo.sql'), schemaSQL, 'utf-8')
  logOk('schema_completo.sql gerado - use no SQL Editor do Supabase para restaurar')
}

// ============================================
// 2.5. DUMP COMPLETO VIA pg_dump (SCHEMA + DADOS EM SQL)
// ============================================

async function backupPgDump(backupDir) {
  log('\n🐘 INICIANDO DUMP COMPLETO VIA pg_dump...')
  const schemaDir = path.join(backupDir, 'schema')
  ensureDir(schemaDir)

  // Verificar se pg_dump está disponível
  const pgCheck = spawnSync('pg_dump', ['--version'], { encoding: 'utf-8', shell: false })
  if (pgCheck.error || pgCheck.status !== 0) {
    logWarn('pg_dump não encontrado. Instale com: scoop install postgresql')
    logInfo('O backup JSON dos dados ainda está disponível na pasta dados/')
    return
  }
  const pgVersion = (pgCheck.stdout || '').trim()
  logInfo(`Usando: ${pgVersion}`)

  const dbPassword = process.env.SUPABASE_DB_PASSWORD
  const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\./)?.[1]

  if (!dbPassword) {
    logWarn('SUPABASE_DB_PASSWORD não definida no .env.local — pulando pg_dump')
    logInfo('Adicione SUPABASE_DB_PASSWORD=sua_senha no .env.local para ativar o dump SQL completo')
    return
  }

  if (!projectRef) {
    logWarn('Não foi possível extrair o project_ref da URL do Supabase')
    return
  }

  const host = `db.${projectRef}.supabase.co`
  const port = '5432'
  const user = 'postgres'
  const dbName = 'postgres'
  const commonArgs = [
    '--no-password',
    `--host=${host}`,
    `--port=${port}`,
    `--username=${user}`,
    `--dbname=${dbName}`,
    '--schema=public',
    '--no-owner',
    '--no-privileges',
  ]
  const env = { ...process.env, PGPASSWORD: dbPassword }

  // 1. Schema apenas (DDL: CREATE TABLE, INDEX, RLS, FUNCTIONS, TRIGGERS)
  log('  → Exportando schema (DDL)...')
  const schemaResult = spawnSync('pg_dump', [
    '--schema-only',
    ...commonArgs,
  ], { encoding: 'buffer', shell: false, env, maxBuffer: 1024 * 1024 * 100 /* 100MB */ })

  if (schemaResult.status === 0 && schemaResult.stdout) {
    const outPath = path.join(schemaDir, 'schema_dump_cli.sql')
    fs.writeFileSync(outPath, schemaResult.stdout)
    logOk(`Schema exportado → schema_dump_cli.sql (${formatBytes(schemaResult.stdout.length)})`)
  } else {
    const errMsg = schemaResult.stderr ? schemaResult.stderr.toString().slice(0, 300) : schemaResult.error?.message || 'erro desconhecido'
    logErr(`Erro no dump do schema: ${errMsg}`)
  }

  // 2. Dados apenas (INSERT statements — formato SQL restaurável diretamente)
  log('  → Exportando dados (INSERT SQL) - pode demorar alguns minutos...')
  const dataResult = spawnSync('pg_dump', [
    '--data-only',
    '--disable-triggers',
    ...commonArgs,
  ], { encoding: 'buffer', shell: false, env, maxBuffer: 1024 * 1024 * 1024 /* 1GB */ })

  if (dataResult.status === 0 && dataResult.stdout) {
    const outPath = path.join(schemaDir, 'data_dump_cli.sql')
    fs.writeFileSync(outPath, dataResult.stdout)
    logOk(`Dados exportados → data_dump_cli.sql (${formatBytes(dataResult.stdout.length)})`)
  } else {
    const errMsg = dataResult.stderr ? dataResult.stderr.toString().slice(0, 300) : dataResult.error?.message || 'erro desconhecido'
    logErr(`Erro no dump dos dados: ${errMsg}`)
  }

  log('  ℹ️  Para restaurar via SQL:')
  log('       psql "postgresql://postgres:SENHA@db.project.supabase.co:5432/postgres" -f schema_dump_cli.sql')
  log('       psql "postgresql://postgres:SENHA@db.project.supabase.co:5432/postgres" -f data_dump_cli.sql')
}

// ============================================
// 3. BACKUP DO STORAGE (RECURSIVO)
// ============================================

async function listStorageRecursive(bucketName, prefix = '') {
  const { data: items, error } = await supabase.storage
    .from(bucketName)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (error || !items) return []

  let files = []
  for (const item of items) {
    if (item.id === null) {
      // É uma pasta — recurse
      const subPath = prefix ? `${prefix}/${item.name}` : item.name
      const subFiles = await listStorageRecursive(bucketName, subPath)
      files = files.concat(subFiles)
    } else {
      // É um arquivo
      const filePath = prefix ? `${prefix}/${item.name}` : item.name
      files.push({ path: filePath, metadata: item.metadata, name: item.name })
    }
  }
  return files
}

async function backupStorage(backupDir) {
  log('\n🖼️  INICIANDO BACKUP DO STORAGE (TODOS OS BUCKETS, RECURSIVO)...')
  const storageDir = path.join(backupDir, 'storage')
  ensureDir(storageDir)

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError || !buckets) {
    logWarn(`Não foi possível acessar buckets: ${bucketsError?.message}`)
    return
  }

  if (buckets.length === 0) {
    logInfo('Nenhum bucket no Supabase Storage')
    return
  }

  fs.writeFileSync(path.join(storageDir, '_buckets.json'), JSON.stringify(buckets, null, 2), 'utf-8')
  log(`  📦 ${buckets.length} bucket(s): ${buckets.map(b => b.name).join(', ')}`)

  let totalFiles = 0
  let totalErrors = 0
  let totalSize = 0

  for (const bucket of buckets) {
    log(`\n  📁 Bucket: "${bucket.name}" (${bucket.public ? 'público' : 'privado'})`)
    const bucketDir = path.join(storageDir, bucket.name)
    ensureDir(bucketDir)

    const files = await listStorageRecursive(bucket.name)

    if (files.length === 0) {
      logInfo(`Bucket "${bucket.name}" está vazio`)
      continue
    }

    log(`     → ${files.length} arquivo(s) encontrado(s)`)

    for (const file of files) {
      try {
        const parts = file.path.split('/')
        const localPath = path.join(bucketDir, ...parts)
        ensureDir(path.dirname(localPath))

        let downloaded = false

        // Tentar URL pública primeiro
        if (bucket.public) {
          const { data: urlData } = supabase.storage.from(bucket.name).getPublicUrl(file.path)
          if (urlData?.publicUrl) {
            try {
              await downloadFile(urlData.publicUrl, localPath)
              downloaded = true
            } catch (e) { /* cai para download autenticado */ }
          }
        }

        // Download autenticado (para buckets privados ou se URL pública falhou)
        if (!downloaded) {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from(bucket.name)
            .download(file.path)

          if (dlErr) throw dlErr

          const buffer = Buffer.from(await fileData.arrayBuffer())
          fs.writeFileSync(localPath, buffer)
        }

        totalFiles++
        totalSize += file.metadata?.size || 0
        process.stdout.write('.')
      } catch (err) {
        logErr(`Erro ao baixar ${file.path}: ${err.message}`)
        totalErrors++
      }
    }
    console.log()
    logOk(`${files.length} arquivo(s) processados no bucket "${bucket.name}"`)
  }

  log(`\n  📊 Storage total: ${totalFiles} arquivo(s) (${formatBytes(totalSize)})${totalErrors > 0 ? `, ⚠️ ${totalErrors} erros` : ''}`)
}

// ============================================
// 4. BACKUP DOS USUÁRIOS AUTH
// ============================================

async function backupAuthUsers(backupDir) {
  log('\n👥 INICIANDO BACKUP DOS USUÁRIOS (AUTH)...')
  const authDir = path.join(backupDir, 'auth')
  ensureDir(authDir)

  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 })

    if (error) {
      logWarn(`Usuários auth: ${error.message}`)
      return
    }

    const users = data?.users || []

    // Salvar dados completos sem senhas (irreversíveis)
    const usersSafe = users.map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      created_at: u.created_at,
      updated_at: u.updated_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed_at: u.confirmed_at,
      email_confirmed_at: u.email_confirmed_at,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata,
      identities: u.identities?.map(i => ({
        provider: i.provider,
        identity_data: { email: i.identity_data?.email },
        created_at: i.created_at,
      })),
    }))

    fs.writeFileSync(path.join(authDir, 'usuarios_auth.json'), JSON.stringify(usersSafe, null, 2), 'utf-8')
    logOk(`${users.length} usuário(s) de autenticação exportados`)

    fs.writeFileSync(path.join(authDir, 'AVISO_RESTORE.txt'),
      `AVISO IMPORTANTE - RESTAURAÇÃO DE USUÁRIOS
==========================================

Os usuários em usuarios_auth.json têm emails e metadados exportados.
As SENHAS não podem ser exportadas (são hashes irreversíveis).

PARA RESTAURAR USUÁRIOS:
  1. No painel Supabase > Authentication > Users > "Invite user"
     OU api admin para recriar com senha temporária
  2. Os usuários recebem email para redefinir a senha

EMAILS DOS USUÁRIOS (${users.length} total):
${usersSafe.map((u, i) => `  ${i + 1}. ${u.email} (criado em ${u.created_at})`).join('\n')}
`, 'utf-8')

  } catch (e) {
    logWarn(`Erro no backup de usuários auth: ${e.message}`)
  }
}

// ============================================
// 5. BACKUP DO .ENV E CONFIGURAÇÕES
// ============================================

async function backupEnv(backupDir) {
  log('\n🔑 SALVANDO CONFIGURAÇÕES DE AMBIENTE...')
  const configDir = path.join(backupDir, 'config')
  ensureDir(configDir)

  const envPath = path.join(projectRoot, '.env.local')
  const envExamplePath = path.join(projectRoot, '.env.example')

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')

    // Versão mascarada (segura para guardar)
    const masked = lines.map(line => {
      if (line.trim().startsWith('#') || !line.includes('=')) return line
      const eqIdx = line.indexOf('=')
      const key = line.slice(0, eqIdx)
      const value = line.slice(eqIdx + 1)
      if (value.length > 12) {
        return `${key}=${value.slice(0, 6)}******${value.slice(-4)}`
      }
      return `${key}=***`
    })
    fs.writeFileSync(path.join(configDir, '.env.local.masked'), masked.join('\n'), 'utf-8')
    logOk('.env.local salvo com valores mascarados')

    // Lista das variáveis necessárias para restaurar
    const keys = lines
      .filter(l => l.includes('=') && !l.trim().startsWith('#') && l.trim() !== '')
      .map(l => l.split('=')[0])

    fs.writeFileSync(path.join(configDir, 'env_vars_necessarias.txt'),
      `VARIÁVEIS NECESSÁRIAS PARA O SISTEMA FUNCIONAR
===============================================
Ao restaurar, preencha estas variáveis no .env.local:

${keys.map(k => `${k}=`).join('\n')}

ONDE ENCONTRAR OS VALORES:
  - Supabase > Settings > API Keys (URL, anon key, service role key)
  - URL do projeto original: ${SUPABASE_URL}
  - Painel: https://supabase.com/dashboard
`, 'utf-8')
  } else {
    logWarn('.env.local não encontrado')
  }

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, path.join(configDir, '.env.example'))
    logOk('.env.example copiado')
  }

  // Referência do projeto
  fs.writeFileSync(path.join(configDir, 'projeto_info.json'), JSON.stringify({
    url: SUPABASE_URL,
    project_ref: SUPABASE_URL.match(/https?:\/\/([^.]+)\./)?.[1] || 'desconhecido',
    data_backup: new Date().toISOString(),
    nota: 'Guarde as chaves API em um gerenciador de senhas (ex: Bitwarden, 1Password)',
  }, null, 2), 'utf-8')
  logOk('Referência do projeto Supabase salva')
}

// ============================================
// 6. BACKUP DE ARQUIVOS LOCAIS (public/)
// ============================================

async function backupPublicFiles(backupDir) {
  log('\n📂 BACKUP DE ARQUIVOS LOCAIS (public/)...')
  const publicDir = path.join(projectRoot, 'public')
  const publicBackupDir = path.join(backupDir, 'public')

  if (!fs.existsSync(publicDir)) {
    logInfo('Pasta public/ não encontrada')
    return
  }

  function copyRecursive(src, dest) {
    ensureDir(dest)
    const items = fs.readdirSync(src)
    let count = 0

    for (const item of items) {
      const srcPath = path.join(src, item)
      const destPath = path.join(dest, item)
      const stat = fs.statSync(srcPath)

      if (stat.isDirectory()) {
        count += copyRecursive(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
        count++
        process.stdout.write('.')
      }
    }
    return count
  }

  const count = copyRecursive(publicDir, publicBackupDir)
  console.log()
  logOk(`${count} arquivo(s) da pasta public/ copiados`)
}

// ============================================
// 7. GERAR GUIA DE RESTAURAÇÃO COMPLETO
// ============================================

function generateRestoreGuide(backupDir, results, startTime) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const totalRecords = Object.values(results)
    .filter(r => r.status === 'success')
    .reduce((s, r) => s + (r.rows || 0), 0)
  const successCount = Object.values(results).filter(r => r.status === 'success').length
  const errorTables = Object.entries(results).filter(([, r]) => r.status === 'error').map(([t]) => t)
  const backupName = path.basename(backupDir)

  const guide = `================================================================================
GUIA DE RESTAURAÇÃO COMPLETO - GERADOR DE ORÇAMENTOS
================================================================================
Data do backup : ${new Date().toLocaleString('pt-BR')}
Duração        : ${duration}s
Total registros: ${totalRecords}
Tabelas        : ${successCount}/${Object.keys(results).length} com sucesso
================================================================================

PASSO 1 - CRIAR/ACESSAR PROJETO SUPABASE
-----------------------------------------
  a) Acesse https://supabase.com/dashboard
  b) Crie um novo projeto (ou use o mesmo se ainda existir)
  c) Anote: URL do projeto, chave anon e service_role key

PASSO 2 - CONFIGURAR VARIÁVEIS DE AMBIENTE
-------------------------------------------
  a) Abra: config/env_vars_necessarias.txt
  b) Crie o arquivo .env.local na raiz do projeto
  c) Preencha todas as variáveis com os valores do Supabase

PASSO 3 - RECRIAR A ESTRUTURA DO BANCO
-----------------------------------------
  OPÇÃO A (mais simples - via psql):
    psql "postgresql://postgres:SENHA@db.fpejkwmapomxfyxmxqrd.supabase.co:5432/postgres" -f schema/schema_dump_cli.sql

  OPÇÃO B (manual - via Supabase SQL Editor):
    a) Abra o arquivo: schema/schema_dump_cli.sql
    b) Cole e execute no Supabase Dashboard > SQL Editor

PASSO 4 - RESTAURAR OS DADOS
-----------------------------------------
  OPÇÃO A (mais simples - via psql, tudo de uma vez):
    psql "postgresql://postgres:SENHA@db.fpejkwmapomxfyxmxqrd.supabase.co:5432/postgres" -f schema/data_dump_cli.sql

  OPÇÃO B (via Node.js, tabela por tabela):
    node scripts/restore-backup.js ${backupName}

  OPÇÃO C (manual): Os JSONs estão em dados/

PASSO 5 - RESTAURAR O STORAGE (IMAGENS DO SUPABASE)
-----------------------------------------
  Opção A - Manual:
    1. Supabase Dashboard > Storage
    2. Crie os buckets (veja: storage/_buckets.json)
    3. Faça upload dos arquivos da pasta: storage/<nome-do-bucket>/
  
  Opção B - Supabase CLI:
    supabase storage cp storage/<bucket>/ ss:///<bucket>/ --recursive

PASSO 6 - RESTAURAR ARQUIVOS LOCAIS
-----------------------------------------
  a) Copie a pasta public/ deste backup para a raiz do projeto
  b) Execute: npm install
  c) Execute: npm run dev
  d) Acesse: http://localhost:3000

PASSO 7 - RESTAURAR USUÁRIOS
-----------------------------------------
  Veja: auth/AVISO_RESTORE.txt
  Os usuários precisarão redefinir suas senhas.
  Os emails estão em: auth/usuarios_auth.json

================================================================================
CONTEÚDO DESTE BACKUP:
================================================================================
  dados/              → Dados completos das tabelas (JSON)
  schema/             → Estrutura do banco: tabelas, índices, RLS, funções, triggers
  storage/            → Arquivos do Supabase Storage (buckets)
  auth/               → Usuários de autenticação
  config/             → Variáveis de ambiente e referências do projeto
  public/             → Arquivos locais da pasta public/
  GUIA_RESTAURACAO.txt → Este arquivo

================================================================================
TABELAS INCLUÍDAS:
================================================================================
${Object.entries(results).map(([table, info]) =>
  `  ${info.status === 'success' ? '✅' : '❌'} ${table.padEnd(30)} ${info.rows ?? 0} registros${info.error ? ` [ERRO: ${info.error}]` : ''}`
).join('\n')}
${errorTables.length > 0
  ? `\n⚠️  TABELAS COM ERRO (verificar manualmente): ${errorTables.join(', ')}`
  : '\n✅ Todas as tabelas foram salvas com sucesso!'}

================================================================================
REFERÊNCIA:
================================================================================
  Supabase URL     : ${SUPABASE_URL}
  Project Ref      : ${SUPABASE_URL.match(/https?:\/\/([^.]+)\./)?.[1] || 'N/A'}
  Dashboard        : https://supabase.com/dashboard
================================================================================
`

  fs.writeFileSync(path.join(backupDir, 'GUIA_RESTAURACAO.txt'), guide, 'utf-8')
  return { duration, totalRecords, successCount, errorTables }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function runCompleteBackup() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║   BACKUP COMPLETO - GERADOR DE ORÇAMENTOS               ║')
  console.log('║   Salvando: dados + schema + storage + auth + env + public ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()

  const startTime = Date.now()

  try {
    const timestamp = getTimestamp()
    const backupDir = path.join(backupBaseDir, timestamp)
    ensureDir(backupDir)

    log(`📂 Diretório: ${backupDir}`)
    log(`🕐 Início: ${new Date().toLocaleString('pt-BR')}\n`)

    // Executar todos os backups em sequência
    const results = await backupTables(backupDir)
    await backupSchema(backupDir)
    await backupPgDump(backupDir)
    await backupStorage(backupDir)
    await backupAuthUsers(backupDir)
    await backupEnv(backupDir)
    await backupPublicFiles(backupDir)

    // Gerar guia de restauração e metadata
    const { duration, totalRecords, successCount, errorTables } = generateRestoreGuide(backupDir, results, startTime)

    const metadata = {
      projeto: 'Gerador de Orçamento',
      versao_backup: '3.0',
      data_backup: new Date().toISOString(),
      duracao_segundos: parseFloat(duration),
      supabase_url: SUPABASE_URL,
      conteudo: {
        dados: results,
        schema: 'schema/ (SQL + JSON: colunas, constraints, índices, RLS, funções, triggers)',
        storage: 'storage/ (todos os buckets, recursivo)',
        auth: 'auth/ (usuários de autenticação)',
        config: 'config/ (.env mascarado, referências do projeto)',
        public: 'public/ (arquivos locais)',
        guia: 'GUIA_RESTAURACAO.txt',
      },
      estatisticas: {
        total_tabelas: Object.keys(results).length,
        tabelas_sucesso: successCount,
        tabelas_erro: errorTables.length,
        total_registros: totalRecords,
      },
    }
    fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8')

    // Resumo final
    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║         BACKUP CONCLUÍDO COM SUCESSO! ✅                 ║')
    console.log('╚══════════════════════════════════════════════════════════╝')
    console.log()
    log(`📂 Salvo em: ${backupDir}`)
    log(`⏱️  Duração: ${duration}s`)
    log(`📊 Total de registros: ${totalRecords}`)
    log(`✅ Tabelas: ${successCount}/${Object.keys(results).length}`)
    if (errorTables.length > 0) logWarn(`Tabelas com erro: ${errorTables.join(', ')}`)
    console.log()
    log('📋 O que foi salvo:')
    log('   📄 dados/        → Todos os dados das tabelas (JSON)')
    log('   🗂️  schema/       → Estrutura do banco: tabelas, índices, RLS, triggers')
    log('   � schema/schema_dump_cli.sql → Schema real via pg_dump (DDL completo)')
    log('   🐘 schema/data_dump_cli.sql   → Dados completos em SQL (restaurável diretamente!)')
    log('   �🖼️  storage/      → Todos os arquivos/imagens do Supabase Storage')
    log('   👥 auth/         → Usuários de autenticação (emails, metadados)')
    log('   🔑 config/       → Variáveis de ambiente (censurado) e referências')
    log('   📂 public/       → Arquivos locais da pasta public/')
    log('   📋 GUIA_RESTAURACAO.txt → Instruções passo a passo para restaurar')
    console.log()
    log('💡 Para restaurar: leia o arquivo GUIA_RESTAURACAO.txt no backup')
    console.log()
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

runCompleteBackup()

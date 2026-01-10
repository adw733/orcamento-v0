/**
 * AGENDADOR DE BACKUP AUTOMÁTICO
 * 
 * Executa backup automaticamente em intervalos definidos
 * Mantém apenas os últimos N backups (limpeza automática)
 * 
 * Uso: node scripts/backup-agendado.js
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Intervalo entre backups (em horas)
  intervalo_horas: 24,
  
  // Número máximo de backups a manter
  max_backups: 7,
  
  // Executar backup imediatamente ao iniciar?
  executar_ao_iniciar: true,
}

const projectRoot = path.resolve(__dirname, '..')
const backupBaseDir = path.join(projectRoot, 'backup_supabase')
const backupScript = path.join(__dirname, 'backup-completo.js')

// ============================================
// FUNÇÕES
// ============================================

function log(message) {
  const timestamp = new Date().toLocaleString('pt-BR')
  console.log(`[${timestamp}] ${message}`)
}

async function executeBackup() {
  log('🚀 Iniciando backup...')
  
  return new Promise((resolve) => {
    const child = spawn('node', [backupScript], {
      stdio: 'inherit',
      shell: true
    })

    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Backup concluído com sucesso!')
        resolve(true)
      } else {
        log(`❌ Backup falhou com código: ${code}`)
        resolve(false)
      }
    })

    child.on('error', (error) => {
      log(`❌ Erro ao executar backup: ${error.message}`)
      resolve(false)
    })
  })
}

function cleanOldBackups() {
  if (!fs.existsSync(backupBaseDir)) {
    return
  }

  try {
    const backups = fs.readdirSync(backupBaseDir)
      .filter(item => {
        const fullPath = path.join(backupBaseDir, item)
        return fs.statSync(fullPath).isDirectory() && item.startsWith('backup_')
      })
      .map(name => ({
        name,
        path: path.join(backupBaseDir, name),
        time: fs.statSync(path.join(backupBaseDir, name)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time) // Mais recente primeiro

    if (backups.length > CONFIG.max_backups) {
      log(`🧹 Limpando backups antigos (mantendo últimos ${CONFIG.max_backups})...`)
      
      const toDelete = backups.slice(CONFIG.max_backups)
      
      for (const backup of toDelete) {
        try {
          fs.rmSync(backup.path, { recursive: true, force: true })
          log(`  🗑️  Removido: ${backup.name}`)
        } catch (err) {
          log(`  ⚠️  Erro ao remover ${backup.name}: ${err.message}`)
        }
      }
      
      log(`✅ Limpeza concluída. ${toDelete.length} backup(s) removido(s)`)
    }
  } catch (error) {
    log(`⚠️  Erro na limpeza de backups: ${error.message}`)
  }
}

function formatNextBackup(ms) {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

// ============================================
// LOOP PRINCIPAL
// ============================================

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║     AGENDADOR DE BACKUP AUTOMÁTICO          ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()
  console.log(`⏱️  Intervalo: A cada ${CONFIG.intervalo_horas} hora(s)`)
  console.log(`📦 Backups mantidos: ${CONFIG.max_backups}`)
  console.log(`🔄 Execução inicial: ${CONFIG.executar_ao_iniciar ? 'Sim' : 'Não'}`)
  console.log()
  log('📡 Agendador iniciado')

  if (CONFIG.executar_ao_iniciar) {
    await executeBackup()
    cleanOldBackups()
  }

  const intervalo_ms = CONFIG.intervalo_horas * 60 * 60 * 1000

  setInterval(async () => {
    await executeBackup()
    cleanOldBackups()
  }, intervalo_ms)

  log(`⏰ Próximo backup em: ${formatNextBackup(intervalo_ms)}`)
  
  // Manter o processo vivo
  process.on('SIGINT', () => {
    log('🛑 Agendador encerrado pelo usuário')
    process.exit(0)
  })
}

main()

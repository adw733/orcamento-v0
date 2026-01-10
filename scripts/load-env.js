/**
 * CARREGADOR DE VARIÁVEIS DE AMBIENTE
 * Carrega variáveis do .env.local para os scripts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function loadEnv() {
  const projectRoot = path.resolve(__dirname, '..')
  const envPath = path.join(projectRoot, '.env.local')

  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  Arquivo .env.local não encontrado')
    return
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Pular comentários e linhas vazias
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      
      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      // Só definir se ainda não estiver definido
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

export default loadEnv

/**
 * Script para listar todos os buckets e arquivos do Storage
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './load-env.js'

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function listAllStorage() {
  console.log('📦 Listando todos os buckets do Storage...\n')

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error('❌ Erro ao listar buckets:', bucketsError.message)
    return
  }

  if (!buckets || buckets.length === 0) {
    console.log('ℹ️  Nenhum bucket encontrado')
    return
  }

  console.log(`✅ ${buckets.length} bucket(s) encontrado(s):\n`)

  for (const bucket of buckets) {
    console.log(`📁 ${bucket.name}`)
    console.log(`   ID: ${bucket.id}`)
    console.log(`   Público: ${bucket.public ? 'Sim' : 'Não'}`)
    
    // Listar arquivos do bucket
    try {
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 1000 })

      if (filesError) {
        console.log(`   ❌ Erro ao listar arquivos: ${filesError.message}`)
      } else if (!files || files.length === 0) {
        console.log(`   ℹ️  Bucket vazio`)
      } else {
        console.log(`   📄 ${files.length} arquivo(s):`)
        files.slice(0, 5).forEach(file => {
          console.log(`      - ${file.name} (${(file.metadata?.size || 0) / 1024} KB)`)
        })
        if (files.length > 5) {
          console.log(`      ... e mais ${files.length - 5} arquivo(s)`)
        }
      }
    } catch (err) {
      console.log(`   ⚠️  Erro: ${err.message}`)
    }

    console.log()
  }
}

listAllStorage()

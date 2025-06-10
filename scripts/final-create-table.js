// Script final definitivo para criar tabela tipos_tamanho
const { createClient } = require('@supabase/supabase-js')

console.log('🎯 SCRIPT FINAL - CRIAÇÃO DA TABELA tipos_tamanho')
console.log('=' * 60)
console.log('')

const supabaseUrl = 'https://fpejkwmapomxfyxmxqrd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZWprd21hcG9teGZ5eG14cXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjgxMTEsImV4cCI6MjA2MTYwNDExMX0.9GlEoyCh2A0oq9bhWDDOUzwnZVWceMl8mrueuvetXxc'

async function tentarCriarTabela() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('🔍 Status atual da tabela...')
  
  // Verificar se tabela existe
  const { data: checkData, error: checkError } = await supabase
    .from('tipos_tamanho')
    .select('*')
    .limit(1)

  if (!checkError) {
    console.log('✅ TABELA JÁ EXISTE!')
    
    const { data: allData, error: allError } = await supabase
      .from('tipos_tamanho')
      .select('*')
      
    if (!allError) {
      console.log(`📊 Encontrados ${allData.length} tipos de tamanho:`)
      allData.forEach(tipo => {
        console.log(`   ✅ ${tipo.nome}: ${tipo.tamanhos?.length || 0} tamanhos`)
      })
      
      console.log('\n🎉 TUDO FUNCIONANDO!')
      console.log('✅ A tabela existe e está populada')
      console.log('✅ Não é necessário fazer nada')
      console.log('✅ Os tipos de tamanho já persistem no banco')
      return true
    }
  }

  console.log('❌ Tabela não existe ainda')
  console.log('🛠️ É necessário criá-la manualmente')
  
  return false
}

async function mostrarInstrucoes() {
  console.log('\n📋 INSTRUÇÕES PARA CRIAR A TABELA:')
  console.log('')
  console.log('🎯 OPÇÃO 1 - Via PostgreSQL direto (RECOMENDADO):')
  console.log('   Execute: node scripts/create-with-pg.js')
  console.log('   (Requer senha do banco PostgreSQL)')
  console.log('')
  console.log('🎯 OPÇÃO 2 - Via painel Supabase (FÁCIL):')
  console.log('   1. Acesse: https://fpejkwmapomxfyxmxqrd.supabase.co/project/fpejkwmapomxfyxmxqrd')
  console.log('   2. Vá para SQL Editor')
  console.log('   3. Abra o arquivo: scripts/create_tipos_tamanho_table.sql')
  console.log('   4. Copie e cole TODO o conteúdo')
  console.log('   5. Clique em "Run"')
  console.log('')
  console.log('📄 ARQUIVOS DISPONÍVEIS:')
  console.log('   ✅ scripts/create_tipos_tamanho_table.sql - SQL completo')
  console.log('   ✅ scripts/create-with-pg.js - Script PostgreSQL direto')
  console.log('   ✅ INSTRUCOES_CRIAR_TABELA.md - Instruções detalhadas')
  console.log('')
  console.log('🔍 APÓS CRIAR, execute este script novamente para verificar')
}

async function main() {
  const tabelaExiste = await tentarCriarTabela()
  
  if (!tabelaExiste) {
    await mostrarInstrucoes()
    
    console.log('\n⚠️ SITUAÇÃO ATUAL:')
    console.log('❌ Tabela tipos_tamanho NÃO existe')
    console.log('❌ Tipos de tamanho são salvos apenas em memória')
    console.log('❌ Dados são perdidos ao reiniciar')
    console.log('')
    console.log('✅ APÓS CRIAR A TABELA:')
    console.log('✅ Tipos de tamanho serão salvos permanentemente')
    console.log('✅ Dados persistirão após reiniciar')
    console.log('✅ Sistema funcionará completamente')
  }
  
  console.log('\n' + '=' * 60)
}

main().catch(console.error)
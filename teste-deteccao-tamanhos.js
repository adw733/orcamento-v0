// 🧪 SCRIPT DE TESTE - DETECÇÃO AUTOMÁTICA DE TIPOS DE TAMANHO
// ================================================================
// Execute este script no console do navegador na página de orçamentos
// para testar se a detecção automática está funcionando corretamente.

console.log('🧪 Iniciando teste de detecção automática de tipos de tamanho...')

// Simular tipos de tamanho disponíveis (como viriam do banco)
const tiposTamanhoMock = [
  {
    id: 'padrao-uuid',
    nome: 'PADRÃO',
    descricao: 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7',
    tamanhos: ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
  },
  {
    id: 'numerico-uuid', 
    nome: 'NUMÉRICO',
    descricao: '36 AO 58 - NÚMEROS PARES',
    tamanhos: ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']
  },
  {
    id: 'infantil-uuid',
    nome: 'INFANTIL', 
    descricao: '0 AO 13 - TAMANHOS INFANTIS',
    tamanhos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
  }
]

// Função de detecção (cópia da implementação)
function detectarTipoTamanho(tamanhosItem) {
  if (!tamanhosItem || Object.keys(tamanhosItem).length === 0) return null

  const tamanhosComQuantidade = Object.keys(tamanhosItem).filter(tamanho => tamanhosItem[tamanho] > 0)
  
  if (tamanhosComQuantidade.length === 0) return null

  let melhorTipo = null
  let maiorCompatibilidade = 0

  for (const tipo of tiposTamanhoMock) {
    const tamanhosCompativeis = tamanhosComQuantidade.filter(tamanho => 
      tipo.tamanhos && tipo.tamanhos.includes(tamanho)
    )
    
    const compatibilidade = tamanhosCompativeis.length / tamanhosComQuantidade.length
    
    if (compatibilidade === 1.0) {
      return tipo
    }
    
    if (compatibilidade > maiorCompatibilidade) {
      maiorCompatibilidade = compatibilidade
      melhorTipo = tipo
    }
  }

  return maiorCompatibilidade >= 0.5 ? melhorTipo : null
}

// Casos de teste
const casosTestee = [
  {
    nome: 'Orçamento com tamanhos PADRÃO',
    tamanhos: { 'P': 2, 'M': 5, 'G': 3, 'GG': 1 },
    esperado: 'PADRÃO'
  },
  {
    nome: 'Orçamento com tamanhos NUMÉRICOS',
    tamanhos: { '38': 2, '40': 3, '42': 1, '44': 2 },
    esperado: 'NUMÉRICO'
  },
  {
    nome: 'Orçamento com tamanhos INFANTIS',
    tamanhos: { '2': 1, '4': 2, '6': 1, '8': 3 },
    esperado: 'INFANTIL'
  },
  {
    nome: 'Orçamento com tamanhos mistos (deve detectar o mais compatível)',
    tamanhos: { 'P': 1, 'M': 2, '38': 1 }, // Mais compatível com PADRÃO
    esperado: 'PADRÃO'
  },
  {
    nome: 'Orçamento vazio',
    tamanhos: {},
    esperado: null
  },
  {
    nome: 'Orçamento com quantidades zeradas',
    tamanhos: { 'P': 0, 'M': 0, 'G': 0 },
    esperado: null
  }
]

// Executar testes
let testesPassaram = 0
let totalTestes = casosTestee.length

console.log(`\n📋 Executando ${totalTestes} casos de teste:\n`)

casosTestee.forEach((caso, index) => {
  const resultado = detectarTipoTamanho(caso.tamanhos)
  const tipoDetectado = resultado ? resultado.nome : null
  const passou = tipoDetectado === caso.esperado
  
  if (passou) {
    console.log(`✅ Teste ${index + 1}: ${caso.nome}`)
    console.log(`   Detectado: ${tipoDetectado || 'null'} ✓`)
    testesPassaram++
  } else {
    console.error(`❌ Teste ${index + 1}: ${caso.nome}`)
    console.error(`   Esperado: ${caso.esperado || 'null'}`)
    console.error(`   Detectado: ${tipoDetectado || 'null'}`)
  }
  console.log('') // linha em branco
})

// Resultado final
console.log(`📊 RESULTADO: ${testesPassaram}/${totalTestes} testes passaram`)

if (testesPassaram === totalTestes) {
  console.log('🎉 TODOS OS TESTES PASSARAM! A detecção automática está funcionando corretamente.')
} else {
  console.error('⚠️ Alguns testes falharam. Verifique a implementação da detecção.')
}

// Teste adicional: Performance
console.log('\n⚡ Teste de performance...')
const inicio = performance.now()

for (let i = 0; i < 1000; i++) {
  detectarTipoTamanho({ 'P': 1, 'M': 2, 'G': 3 })
}

const fim = performance.now()
console.log(`✅ 1000 detecções executadas em ${(fim - inicio).toFixed(2)}ms`)

console.log('\n🎯 Teste concluído! Agora teste manualmente:')
console.log('1. Abra um orçamento salvo que tem tamanhos')
console.log('2. Clique para editar um item')
console.log('3. Verifique se o tipo de tamanho é detectado automaticamente')
console.log('4. Verifique se as quantidades são preservadas')

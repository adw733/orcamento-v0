// Script de teste para verificar tipos de tamanho
// Execute este código no console do navegador na página de Tipos de Tamanho

async function testarTiposTamanho() {
  console.log('🧪 Testando sistema de tipos de tamanho...')
  
  try {
    // Importar o serviço (assumindo que está disponível globalmente)
    const { tipoTamanhoService } = window
    
    // Listar todos os tipos
    const tipos = await tipoTamanhoService.listarTodos()
    console.log('📋 Tipos encontrados:', tipos.length)
    
    // Verificar duplicações por nome
    const nomes = tipos.map(t => t.nome)
    const duplicados = nomes.filter((nome, index) => nomes.indexOf(nome) !== index)
    
    if (duplicados.length > 0) {
      console.error('❌ Tipos duplicados encontrados:', duplicados)
    } else {
      console.log('✅ Nenhum tipo duplicado encontrado')
    }
    
    // Mostrar detalhes dos tipos
    tipos.forEach(tipo => {
      console.log(`📝 ${tipo.nome}: ${tipo.tamanhos.length} tamanhos - ${tipo.descricao}`)
    })
    
    console.log('✅ Teste concluído!')
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

// Executar teste
testarTiposTamanho()

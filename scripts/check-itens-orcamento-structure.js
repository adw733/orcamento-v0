// Script para verificar a estrutura da tabela itens_orcamento
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkItensOrcamentoStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela itens_orcamento...\n')

    // Tentar buscar um item para ver a estrutura
    const { data: itens, error } = await supabase
      .from('itens_orcamento')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Erro ao acessar itens_orcamento:', error.message)
      return
    }

    if (itens && itens.length > 0) {
      console.log('✅ Estrutura atual da tabela itens_orcamento:')
      console.log('Campos disponíveis:', Object.keys(itens[0]))
      console.log('\nExemplo de item:')
      console.log(JSON.stringify(itens[0], null, 2))
      
      // Verificar especificamente se tem o campo tipo_tamanho_selecionado
      if (itens[0].hasOwnProperty('tipo_tamanho_selecionado')) {
        console.log('\n✅ Campo tipo_tamanho_selecionado existe!')
      } else {
        console.log('\n❌ Campo tipo_tamanho_selecionado NÃO existe!')
        console.log('📝 Será necessário adicionar este campo à tabela')
      }
    } else {
      console.log('ℹ️ Tabela itens_orcamento existe mas está vazia')
      
      // Tentar inserir um item de teste para ver a estrutura aceita
      console.log('\n🧪 Testando estrutura com item fictício...')
      
      const { data: testData, error: testError } = await supabase
        .from('itens_orcamento')
        .insert({
          id: 'test-12345',
          produto_id: 'test-produto',
          quantidade: 1,
          valor_unitario: 10.00,
          tamanhos: {'M': 1},
          tipo_tamanho_selecionado: 'test-tipo'
        })
        .select()

      if (testError) {
        console.log('❌ Erro ao testar estrutura:', testError.message)
        if (testError.message.includes('tipo_tamanho_selecionado')) {
          console.log('📝 Campo tipo_tamanho_selecionado precisa ser adicionado à tabela')
        }
      } else {
        console.log('✅ Estrutura aceita o campo tipo_tamanho_selecionado')
        
        // Limpar o item de teste
        await supabase
          .from('itens_orcamento')
          .delete()
          .eq('id', 'test-12345')
      }
    }

    // Verificar também a estrutura da tabela produtos
    console.log('\n🔍 Verificando tamanhos_disponiveis na tabela produtos...')
    
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, nome, tamanhos_disponiveis')
      .limit(3)

    if (produtosError) {
      console.log('❌ Erro ao acessar produtos:', produtosError.message)
    } else if (produtos && produtos.length > 0) {
      console.log('📋 Exemplos de tamanhos_disponiveis em produtos:')
      produtos.forEach(produto => {
        console.log(`- ${produto.nome}: ${JSON.stringify(produto.tamanhos_disponiveis)}`)
      })
    }

  } catch (error) {
    console.error('Erro geral:', error)
  }
}

checkItensOrcamentoStructure()
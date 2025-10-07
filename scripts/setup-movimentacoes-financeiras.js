const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarECriarTabela() {
  try {
    console.log('🔍 Verificando se a tabela movimentacoes_financeiras existe...');
    
    // Tentar fazer uma consulta simples na tabela
    const { data, error } = await supabase
      .from('movimentacoes_financeiras')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('❌ Tabela movimentacoes_financeiras não existe. Criando...');
      
      // SQL para criar a tabela
      const createTableSQL = `
        -- Criar tabela para movimentações financeiras (gastos e receitas)
        CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'gasto')),
            categoria VARCHAR(100) NOT NULL,
            descricao TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
            data DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'recebido')),
            observacoes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Criar índices para melhor performance
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_financeiras(tipo);
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_categoria ON movimentacoes_financeiras(categoria);
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_financeiras(data);
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_status ON movimentacoes_financeiras(status);

        -- Inserir algumas movimentações de exemplo
        INSERT INTO movimentacoes_financeiras (tipo, categoria, descricao, valor, data, status, observacoes) VALUES
        ('receita', 'Vendas de Uniformes', 'Venda de uniformes para empresa ABC', 2500.00, '2024-01-15', 'recebido', 'Pagamento à vista'),
        ('receita', 'Serviços de Personalização', 'Bordado personalizado para cliente XYZ', 350.00, '2024-01-16', 'pendente', 'Aguardando aprovação final'),
        ('gasto', 'Matéria Prima', 'Compra de tecidos para produção', 800.00, '2024-01-10', 'pago', 'Fornecedor: Tecidos Silva'),
        ('gasto', 'Energia Elétrica', 'Conta de luz - Janeiro 2024', 450.00, '2024-01-05', 'pago', 'Vencimento: 05/01/2024'),
        ('receita', 'Vendas de Uniformes', 'Uniformes escolares - Colégio São José', 1800.00, '2024-01-20', 'recebido', 'Pagamento parcelado 2x'),
        ('gasto', 'Aluguel', 'Aluguel do galpão - Janeiro 2024', 1200.00, '2024-01-01', 'pago', 'Pagamento mensal'),
        ('gasto', 'Mão de Obra', 'Pagamento costureiras - Janeiro', 2200.00, '2024-01-30', 'pago', 'Salários + encargos'),
        ('receita', 'Consultoria', 'Consultoria em uniformes corporativos', 500.00, '2024-01-25', 'pendente', 'Projeto em andamento');
      `;

      // Executar o SQL usando rpc (função remota)
      const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      });

      if (createError) {
        console.error('❌ Erro ao criar tabela via RPC:', createError);
        console.log('📝 Você precisará executar o SQL manualmente no painel do Supabase.');
        console.log('📁 O arquivo SQL está em: scripts/create-movimentacoes-financeiras.sql');
        return false;
      }

      console.log('✅ Tabela criada com sucesso!');
      return true;
    } else if (error) {
      console.error('❌ Erro ao verificar tabela:', error);
      return false;
    } else {
      console.log('✅ Tabela movimentacoes_financeiras já existe!');
      console.log(`📊 Total de registros: ${data?.length || 0}`);
      return true;
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando setup da tabela movimentacoes_financeiras...');
  
  const sucesso = await verificarECriarTabela();
  
  if (sucesso) {
    console.log('✅ Setup concluído com sucesso!');
    console.log('🎉 A funcionalidade de Gastos e Receitas está pronta para uso!');
  } else {
    console.log('❌ Setup falhou. Verifique as instruções acima.');
  }
}

main().catch(console.error);
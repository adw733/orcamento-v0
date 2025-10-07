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

-- Comentários na tabela
COMMENT ON TABLE movimentacoes_financeiras IS 'Tabela para controle de gastos e receitas da empresa';
COMMENT ON COLUMN movimentacoes_financeiras.tipo IS 'Tipo da movimentação: receita ou gasto';
COMMENT ON COLUMN movimentacoes_financeiras.categoria IS 'Categoria da movimentação financeira';
COMMENT ON COLUMN movimentacoes_financeiras.descricao IS 'Descrição detalhada da movimentação';
COMMENT ON COLUMN movimentacoes_financeiras.valor IS 'Valor da movimentação em reais';
COMMENT ON COLUMN movimentacoes_financeiras.data IS 'Data da movimentação';
COMMENT ON COLUMN movimentacoes_financeiras.status IS 'Status: pendente, pago ou recebido';
COMMENT ON COLUMN movimentacoes_financeiras.observacoes IS 'Observações adicionais sobre a movimentação';
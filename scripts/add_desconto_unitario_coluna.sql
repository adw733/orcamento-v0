-- Adicionar coluna desconto_unitario_percentual na tabela itens_orcamento
-- Esta coluna armazena o desconto percentual por item (0-100)

ALTER TABLE itens_orcamento
ADD COLUMN IF NOT EXISTS desconto_unitario_percentual NUMERIC DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN itens_orcamento.desconto_unitario_percentual IS 'Desconto percentual por peça (0-100%)';

-- Atualizar todos os registros existentes para ter valor 0
UPDATE itens_orcamento
SET desconto_unitario_percentual = 0
WHERE desconto_unitario_percentual IS NULL;

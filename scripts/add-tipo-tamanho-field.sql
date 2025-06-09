-- Adicionar campo tipo_tamanho_selecionado à tabela itens_orcamento
ALTER TABLE public.itens_orcamento 
ADD COLUMN IF NOT EXISTS tipo_tamanho_selecionado UUID;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.itens_orcamento.tipo_tamanho_selecionado IS 'ID do tipo de tamanho selecionado para este item (referência à tabela tipos_tamanho)';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_tipo_tamanho ON public.itens_orcamento(tipo_tamanho_selecionado);
-- Criar tabela tipos_tamanho para armazenar os tipos de tamanho
CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tamanhos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários para documentação
COMMENT ON TABLE public.tipos_tamanho IS 'Tabela para armazenar os tipos de tamanho disponíveis para produtos';
COMMENT ON COLUMN public.tipos_tamanho.nome IS 'Nome do tipo de tamanho (ex: PADRÃO, NUMÉRICO, INFANTIL)';
COMMENT ON COLUMN public.tipos_tamanho.descricao IS 'Descrição do tipo de tamanho';
COMMENT ON COLUMN public.tipos_tamanho.tamanhos IS 'Array com os tamanhos disponíveis deste tipo';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tipos_tamanho_nome ON public.tipos_tamanho(nome);

-- Inserir tipos de tamanho padrão
INSERT INTO public.tipos_tamanho (nome, descricao, tamanhos) VALUES
('PADRÃO', 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7', ARRAY['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']),
('NUMÉRICO', '36 AO 58 - NÚMEROS PARES', ARRAY['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']),
('INFANTIL', '0 AO 13 - TAMANHOS INFANTIS', ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
ON CONFLICT (nome) DO NOTHING;

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (ajustar conforme necessário)
CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" ON public.tipos_tamanho
    FOR ALL USING (true) WITH CHECK (true);
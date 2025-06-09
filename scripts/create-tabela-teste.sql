-- ===================================
-- TABELA DE TESTE PARA VERIFICAR CONEXÃO
-- ===================================

-- Criar tabela de teste simples
CREATE TABLE IF NOT EXISTS public.teste_conexao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem TEXT NOT NULL,
    usuario_teste VARCHAR(100),
    dados_teste JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários para documentação
COMMENT ON TABLE public.teste_conexao IS 'Tabela para testes de conexão e funcionalidade básica do Supabase';
COMMENT ON COLUMN public.teste_conexao.mensagem IS 'Mensagem de teste';
COMMENT ON COLUMN public.teste_conexao.usuario_teste IS 'Nome do usuário que executou o teste';
COMMENT ON COLUMN public.teste_conexao.dados_teste IS 'Dados JSON para teste de funcionalidades';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_teste_conexao_created_at ON public.teste_conexao(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.teste_conexao ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (para teste)
CREATE POLICY IF NOT EXISTS "Enable all operations for teste_conexao" 
ON public.teste_conexao FOR ALL USING (true) WITH CHECK (true);

-- Inserir alguns dados de teste
INSERT INTO public.teste_conexao (mensagem, usuario_teste, dados_teste) VALUES
('Teste inicial de conexão', 'Sistema', '{"version": "1.0", "type": "initial_test"}'),
('Teste de inserção via SQL', 'Admin', '{"version": "1.0", "type": "sql_test"}'),
('Teste de funcionalidade JSON', 'Sistema', '{"version": "1.0", "type": "json_test", "data": {"test": true, "count": 1}}')
ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    'Tabela criada com sucesso!' as status,
    count(*) as total_registros
FROM public.teste_conexao;

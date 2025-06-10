#!/bin/bash

# Script para criar tabela via psql direto
echo "🔧 Tentando criar tabela via psql direto..."

# Verificar se psql está disponível
if ! command -v psql &> /dev/null; then
    echo "❌ psql não está instalado"
    echo "💡 Para instalar no Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "💡 Para instalar no MacOS: brew install postgresql"
    exit 1
fi

echo "✅ psql encontrado!"

# String de conexão do Supabase
# Formato: postgresql://[usuário]:[senha]@[host]:[porta]/[database]
DB_URL="postgresql://postgres:[SENHA_AQUI]@db.fpejkwmapomxfyxmxqrd.supabase.co:5432/postgres"

echo "🔑 IMPORTANTE: Você precisa da senha do banco PostgreSQL"
echo "📍 Para encontrar a senha:"
echo "   1. Acesse: https://fpejkwmapomxfyxmxqrd.supabase.co/project/fpejkwmapomxfyxmxqrd/settings/database"
echo "   2. Copie a 'Database Password' ou 'Connection String'"
echo ""

read -p "🔐 Digite a senha do banco PostgreSQL: " -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Senha não fornecida. Abortando."
    exit 1
fi

# Substituir senha na URL
DB_URL_WITH_PASSWORD=$(echo "$DB_URL" | sed "s/\[SENHA_AQUI\]/$DB_PASSWORD/")

echo "🚀 Tentando conectar ao banco e criar tabela..."

# SQL para criar a tabela
SQL_CREATE="
-- Criar tabela tipos_tamanho
CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    tamanhos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tipos_tamanho_nome ON public.tipos_tamanho(nome);

-- Habilitar RLS
ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;

-- Criar política
CREATE POLICY IF NOT EXISTS \"Enable all operations for tipos_tamanho\" ON public.tipos_tamanho
    FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados padrão
INSERT INTO public.tipos_tamanho (nome, descricao, tamanhos) VALUES
('PADRÃO', 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7', ARRAY['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']),
('NUMÉRICO', '36 AO 58 - NÚMEROS PARES', ARRAY['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']),
('INFANTIL', '0 AO 13 - TAMANHOS INFANTIS', ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
ON CONFLICT (nome) DO NOTHING;

-- Verificar criação
SELECT 'Tabela criada com sucesso!' as status;
SELECT COUNT(*) as total_tipos FROM public.tipos_tamanho;
SELECT nome, array_length(tamanhos, 1) as qtd_tamanhos FROM public.tipos_tamanho ORDER BY nome;
"

# Executar SQL
echo "$SQL_CREATE" | psql "$DB_URL_WITH_PASSWORD"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCESSO! Tabela tipos_tamanho foi criada!"
    echo "✅ Agora você pode usar o sistema de tipos de tamanho"
    echo "✅ Os dados serão salvos permanentemente"
else
    echo ""
    echo "❌ ERRO: Não foi possível criar a tabela"
    echo "💡 Verifique a senha e tente novamente"
    echo "💡 Ou use o método manual no painel do Supabase"
fi
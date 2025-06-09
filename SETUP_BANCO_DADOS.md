# INSTRUÇÕES PARA CONFIGURAÇÃO DO BANCO DE DADOS

## Situação Atual

A implementação do sistema de tipos de tamanho está **quase completa**, mas falta apenas criar a tabela `tipos_tamanho` no banco de dados Supabase.

## ⚠️ AÇÃO NECESSÁRIA: Criar Tabela no Supabase

Execute o seguinte SQL no dashboard do Supabase:

### Passos:
1. Acesse: https://fpejkwmapomxfyxmxqrd.supabase.co
2. Vá para "SQL Editor" no menu lateral
3. Cole o código SQL abaixo
4. Execute o comando

### Código SQL para executar:

```sql
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações
CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" ON public.tipos_tamanho
    FOR ALL USING (true) WITH CHECK (true);
```

## Verificação

Após executar o SQL acima, execute este comando para verificar se tudo funcionou:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fpejkwmapomxfyxmxqrd.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZWprd21hcG9teGZ5eG14cXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjgxMTEsImV4cCI6MjA2MTYwNDExMX0.9GlEoyCh2A0oq9bhWDDOUzwnZVWceMl8mrueuvetXxc node scripts/check-db-structure.js
```

## ✅ O Que Já Está Implementado

1. **Formulário de Orçamento** - Seleção de tipos de tamanho por item ✅
2. **Serviços** - API para gerenciar tipos de tamanho ✅  
3. **Interface** - Componentes prontos para usar ✅
4. **Tipos TypeScript** - Definições atualizadas ✅
5. **Fallback** - Sistema funciona mesmo sem tabela (usando tipos padrão) ✅

## 🎯 Funcionamento após a criação da tabela

1. **Cadastro de Produtos**: Não terá mais seleção de tipos de tamanho
2. **Orçamentos**: Ao adicionar um item, será obrigatório selecionar o tipo de tamanho
3. **Gerenciamento**: Nova aba "Tamanhos" no gerenciador de materiais
4. **Flexibilidade**: Possibilidade de criar novos tipos personalizados

## 🔧 Como Testar

1. Execute o SQL no Supabase
2. Inicie a aplicação: `npm run dev`
3. Acesse: Materiais > Tamanhos (deve mostrar os 3 tipos padrão)
4. Crie um novo orçamento
5. Adicione um produto
6. Verifique se aparece a seleção de "Tipo de Tamanho"
7. Selecione um tipo e veja se os tamanhos corretos aparecem

A implementação está **99% completa** - falta apenas esta única etapa manual no banco!
// Script para criar a tabela tipos_tamanho no Supabase
const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTiposTamanhoTable() {
  try {
    console.log('Criando tabela tipos_tamanho...\n')

    // SQL para criar a tabela
    const createTableSQL = `
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

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (ajustar conforme necessário)
CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" ON public.tipos_tamanho
    FOR ALL USING (true) WITH CHECK (true);
`

    // Executar SQL
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (createError) {
      console.error('Erro ao criar tabela:', createError)
      
      // Tentar método alternativo usando edge functions
      console.log('Tentando método alternativo...')
      
      // Inserir diretamente os dados padrão
      const tiposPadrao = [
        {
          nome: 'PADRÃO',
          descricao: 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7',
          tamanhos: ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
        },
        {
          nome: 'NUMÉRICO',
          descricao: '36 AO 58 - NÚMEROS PARES',
          tamanhos: ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']
        },
        {
          nome: 'INFANTIL',
          descricao: '0 AO 13 - TAMANHOS INFANTIS',
          tamanhos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
        }
      ]

      // Tentar inserir dados para testar se a tabela existe
      for (const tipo of tiposPadrao) {
        const { error: insertError } = await supabase
          .from('tipos_tamanho')
          .insert(tipo)
          .select()

        if (insertError) {
          console.error(`Erro ao inserir tipo ${tipo.nome}:`, insertError.message)
        } else {
          console.log(`✅ Tipo ${tipo.nome} inserido com sucesso`)
        }
      }
      
      return
    }

    console.log('✅ Tabela tipos_tamanho criada com sucesso!')

    // Inserir tipos de tamanho padrão
    console.log('\nInserindo tipos de tamanho padrão...')
    
    const tiposPadrao = [
      {
        nome: 'PADRÃO',
        descricao: 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7',
        tamanhos: ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
      },
      {
        nome: 'NUMÉRICO',
        descricao: '36 AO 58 - NÚMEROS PARES',
        tamanhos: ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']
      },
      {
        nome: 'INFANTIL',
        descricao: '0 AO 13 - TAMANHOS INFANTIS',
        tamanhos: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
      }
    ]

    for (const tipo of tiposPadrao) {
      const { data, error } = await supabase
        .from('tipos_tamanho')
        .insert(tipo)
        .select()

      if (error) {
        console.error(`Erro ao inserir tipo ${tipo.nome}:`, error.message)
      } else {
        console.log(`✅ Tipo ${tipo.nome} inserido com sucesso`)
      }
    }

    console.log('\n✅ Configuração da tabela tipos_tamanho concluída!')

  } catch (error) {
    console.error('Erro ao criar tabela tipos_tamanho:', error)
  }
}

createTiposTamanhoTable()
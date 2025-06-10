// Script para criar tabela tipos_tamanho via API REST do Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fpejkwmapomxfyxmxqrd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZWprd21hcG9teGZ5eG14cXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjgxMTEsImV4cCI6MjA2MTYwNDExMX0.9GlEoyCh2A0oq9bhWDDOUzwnZVWceMl8mrueuvetXxc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTable() {
  try {
    console.log('🔧 Criando tabela tipos_tamanho...\n')

    // Tentar inserir os dados padrão diretamente - se der erro é porque a tabela não existe
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

    // Primeiro vamos verificar se a tabela existe tentando fazer uma consulta
    console.log('🔍 Verificando se a tabela existe...')
    const { data: existingData, error: checkError } = await supabase
      .from('tipos_tamanho')
      .select('id')
      .limit(1)

    if (checkError) {
      console.log('❌ Tabela não existe. Erro:', checkError.message)
      console.log('\n📋 Por favor, execute o seguinte SQL no painel do Supabase:')
      console.log('=' * 80)
      console.log(`
-- Criar tabela tipos_tamanho
CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    tamanhos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários
COMMENT ON TABLE public.tipos_tamanho IS 'Tabela para armazenar os tipos de tamanho disponíveis para produtos';
COMMENT ON COLUMN public.tipos_tamanho.nome IS 'Nome do tipo de tamanho (ex: PADRÃO, NUMÉRICO, INFANTIL)';
COMMENT ON COLUMN public.tipos_tamanho.descricao IS 'Descrição do tipo de tamanho';
COMMENT ON COLUMN public.tipos_tamanho.tamanhos IS 'Array com os tamanhos disponíveis deste tipo';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tipos_tamanho_nome ON public.tipos_tamanho(nome);

-- Habilitar RLS
ALTER TABLE public.tipos_tamanho ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações
CREATE POLICY IF NOT EXISTS "Enable all operations for tipos_tamanho" ON public.tipos_tamanho
    FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados padrão
INSERT INTO public.tipos_tamanho (nome, descricao, tamanhos) VALUES
('PADRÃO', 'PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7', ARRAY['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']),
('NUMÉRICO', '36 AO 58 - NÚMEROS PARES', ARRAY['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']),
('INFANTIL', '0 AO 13 - TAMANHOS INFANTIS', ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
ON CONFLICT (nome) DO NOTHING;
`)
      console.log('=' * 80)
      console.log('\n📌 INSTRUÇÕES:')
      console.log('1. Acesse: https://fpejkwmapomxfyxmxqrd.supabase.co/project/fpejkwmapomxfyxmxqrd')
      console.log('2. Vá para SQL Editor')
      console.log('3. Cole o SQL acima')
      console.log('4. Execute o comando')
      console.log('5. Execute este script novamente para verificar\n')
      
      return false
    } else {
      console.log('✅ Tabela existe!')
      
      // Verificar se tem dados
      const { data: allData, error: countError } = await supabase
        .from('tipos_tamanho')
        .select('*')
        
      if (countError) {
        console.log('❌ Erro ao consultar dados:', countError.message)
        return false
      }
      
      console.log(`📊 Encontrados ${allData.length} tipos de tamanho na tabela:`)
      allData.forEach(tipo => {
        console.log(`  - ${tipo.nome}: ${tipo.tamanhos?.length || 0} tamanhos`)
      })
      
      // Se não tem dados padrão, inserir
      if (allData.length === 0) {
        console.log('\n📥 Inserindo dados padrão...')
        
        for (const tipo of tiposPadrao) {
          const { data, error } = await supabase
            .from('tipos_tamanho')
            .insert(tipo)
            .select()

          if (error) {
            console.log(`❌ Erro ao inserir ${tipo.nome}:`, error.message)
          } else {
            console.log(`✅ ${tipo.nome} inserido com sucesso`)
          }
        }
      }
      
      return true
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return false
  }
}

createTable().then(success => {
  if (success) {
    console.log('\n🎉 SUCESSO! Tabela tipos_tamanho está pronta para uso!')
    console.log('✅ Agora você pode criar novos tipos de tamanho no aplicativo')
    console.log('✅ Os dados serão salvos permanentemente no banco de dados')
    console.log('✅ Reinicie o aplicativo para ver as mudanças')
  } else {
    console.log('\n⚠️  AÇÃO NECESSÁRIA: Execute o SQL manualmente no painel do Supabase')
    console.log('📄 Arquivo SQL pronto em: scripts/create_tipos_tamanho_table.sql')
    console.log('📋 Instruções detalhadas em: INSTRUCOES_CRIAR_TABELA.md')
  }
  process.exit(0)
})
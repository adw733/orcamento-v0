# Configuração dos Tipos de Tamanho

## Resumo das Alterações

Este documento descreve as alterações realizadas no sistema para implementar a funcionalidade de tipos de tamanho conforme solicitado:

### Mudanças Implementadas

1. **Removido:** Seleção de tipos de tamanho do cadastro de produtos
2. **Adicionado:** Nova aba "Tamanhos" no gerenciador de materiais
3. **Modificado:** Tela de edição do orçamento para seleção de tipo de tamanho por item
4. **Criado:** Sistema de gerenciamento de tipos de tamanho

### Fluxo Atual

1. **Cadastro de Tipos de Tamanho:** Na aba Materiais > Tamanhos
2. **Cadastro de Produtos:** Sem seleção de tipos de tamanho (apenas tecidos e cores)
3. **Criação de Orçamento:** Ao adicionar um item, o usuário seleciona o tipo de tamanho desejado
4. **Seleção de Tamanhos:** Baseada no tipo de tamanho selecionado

## Configuração do Banco de Dados

### Tabela Necessária: `tipos_tamanho`

Execute o seguinte SQL no Supabase para criar a tabela:

```sql
-- Criar tabela tipos_tamanho
CREATE TABLE IF NOT EXISTS public.tipos_tamanho (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tamanhos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
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

### Como Executar no Supabase

1. Acesse o dashboard do Supabase
2. Vá para a seção "SQL Editor"
3. Cole o código SQL acima
4. Execute o comando
5. Verifique se a tabela foi criada na seção "Table Editor"

## Arquivos Modificados

### 1. `/types/types.ts`
- Adicionado campo `tipoTamanhoSelecionado?: string` na interface `ItemOrcamento`

### 2. `/lib/services-materiais.ts`
- Adicionada interface `TipoTamanho`
- Criado serviço `tipoTamanhoService` com métodos CRUD
- Implementado fallback para tipos padrão quando a tabela não existe

### 3. `/components/gerenciador-materiais.tsx`
- Adicionada nova aba "Tamanhos"
- Interface completa para gerenciar tipos de tamanho
- Formulários para criar, editar e excluir tipos

### 4. `/components/gerenciador-produtos.tsx`
- Removidas seções de seleção de tipos de tamanho
- Produtos agora são cadastrados apenas com tecidos e cores
- Campo `tamanhosDisponiveis` mantido como array vazio para compatibilidade

### 5. `/components/formulario-orcamento.tsx`
- Adicionado estado para tipos de tamanho disponíveis
- Implementada seleção de tipo de tamanho por item
- Modificada renderização da tabela de tamanhos baseada no tipo selecionado
- Adicionadas validações e reset de estado

## Funcionalidades Implementadas

### Gerenciamento de Tipos de Tamanho
- ✅ Listar tipos de tamanho
- ✅ Adicionar novo tipo com tamanhos personalizados
- ✅ Editar tipos existentes
- ✅ Excluir tipos (com confirmação)
- ✅ Pesquisar e ordenar tipos
- ✅ Pré-definições: Padrão, Numérico, Infantil

### Seleção no Orçamento
- ✅ Dropdown para seleção de tipo de tamanho por item
- ✅ Tabela de tamanhos dinâmica baseada no tipo selecionado
- ✅ Validação: não permite prosseguir sem selecionar tipo
- ✅ Reset automático de quantidades ao trocar tipo
- ✅ Integração com edição de itens existentes

### Compatibilidade
- ✅ Sistema funciona mesmo sem a tabela do banco (usa tipos padrão)
- ✅ Produtos existentes continuam funcionando
- ✅ Interface mantém compatibilidade com dados antigos

## Como Testar

1. **Verificar se a tabela foi criada:**
   ```bash
   node scripts/check-db-structure.js
   ```

2. **Testar o fluxo completo:**
   - Acessar Materiais > Tamanhos
   - Verificar se existem 3 tipos padrão
   - Criar um novo orçamento
   - Adicionar um produto
   - Verificar se aparece a seleção de tipo de tamanho
   - Selecionar um tipo e verificar se os tamanhos corretos aparecem

3. **Testar edição:**
   - Editar um item existente no orçamento
   - Trocar o tipo de tamanho
   - Verificar se os tamanhos se atualizam corretamente

## Problemas Conhecidos e Soluções

### Problema: Tabela não existe
**Solução:** O sistema detecta automaticamente e usa tipos padrão. Para funcionalidade completa, execute o SQL no Supabase.

### Problema: Permissões no Supabase
**Solução:** Verifique se as políticas RLS estão configuradas corretamente ou desabilite temporariamente para teste.

### Problema: Dados existentes
**Solução:** Itens de orçamento existentes continuarão funcionando. Novos itens precisarão de tipo de tamanho selecionado.

## Próximos Passos

1. ✅ **Concluído:** Implementar seleção de tipos no orçamento
2. ✅ **Concluído:** Remover tipos do cadastro de produtos  
3. ✅ **Concluído:** Criar aba de gerenciamento de tipos
4. 🔄 **Em andamento:** Testar com banco de dados real
5. ⏳ **Pendente:** Documentar para usuários finais
6. ⏳ **Pendente:** Implementar migração de dados antigos (se necessário)

---

**Nota:** Este sistema foi desenvolvido para permitir maior flexibilidade na seleção de tamanhos por produto, conforme solicitado. A arquitetura permite adicionar novos tipos de tamanho facilmente através da interface administrativa.
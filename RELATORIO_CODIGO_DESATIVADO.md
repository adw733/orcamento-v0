# Relatório de Código Desativado e Comentários Relevantes

Este relatório aponta trechos de código que foram desativados (comentados) ou marcados como pendentes de implementação correta no sistema.

## 1. Componentes Principais

### `components/gerador-orcamento.tsx`

Este é o arquivo com maior número de códigos desativados, reflexo de refatorações recentes.

*   **Função `exportarOrcamento` (Linhas ~1086-1334):**
    *   A função inteira foi comentada dentro de um bloco `/* ... */`.
    *   **Status:** Desativada. O código agora emite um `console.warn` instruindo o uso da página de orçamento otimizado.
    *   **Recomendação:** Remover o código comentado se a nova funcionalidade estiver validada.

*   **`useEffect` de Inicialização (Linhas ~1336-1345):**
    *   Bloco `useEffect` comentado que criava um novo orçamento automaticamente e lia o hash da URL.
    *   **Motivo:** "REMOVER ESTE useEffect que estava criando um novo orçamento automaticamente".

*   **Lógica de Salvamento de Estampas (Dentro de `salvarNovoOrcamento`):**
    *   Código comentado que inseria estampas no banco de dados.
    *   **Motivo:** "comentado temporariamente devido a erro 400".
    *   **Observação:** Existe lógica similar em `atualizarOrcamentoExistente` que parece estar ativa, mas com tratamento de erro `try/catch` específico.

*   **Manipulação de Hash (Linhas ~1340):**
    *   Código comentado para leitura de `window.location.hash`.

### `components/gerenciador-produtos.tsx`

*   **Comentários Órfãos:**
    *   `// Variável para armazenar os tecidos cadastrados` (Linha ~545). A variável em si não segue o comentário imediatamente.

## 2. Server Actions

### `app/actions/gemini-actions.ts`

Embora não tenha grandes blocos de código comentado com `//`, existem indicações de funcionalidades simplificadas que agem como "código desativado por design":

*   **Extração de PDF:**
    *   `// Return the file content as text (this is a simplified approach)`
    *   `// In a real implementation, you would use a PDF parsing library`
    *   O código atual retorna apenas o texto cru ou placeholder, indicando que a lógica real de parsing de PDF não foi implementada.

## 3. Outros Arquivos

*   **`components/tabela-produtos.tsx`:**
    *   Comentários de alerta: `// IMPORTANTE: Manter a ordem original de produtosFiltrados`.

*   **`components/visualizacao-editavel.tsx`, `components/ui/sidebar.tsx`, etc.:**
    *   Uso extensivo de `{/* ... */}` para documentar seções do JSX. Isso é uma boa prática e não constitui código morto, mas polui visualmente se excessivo.

## Conclusão

A maior parte do "código morto" reside em `gerador-orcamento.tsx` como resultado da transição para a nova lógica de exportação de PDF e refatoração do fluxo de salvamento. Recomenda-se uma limpeza neste arquivo para melhorar a manutenibilidade.

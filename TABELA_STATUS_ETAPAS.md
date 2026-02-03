# Tabela de Status de Etapas - Planejamento

## 🎯 Mudança Implementada

Substituímos o **modal de edição em massa** por uma **tabela interativa** para configurar as etapas de cada produto, similar à tabela de produtos existente.

## ✨ Características Principais

### 1. **Tabela Interativa**
- Visualização em formato de tabela com todos os produtos
- Cada linha representa um produto do orçamento
- Cada coluna representa uma etapa do processo produtivo

### 2. **Edição Direta**
- Clique nos ícones das etapas para ativar/desativar
- Ícones coloridos quando ativos, cinza quando inativos
- **Atualização automática dos cards** no grafo

### 3. **Funcionalidades Adicionais**

#### Ordenação
- Clique nos cabeçalhos para ordenar por:
  - Nome do Produto (alfabético)
  - Cliente (alfabético)
  - Quantidade (numérico)
- Indicador visual de direção da ordenação (setas)

#### Seleção em Massa
- Botões "Marcar/Desmarcar todos" em cada coluna
- Ativa/desativa uma etapa para todos os produtos simultaneamente

#### Visual
- Cores distintas para cada etapa
- Ícones intuitivos (tesoura para corte, paleta para estampa, etc.)
- Resumo na parte inferior com contadores por etapa
- Design responsivo com scroll horizontal quando necessário

## 🎨 Etapas Disponíveis

| Etapa | Ícone | Cor |
|-------|-------|-----|
| Compra | 🛒 | Azul |
| Corte | ✂️ | Laranja |
| Estampa | 🎨 | Roxo |
| Costura | 👔 | Rosa |
| Revisão | ✓ | Verde |
| Embalagem | 📦 | Amarelo |
| Entrega | 🚚 | Índigo |

## 📋 Como Usar

1. **Abrir a Tabela**
   - Clique no botão "Editar Etapas" na barra superior
   - A tabela aparecerá como overlay sobre o grafo

2. **Configurar Etapas**
   - Clique nos ícones coloridos para ativar/desativar etapas
   - Ícone colorido = etapa ativa
   - Ícone cinza = etapa desativada

3. **Seleção Rápida**
   - Use os botões "Marcar/Desmarcar todos" no cabeçalho
   - Para ativar/desativar uma etapa para todos os produtos

4. **Ordenar Produtos**
   - Clique no nome da coluna (Produto, Cliente ou Qtd.)
   - Clique novamente para inverter a ordem

5. **Fechar a Tabela**
   - Clique no X no canto superior direito
   - Ou clique novamente em "Ocultar Tabela"

## 🔄 Atualização Automática

As mudanças são aplicadas **automaticamente** aos cards:
- Ao ativar uma etapa: novo card é criado no grafo
- Ao desativar uma etapa: card correspondente é removido
- Notificação toast confirma as mudanças

## 📊 Resumo

Na parte inferior da tabela, você encontra:
- Contador de produtos com cada etapa ativa
- Exemplo: "5/10 Compra" = 5 de 10 produtos têm a etapa de compra
- Ícones coloridos seguem o mesmo padrão da tabela

## 🎯 Vantagens sobre o Modal Anterior

✅ **Mais Visual**: Vê todos os produtos e etapas de uma vez  
✅ **Mais Rápido**: Não precisa abrir/fechar modal  
✅ **Mais Intuitivo**: Interface familiar (igual à tabela de produtos)  
✅ **Mais Informativo**: Resumo e contadores em tempo real  
✅ **Mais Flexível**: Ordenação e filtros integrados  

## 🛠️ Arquivos Modificados

### Criados
- `components/planejamento/ProductStatusTable.tsx` - Novo componente de tabela

### Modificados
- `components/planejamento-fluxo.tsx` - Substituído modal por tabela
  - Removido `BulkEditModal`
  - Adicionado `ProductStatusTable`
  - Alterado estado de `isBulkEditOpen` para `showStatusTable`
  - Botão agora alterna entre "Editar Etapas" e "Ocultar Tabela"

## 📱 Responsividade

- Scroll horizontal automático em telas menores
- Larguras mínimas definidas para cada coluna
- Max height para evitar tabela muito grande
- Overlay com fundo translúcido

## 🎨 Design

- Segue o padrão visual do gerenciador de produtos
- Cores e ícones consistentes com o resto do sistema
- Feedback visual em hover
- Transições suaves nas interações

## 🚀 Próximos Passos (Sugestões)

1. **Filtro de Pesquisa**: Adicionar campo de busca para filtrar produtos
2. **Salvamento**: Salvar configurações padrão por tipo de produto
3. **Templates**: Criar templates de etapas reutilizáveis
4. **Histórico**: Registrar mudanças de configuração
5. **Validação**: Alertas para configurações inválidas (ex: entrega sem embalagem)

---

**Data da Implementação**: 02/02/2025  
**Status**: ✅ Implementado e Funcional

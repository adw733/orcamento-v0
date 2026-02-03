// Adicionar a interface DadosEmpresa
export interface DadosEmpresa {
  id?: string
  nome: string
  cnpj: string
  email: string
  telefone: string
  endereco: string
  logo_url?: string
  site?: string
  slogan?: string
}

export type Tecido = {
  nome: string
  composicao: string
}

export type Estampa = {
  id?: string
  posicao?: string
  tipo?: string
  largura?: number
  comprimento?: number
}

// Remover o campo contato da interface Cliente
export type Cliente = {
  id: string
  codigo: string // Novo campo para código sequencial
  nome: string
  cnpj: string
  endereco: string
  telefone: string
  email: string
  contato?: string
}

// Modificar a interface Produto para incluir categoria
export type Produto = {
  id: string
  codigo: string // Novo campo para código sequencial
  nome: string
  valorBase: number
  tecidos: Tecido[]
  cores: string[]
  tamanhosDisponiveis: string[]
  categoria?: string // Nova propriedade para categorização
}

export type ItemOrcamento = {
  id: string
  produtoId: string
  produto?: Produto
  quantidade: number
  valorUnitario: number
  tecidoSelecionado?: Tecido
  corSelecionada?: string
  tipoTamanhoSelecionado?: string // Novo campo para o tipo de tamanho
  estampas?: Estampa[] // Alterado para array de estampas
  tamanhos: {
    [tamanho: string]: number
  }
  imagem?: string
  observacaoComercial?: string // Observação que aparece no orçamento
  observacaoTecnica?: string // Observação que aparece na ficha técnica
}

// Atualizar o tipo Orcamento para incluir os campos de contato
export type Orcamento = {
  id?: string
  numero: string
  data: string
  cliente: Cliente | null
  itens: ItemOrcamento[]
  observacoes: string
  condicoesPagamento: string
  prazoEntrega: string
  validadeOrcamento: string
  status?: string // Adicionar campo de status
  valorFrete?: number // Adicionar campo de valor do frete
  nomeContato?: string // Novo campo para nome do contato
  telefoneContato?: string // Novo campo para telefone do contato
  valorDesconto?: number // Valor do desconto
  tipoDesconto?: 'percentual' | 'valor' // Tipo do desconto: percentual (%) ou valor fixo (R$)
}

// Tipos para o planejamento de produção
export type TarefaPlanejamento = {
  id: string
  orcamento_id?: string
  nome: string
  data_inicio: string // YYYY-MM-DD
  data_fim: string // YYYY-MM-DD
  progresso: number // 0-100
  dependencias?: string[] // Array de IDs de tarefas
  cor?: string // Cor da tarefa no Gantt
  status?: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada'
  responsavel?: string
  observacoes?: string
  created_at?: string
  updated_at?: string
}

/**
 * CONFIGURAÇÃO DO SISTEMA DE BACKUP
 * 
 * Centralize todas as configurações de backup aqui
 */

export const BACKUP_CONFIG = {
  // ============================================
  // CONFIGURAÇÕES GERAIS
  // ============================================
  
  // Diretório base para backups (relativo ao projeto)
  backup_dir: 'backup_supabase',
  
  // ============================================
  // TABELAS
  // ============================================
  
  // Lista de tabelas a serem incluídas no backup
  // Se vazio [], detecta automaticamente todas as tabelas
  tables: [
    'categorias',
    'clientes',
    'configuracoes',
    'cores',
    'empresa',
    'estampas',
    'gastos_receitas',
    'itens_orcamento',
    'materiais',
    'movimentacoes_financeiras',
    'orcamentos',
    'produtos',
    'tecidos',
    'tecidos_base',
    'timeline_pedidos',
    'tipos_tamanho',
    'usuarios',
  ],
  
  // Tabelas a ignorar (não fazer backup)
  excluir_tabelas: [
    '_prisma_migrations',
    'storage.buckets',
    'auth.users', // Nunca fazer backup de auth diretamente
  ],

  // ============================================
  // BACKUP DO SCHEMA
  // ============================================
  
  incluir_schema: true,
  
  // ============================================
  // BACKUP DO STORAGE
  // ============================================
  
  incluir_storage: true,
  
  // Buckets específicos (deixe vazio [] para todos)
  buckets: [],  // ['orcamentos-imagens', 'logos']
  
  // ============================================
  // AGENDAMENTO
  // ============================================
  
  agendamento: {
    // Intervalo entre backups (em horas)
    intervalo_horas: 24,
    
    // Máximo de backups a manter
    max_backups: 7,
    
    // Executar ao iniciar o agendador?
    executar_ao_iniciar: true,
  },
  
  // ============================================
  // AVANÇADO
  // ============================================
  
  // Tabelas a ignorar no backup
  tabelas_ignorar: [
    // '_migrations',
    // '_analytics',
  ],
  
  // Limite de registros por consulta (paginação)
  page_size: 1000,
  
  // Timeout para downloads (ms)
  download_timeout: 30000,
}

export default CONFIG

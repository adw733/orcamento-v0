import { supabase } from '@/lib/supabase';
import { StageType } from '@/types/planejamento';

// Interface para configuração de etapas por produto
export interface ProductStageConfig {
  productId: string;
  productName: string;
  cliente: string;
  quantidade: number;
  stages: Partial<Record<StageType, boolean>>;
  stageDates: Partial<Record<StageType, string>>;
}

// Interface do banco de dados (usando tabela existente planejamento_etapas_config)
interface ConfiguracaoEtapaDB {
  id?: string;
  tenant_id: string;
  product_id: string;
  product_name: string | null;
  cliente: string | null;
  quantidade: number | null;
  stages: {
    enabled: Partial<Record<StageType, boolean>>;
    dates: Partial<Record<StageType, string>>;
  };
  created_at?: string;
  updated_at?: string;
}

// Converter config para formato do banco (JSONB)
function configToDb(config: ProductStageConfig, tenantId: string): ConfiguracaoEtapaDB {
  return {
    tenant_id: tenantId,
    product_id: config.productId,
    product_name: config.productName,
    cliente: config.cliente,
    quantidade: config.quantidade,
    stages: {
      enabled: config.stages,
      dates: config.stageDates,
    },
  };
}

// Converter formato do banco para config
function dbToConfig(db: ConfiguracaoEtapaDB): ProductStageConfig {
  const stages = db.stages || { enabled: {}, dates: {} };
  return {
    productId: db.product_id,
    productName: db.product_name || '',
    cliente: db.cliente || '',
    quantidade: db.quantidade || 0,
    stages: stages.enabled || {},
    stageDates: stages.dates || {},
  };
}

// Carregar todas as configurações de etapas do tenant
export async function carregarConfiguracoesEtapas(tenantId: string): Promise<ProductStageConfig[]> {
  const { data, error } = await supabase
    .from('planejamento_etapas_config')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Erro ao carregar configurações de etapas:', error);
    throw error;
  }

  return (data || []).map(dbToConfig);
}

// Carregar configurações de etapas por IDs de produto
export async function carregarConfiguracoesEtapasPorProdutos(
  tenantId: string,
  productIds: string[]
): Promise<ProductStageConfig[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('planejamento_etapas_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('product_id', productIds);

  if (error) {
    console.error('Erro ao carregar configurações de etapas:', error);
    throw error;
  }

  return (data || []).map(dbToConfig);
}

// Salvar ou atualizar uma configuração de etapa
export async function salvarConfiguracaoEtapa(
  config: ProductStageConfig,
  tenantId: string
): Promise<void> {
  const dbConfig = configToDb(config, tenantId);

  const { error } = await supabase
    .from('planejamento_etapas_config')
    .upsert(dbConfig as any, {
      onConflict: 'tenant_id,product_id',
    });

  if (error) {
    console.error('Erro ao salvar configuração de etapa:', error);
    throw error;
  }
}

// Salvar múltiplas configurações de etapas (batch)
export async function salvarConfiguracoesEtapas(
  configs: ProductStageConfig[],
  tenantId: string
): Promise<void> {
  if (configs.length === 0) return;

  const dbConfigs = configs.map(c => configToDb(c, tenantId));

  const { error } = await supabase
    .from('planejamento_etapas_config')
    .upsert(dbConfigs as any, {
      onConflict: 'tenant_id,product_id',
    });

  if (error) {
    console.error('Erro ao salvar configurações de etapas:', error);
    throw error;
  }
}

// Deletar configuração de etapa por produto
export async function deletarConfiguracaoEtapa(
  productId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('planejamento_etapas_config')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('product_id', productId);

  if (error) {
    console.error('Erro ao deletar configuração de etapa:', error);
    throw error;
  }
}

// Deletar todas as configurações de um orçamento
export async function deletarConfiguracoesOrcamento(
  orcamentoNumero: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('planejamento_etapas_config')
    .delete()
    .eq('tenant_id', tenantId)
    .like('product_id', `${orcamentoNumero}-%`);

  if (error) {
    console.error('Erro ao deletar configurações do orçamento:', error);
    throw error;
  }
}

-- Otimizações para carregamento rápido da lista de orçamentos
-- 1) Função resumida para evitar carregar JSON pesado de itens
-- 2) Índice composto para filtro por tenant + deleted_at + ordenação por número

CREATE INDEX IF NOT EXISTS idx_orcamentos_tenant_deleted_numero
  ON public.orcamentos (tenant_id, deleted_at, numero DESC);

CREATE OR REPLACE FUNCTION public.get_orcamentos_lista_resumo(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  numero text,
  data date,
  cliente_id uuid,
  cliente jsonb,
  status varchar,
  prazo_entrega text,
  contato_nome text,
  contato_telefone text,
  valor_frete numeric,
  valor_total numeric,
  tem_imagem_faltante boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH itens_agg AS (
    SELECT
      io.orcamento_id,
      COALESCE(
        SUM(
          (COALESCE(io.quantidade, 0)::numeric)
          * (COALESCE(io.valor_unitario, 0)::numeric)
          * (1 - COALESCE(io.desconto_unitario_percentual, 0)::numeric / 100)
        ),
        0
      ) AS total_itens,
      COALESCE(BOOL_OR(io.imagem IS NULL OR BTRIM(io.imagem) = ''), false) AS tem_imagem_faltante
    FROM public.itens_orcamento io
    WHERE io.tenant_id = p_tenant_id
    GROUP BY io.orcamento_id
  )
  SELECT
    o.id,
    o.numero,
    o.data,
    o.cliente_id,
    CASE
      WHEN c.id IS NULL THEN NULL
      ELSE jsonb_build_object('id', c.id, 'nome', c.nome, 'cnpj', c.cnpj)
    END AS cliente,
    o.status,
    o.prazo_entrega,
    COALESCE(
      NULLIF(BTRIM(o.contato_nome), ''),
      NULLIF(BTRIM(o.itens->'metadados'->>'nomeContato'), ''),
      CASE
        WHEN o.numero LIKE '% - % - % - %' THEN NULLIF(BTRIM(regexp_replace(o.numero, '^.* - ', '')), '')
        ELSE NULL
      END
    ) AS contato_nome,
    COALESCE(NULLIF(BTRIM(o.contato_telefone), ''), NULLIF(BTRIM(o.itens->'metadados'->>'telefoneContato'), '')) AS contato_telefone,
    COALESCE(o.valor_frete, NULLIF(o.itens->'metadados'->>'valorFrete', '')::numeric, 0) AS valor_frete,
    (
      COALESCE(ia.total_itens, 0)
      + COALESCE(o.valor_frete, NULLIF(o.itens->'metadados'->>'valorFrete', '')::numeric, 0)
    )::numeric AS valor_total,
    COALESCE(ia.tem_imagem_faltante, false) AS tem_imagem_faltante,
    o.created_at,
    o.updated_at
  FROM public.orcamentos o
  LEFT JOIN public.clientes c ON c.id = o.cliente_id
  LEFT JOIN itens_agg ia ON ia.orcamento_id = o.id
  WHERE o.tenant_id = p_tenant_id
    AND o.deleted_at IS NULL
  ORDER BY o.numero DESC;
$$;

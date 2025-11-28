# RELATÓRIO DE ANÁLISE PARA TRANSFORMAÇÃO EM MICRO-SAAS

**Sistema:** ONEBASE - Sistema de Orçamentos  
**Data da Análise:** 28/11/2025  
**Versão Atual:** 0.1.0  
**Projeto Supabase:** fpejkwmapomxfyxmxqrd (sa-east-1)

---

## SUMÁRIO EXECUTIVO

### Visão Geral do Sistema
O ONEBASE é um sistema de geração de orçamentos para fabricação de uniformes industriais. Desenvolvido com Next.js 15, React 19, TypeScript e Supabase, oferece funcionalidades de gestão de clientes, produtos, materiais, orçamentos com exportação para PDF, dashboard financeiro (DRE) e assistente de IA integrado (Google Gemini).

### Principais Pontos Fortes
- **Stack Moderna**: Next.js 15 + React 19 + TypeScript + Supabase
- **UI/UX Profissional**: TailwindCSS + shadcn/ui + Radix UI
- **Funcionalidades Core Sólidas**: Orçamentos, clientes, produtos, materiais funcionais
- **Geração de PDF Dual-Mode**: Cliente-side (rápido) e server-side (Puppeteer profissional)
- **Dashboard Financeiro**: DRE, gráficos, análise por período
- **IA Integrada**: Assistente com Google Gemini para criação automatizada
- **Cache Inteligente**: Sistema de cache com TTL de 5 minutos implementado
- **Volume de Dados Real**: 110 orçamentos, 26 clientes, 32 produtos, 975 movimentações financeiras

### Gaps Críticos Identificados

| Gap | Severidade | Impacto no SaaS |
|-----|------------|-----------------|
| **Sem Autenticação** | 🔴 CRÍTICO | Impossível lançar |
| **Sem Multi-tenancy** | 🔴 CRÍTICO | Impossível ter múltiplos clientes |
| **RLS Desabilitado** | 🔴 CRÍTICO | Dados públicos na internet |
| **API Keys Hardcoded** | 🔴 CRÍTICO | Vazamento de credenciais |
| **Sem Sistema de Billing** | 🟠 ALTO | Sem monetização |
| **Componentes Monolíticos** | 🟡 MÉDIO | Manutenção difícil |
| **Sem Testes** | 🟡 MÉDIO | Risco de regressões |

### Estimativa de Esforço Total
| Fase | Esforço | Duração Estimada |
|------|---------|------------------|
| Fundação (Crítico) | ALTO | 3-4 semanas |
| Monetização | MÉDIO | 2-3 semanas |
| Escala | MÉDIO | 2-3 semanas |
| Diferenciação | BAIXO | 1-2 semanas |
| **TOTAL** | - | **8-12 semanas** |

### Recomendação: ⚠️ GO COM RESSALVAS

O sistema tem uma base funcional sólida e já possui usuários ativos (dados reais no banco). A transformação em SaaS é viável, mas **requer investimento significativo em segurança e multi-tenancy antes de qualquer lançamento comercial**.

---

## ESTADO ATUAL DO SISTEMA

### 1. ARQUITETURA E ESTRUTURA

#### Stack Tecnológico
| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Framework** | Next.js | 15.2.4 |
| **Frontend** | React | 19 |
| **Linguagem** | TypeScript | 5.x |
| **Styling** | TailwindCSS | 3.4.17 |
| **Componentes** | shadcn/ui + Radix UI | Latest |
| **Backend/DB** | Supabase (PostgreSQL) | 15.8 |
| **PDF** | Puppeteer + @react-pdf/renderer | Latest |
| **IA** | Google Gemini API | 0.11.0 |
| **Gráficos** | Recharts | 2.15.0 |
| **Forms** | React Hook Form + Zod | 7.54.1 / 3.24.1 |

#### Estrutura de Diretórios
```
orcamento_rev2/
├── app/                    # Next.js App Router
│   ├── api/export-pdf/     # API Route para PDF
│   ├── actions/            # Server Actions (Gemini)
│   ├── dashboard/          # Página do dashboard
│   └── orcamento-otimizado/# Página standalone
├── components/             # 75 componentes
│   ├── ui/                 # shadcn/ui (50 componentes)
│   └── *.tsx               # Componentes de negócio
├── lib/                    # Utilitários e serviços
│   ├── supabase.ts         # Cliente Supabase
│   ├── services.ts         # Serviços de dados
│   ├── data-cache.tsx      # Sistema de cache
│   └── services-materiais.ts
├── types/                  # Definições TypeScript
├── hooks/                  # Custom hooks
├── scripts/                # Scripts de migração SQL
└── backup_supabase/        # Backups do banco
```

#### Arquitetura Atual
- **Tipo**: Monolito com renderização híbrida (SSR + CSR)
- **Padrão**: Client-side heavy ("use client" extensivo)
- **Estado**: React hooks sem gerenciador global (apenas Context para cache)
- **Roteamento**: App Router + Hash-based navigation interno

#### Padrões de Design Identificados
- ✅ Singleton para cliente Supabase
- ✅ Provider Pattern para cache de dados
- ✅ Composite Pattern em componentes UI
- ⚠️ Componentes monolíticos (gerador-orcamento.tsx com 2720 linhas)
- ❌ Sem Repository Pattern
- ❌ Sem Service Layer clara

### 2. FUNCIONALIDADES EXISTENTES

#### Core Features (Implementadas e Funcionais)

| Feature | Componente | Status |
|---------|------------|--------|
| **Gestão de Orçamentos** | `gerador-orcamento.tsx`, `lista-orcamentos.tsx` | ✅ Completo |
| **Gestão de Clientes** | `gerenciador-clientes.tsx` | ✅ Completo |
| **Gestão de Produtos** | `gerenciador-produtos.tsx` | ✅ Completo |
| **Gestão de Materiais** | `gerenciador-materiais.tsx` | ✅ Completo |
| **Categorias** | `gerenciador-categorias.tsx` | ✅ Completo |
| **Tipos de Tamanho** | `gerenciador-tipos-tamanho.tsx` | ✅ Completo |
| **Dashboard Financeiro** | `dashboard-financeiro.tsx` | ✅ Completo |
| **Gastos/Receitas** | `gerenciador-gastos-receitas.tsx` | ✅ Completo |
| **Exportação PDF** | `pdf-orcamento.tsx`, `pdf-ficha-tecnica.tsx` | ✅ Completo |
| **Lixeira** | `lixeira-orcamentos.tsx` | ✅ Completo |
| **Assistente IA** | `assistente-ia.tsx` | ✅ Completo |
| **Dados Empresa** | `gerenciador-empresa.tsx` | ✅ Completo |
| **Visualização Editável** | `visualizacao-editavel.tsx` | ✅ Completo |

#### Core Value Proposition
Sistema completo para **fabricantes de uniformes** gerenciarem:
1. Catálogo de produtos (uniformes) com variações de tecido, cor, tamanho
2. Base de clientes corporativos (B2B)
3. Orçamentos profissionais com exportação PDF
4. Fluxo de status do pedido (Proposta → Cobrança → Execução → Entregue)
5. Controle financeiro (DRE, despesas, receitas)

#### Fluxos de Usuário Principais
1. **Criar Orçamento**: Selecionar cliente → Adicionar itens → Configurar tecidos/cores/estampas → Exportar PDF
2. **Gestão Financeira**: Registrar gastos/receitas → Visualizar DRE → Filtrar por período
3. **Catálogo**: Gerenciar produtos → Associar materiais → Definir preços base
4. **IA**: Upload de arquivo/imagem → Extração automática → Criação de orçamento

#### APIs e Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/export-pdf` | POST | Geração de PDF com Puppeteer |
| Server Actions | - | `gemini-actions.ts` para IA |

#### Integrações Externas
| Serviço | Status | Uso |
|---------|--------|-----|
| **Supabase** | ✅ Ativo | Database + Storage |
| **Google Gemini** | ✅ Ativo | Assistente IA |
| **Vercel** | ⚠️ Configurado | Deploy (pasta .vercel existe) |

### 3. ANÁLISE DE CÓDIGO E QUALIDADE

#### Métricas de Complexidade

| Arquivo | Linhas | Status |
|---------|--------|--------|
| `gerador-orcamento.tsx` | 2720 | 🔴 CRÍTICO - Refatorar |
| `visualizacao-editavel.tsx` | 1553 | 🟠 ALTO - Dividir |
| `dashboard-financeiro.tsx` | 1001 | 🟡 MÉDIO |
| `gemini-actions.ts` | 1957 | 🟠 ALTO - Dividir |
| `lista-orcamentos.tsx` | 1036 | 🟡 MÉDIO |
| `gerenciador-materiais.tsx` | 344 | ✅ OK |

#### Code Smells Identificados
1. **God Component**: `gerador-orcamento.tsx` gerencia 15+ estados diferentes
2. **Duplicação**: Lógica de parsing de JSON de itens duplicada em 4+ lugares
3. **Hardcoded Values**: Status de orçamento como strings ("1", "2", "3"...)
4. **Type Inconsistency**: Alguns campos são `number`, outros `string` para valores monetários
5. **Any Types**: Uso extensivo de `any` em handlers de IA

#### Débitos Técnicos
| Débito | Prioridade | Esforço |
|--------|------------|---------|
| Refatorar `gerador-orcamento.tsx` | ALTA | 3-5 dias |
| Remover SELECT * das queries | ALTA | 1 dia |
| Implementar paginação em listas | ALTA | 2 dias |
| Adicionar testes unitários | MÉDIA | 5+ dias |
| Normalizar modelo de dados | MÉDIA | 3 dias |
| Documentação técnica | BAIXA | 2 dias |

#### Testes
- ❌ **Testes Unitários**: Não existem
- ❌ **Testes de Integração**: Não existem
- ❌ **Testes E2E**: Não existem
- ❌ **Cobertura**: 0%

#### Tratamento de Erros
- ✅ Try-catch em operações de banco
- ✅ Feedback visual ao usuário (toast)
- ⚠️ Console.error extensivo (não ideal para produção)
- ❌ Sem logging centralizado
- ❌ Sem error boundaries React

#### Documentação
- ✅ `CLAUDE.md` com overview do projeto
- ✅ `ANALISE_PERFORMANCE_SEGURANCA.md` existente
- ✅ `RELATORIO_ANALISE_BANCO_DADOS.md` existente
- ⚠️ Comentários inline escassos
- ❌ Sem documentação de API
- ❌ Sem Storybook para componentes

### 4. SEGURANÇA (CRÍTICO PARA SAAS)

#### 🔴 PROBLEMAS CRÍTICOS

##### 4.1 Autenticação: INEXISTENTE
```typescript
// lib/supabase.ts - Cliente público sem auth
export const supabase = createClient<Database>(
  supabaseUrl || "https://your-project.supabase.co",
  supabaseAnonKey || "your-anon-key",
)
```
**Status**: ❌ Sistema completamente público  
**Impacto**: Qualquer pessoa pode acessar todos os dados

##### 4.2 API Keys Expostas no Código
```typescript
// components/assistente-ia.tsx:44
const [apiKey, setApiKey] = useState("AIzaSyCTqW48OFu3BPowgrc0xtBVmvGQAvUQX5I")

// app/actions/gemini-actions.ts:18
return "AIzaSyCTqW48OFu3BPowgrc0xtBVmvGQAvUQX5I"
```
**Status**: 🔴 VAZAMENTO DE CREDENCIAIS  
**Impacto**: API key do Google Gemini exposta publicamente

##### 4.3 Supabase Anon Key Exposta
```env
# .env.local - Arquivo versionado incorretamente
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Status**: ⚠️ Anon key em arquivo local  
**Nota**: Anon key pode ser pública, mas RLS deve estar ativo

##### 4.4 RLS (Row Level Security) Desabilitado
| Tabela | RLS Status | Risco |
|--------|------------|-------|
| clientes | ❌ Desabilitado | CRÍTICO |
| produtos | ❌ Desabilitado | CRÍTICO |
| orcamentos | ❌ Desabilitado | CRÍTICO |
| gastos_receitas | ❌ Desabilitado | CRÍTICO |
| empresa | ❌ Desabilitado | CRÍTICO |
| itens_orcamento | ❌ Desabilitado | CRÍTICO |
| (todas as outras) | ❌ Desabilitado | CRÍTICO |

**Impacto**: Qualquer pessoa com a URL do Supabase pode ler/modificar TODOS os dados

#### Autorização
- ❌ Não existe sistema de roles
- ❌ Não existe controle de permissões
- ❌ Não existe separação de dados por usuário

#### Proteção de Dados
- ❌ Sem criptografia de dados sensíveis
- ❌ CNPJ, emails, telefones armazenados em texto plano
- ⚠️ Dados financeiros sem proteção adicional

#### Vulnerabilidades Comuns
| Vulnerabilidade | Status | Notas |
|-----------------|--------|-------|
| SQL Injection | ✅ Protegido | Supabase client usa prepared statements |
| XSS | ⚠️ Parcial | React escapa por padrão, mas dangerouslySetInnerHTML pode existir |
| CSRF | ⚠️ Parcial | Next.js tem proteções básicas |
| Exposição de Dados | 🔴 VULNERÁVEL | RLS desabilitado |

#### Compliance LGPD/GDPR
- ❌ Sem consentimento de cookies
- ❌ Sem política de privacidade
- ❌ Sem termos de uso
- ❌ Sem mecanismo de exclusão de dados (direito ao esquecimento)
- ❌ Sem exportação de dados pessoais

#### Secrets Management
| Secret | Localização | Status |
|--------|-------------|--------|
| Supabase URL | `.env.local` | ⚠️ OK (pode ser público) |
| Supabase Anon Key | `.env.local` | ⚠️ OK se RLS ativo |
| Gemini API Key | Hardcoded | 🔴 CRÍTICO |

### 5. MULTI-TENANCY

#### Status Atual: ❌ NÃO EXISTE

O sistema foi desenvolvido como **single-tenant** para uso interno de uma única empresa.

| Aspecto | Status Atual |
|---------|--------------|
| Suporte a múltiplos clientes | ❌ Não |
| Isolamento de dados | ❌ Não |
| Campo `tenant_id` nas tabelas | ❌ Não existe |
| Login por organização | ❌ Não existe |
| Customização por tenant | ❌ Não existe |

#### Estratégia Recomendada para Multi-tenancy

**Opção Sugerida**: Shared Database + Schema-based Isolation

```sql
-- Adicionar campo tenant_id em TODAS as tabelas
ALTER TABLE orcamentos ADD COLUMN tenant_id UUID REFERENCES auth.users(id);
ALTER TABLE clientes ADD COLUMN tenant_id UUID REFERENCES auth.users(id);
ALTER TABLE produtos ADD COLUMN tenant_id UUID REFERENCES auth.users(id);
-- ... repetir para todas as tabelas

-- Habilitar RLS
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

-- Política de isolamento
CREATE POLICY "Tenant isolation" ON orcamentos
  USING (tenant_id = auth.uid());
```

### 6. INFRAESTRUTURA E DEPLOY

#### Deploy Atual
- **Provedor**: Vercel (configuração detectada em `.vercel/`)
- **Banco**: Supabase (sa-east-1 - São Paulo)
- **Região**: Brasil

#### Containerização
- ❌ Sem Docker
- ❌ Sem docker-compose
- ❌ Sem Kubernetes

#### CI/CD
- ❌ Sem pipeline de CI/CD configurado
- ❌ Sem GitHub Actions
- ⚠️ Build ignora erros TypeScript/ESLint (risco)

```javascript
// next.config.mjs
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },    // ⚠️ Risco
  typescript: { ignoreBuildErrors: true }, // ⚠️ Risco
}
```

#### Ambiente de Staging
- ❌ Não existe ambiente de staging
- ⚠️ Apenas produção

#### Escalabilidade
| Aspecto | Status |
|---------|--------|
| Horizontal Scaling | ✅ Possível (Vercel) |
| Database Scaling | ⚠️ Limitado (Supabase free tier) |
| CDN | ✅ Vercel Edge Network |
| Serverless | ✅ API Routes são serverless |

### 7. BANCO DE DADOS

#### Modelo de Dados Atual

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    clientes     │     │    produtos     │     │     cores       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ codigo          │     │ codigo          │     │ nome            │
│ nome            │     │ nome            │     │ codigo_hex      │
│ cnpj            │     │ valor_base      │     └─────────────────┘
│ endereco        │     │ cores[]         │
│ telefone        │     │ tamanhos[]      │     ┌─────────────────┐
│ email           │     └────────┬────────┘     │  tecidos_base   │
│ contato         │              │              ├─────────────────┤
└────────┬────────┘              │              │ id (PK)         │
         │                       │              │ nome            │
         │                       ▼              │ composicao      │
         │              ┌─────────────────┐     └─────────────────┘
         │              │    tecidos      │
         │              ├─────────────────┤     ┌─────────────────┐
         │              │ id (PK)         │     │ tipos_tamanho   │
         │              │ nome            │     ├─────────────────┤
         │              │ composicao      │     │ id (PK)         │
         │              │ produto_id (FK) │     │ nome            │
         │              └─────────────────┘     │ tamanhos[]      │
         │                                      └─────────────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   orcamentos    │────▶│ itens_orcamento │────▶│    estampas     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ numero          │     │ orcamento_id    │     │ item_orcamento_id│
│ data            │     │ produto_id      │     │ posicao         │
│ cliente_id (FK) │     │ quantidade      │     │ tipo            │
│ status          │     │ valor_unitario  │     │ largura         │
│ itens (JSONB)   │◀─┐  │ tamanhos (JSONB)│     └─────────────────┘
│ observacoes     │  │  └─────────────────┘
│ condicoes_pag   │  │
│ prazo_entrega   │  │  ⚠️ DUPLICAÇÃO: itens armazenados
│ validade        │  │     tanto em JSON quanto em tabela
│ deleted_at      │  │     relacional
└─────────────────┘  │
                     │
         ┌───────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ gastos_receitas │     │     empresa     │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ data            │     │ nome            │
│ tipo            │     │ cnpj            │
│ categoria       │     │ endereco        │
│ sub_categoria   │     │ telefone        │
│ valor           │     │ email           │
│ descricao       │     │ logo_url        │
│ conta           │     └─────────────────┘
└─────────────────┘
```

#### Volume de Dados

| Tabela | Registros | Tamanho |
|--------|-----------|---------|
| orcamentos | 110 | 38 MB |
| itens_orcamento | ~300 | 26 MB |
| gastos_receitas | 975 | 408 KB |
| produtos | 32 | 32 KB |
| clientes | 26 | 32 KB |
| estampas | ~150 | 88 KB |
| tecidos | 4 | 64 KB |

#### Problemas no Modelo

1. **Dados Duplicados**: Campo `itens` JSONB na tabela `orcamentos` duplica dados de `itens_orcamento`
2. **Tabelas Vazias**: `categorias`, `cores`, `empresa`, `configuracoes` sem uso
3. **Índices Faltantes**: FKs sem índices (orcamento_id, produto_id, cliente_id)
4. **JSONB Excessivo**: Tamanhos armazenados como JSON em vez de tabela normalizada

#### Migrações
- ✅ Scripts SQL existentes em `scripts/`
- ⚠️ Sem sistema de migração versionado (Prisma, Drizzle, etc.)
- ⚠️ Migrações executadas manualmente

#### Backup
- ✅ Backup manual existente em `backup_supabase/backup_26_09_25/`
- ⚠️ Supabase free tier: backup point-in-time limitado
- ❌ Sem backup automatizado para storage externo

### 8. MONETIZAÇÃO E BILLING

#### Status Atual: ❌ NÃO EXISTE

| Funcionalidade | Status |
|----------------|--------|
| Sistema de planos | ❌ |
| Pricing tiers | ❌ |
| Gateway de pagamento | ❌ |
| Controle de limites | ❌ |
| Trial period | ❌ |
| Invoicing | ❌ |
| Cobrança recorrente | ❌ |

#### Sugestão de Modelo de Pricing

| Plano | Preço/mês | Limites Sugeridos |
|-------|-----------|-------------------|
| **Starter** | R$ 49 | 50 orçamentos/mês, 1 usuário |
| **Professional** | R$ 99 | 200 orçamentos/mês, 3 usuários, IA |
| **Business** | R$ 199 | Ilimitado, 10 usuários, API, Whitelabel |

### 9. EXPERIÊNCIA DO USUÁRIO

#### Onboarding
- ❌ Sem wizard de onboarding
- ❌ Sem tutorial interativo
- ❌ Sem emails de boas-vindas
- ⚠️ Sistema assume conhecimento prévio

#### Self-service vs Sales-assisted
- ⚠️ Atualmente requer configuração manual
- ❌ Sem signup automatizado
- ❌ Sem self-service provisioning

#### Documentação para Usuários
- ❌ Sem help center
- ❌ Sem FAQs
- ❌ Sem vídeos tutoriais
- ⚠️ Tooltips existem mas são escassos

#### Notificações
- ✅ Toast notifications para ações
- ❌ Sem notificações push
- ❌ Sem emails transacionais
- ❌ Sem alertas de prazo de entrega

#### Suporte
- ❌ Sem chat integrado
- ❌ Sem sistema de tickets
- ❌ Sem FAQ/Knowledge base

### 10. OPERAÇÕES E MONITORAMENTO

| Aspecto | Status |
|---------|--------|
| Logging centralizado | ❌ Apenas console.log |
| APM (Application Performance) | ❌ |
| Error tracking (Sentry) | ❌ |
| Métricas de negócio | ❌ |
| Dashboards operacionais | ❌ |
| Alertas | ❌ |
| Health checks | ❌ |
| Status page | ❌ |

---

## ROADMAP DE TRANSFORMAÇÃO

### FASE 1: FUNDAÇÃO (Crítico - Fazer Primeiro)

| # | Item | Descrição | Esforço | Prioridade | Impacto |
|---|------|-----------|---------|------------|---------|
| 1.1 | **Implementar Autenticação Supabase** | Adicionar Supabase Auth com email/senha, magic link, OAuth (Google) | 3 dias | P0 | 🔴 Blocker |
| 1.2 | **Habilitar RLS em TODAS as tabelas** | Ativar Row Level Security e criar políticas de isolamento | 2 dias | P0 | 🔴 Blocker |
| 1.3 | **Adicionar campo tenant_id** | Migração para adicionar tenant_id em todas as tabelas | 2 dias | P0 | 🔴 Blocker |
| 1.4 | **Remover API Keys Hardcoded** | Mover Gemini API key para variáveis de ambiente seguras | 1 dia | P0 | 🔴 Blocker |
| 1.5 | **Criar páginas de auth** | Login, signup, forgot password, reset password | 2 dias | P0 | 🔴 Blocker |
| 1.6 | **Criar middleware de autenticação** | Proteger todas as rotas e APIs | 1 dia | P0 | 🔴 Blocker |
| 1.7 | **Criar índices no banco** | Índices em FKs e campos de busca frequente | 1 dia | P1 | 🟠 Alto |
| 1.8 | **Corrigir builds com erros** | Remover flags de ignore TypeScript/ESLint | 2 dias | P1 | 🟠 Alto |

**Duração Estimada Fase 1**: 3-4 semanas

### FASE 2: MONETIZAÇÃO (Necessário para Receita)

| # | Item | Descrição | Esforço | Prioridade | Impacto |
|---|------|-----------|---------|------------|---------|
| 2.1 | **Integrar Stripe** | Configurar Stripe para assinaturas recorrentes (suporta PIX/Boleto) | 3 dias | P0 | 🔴 Blocker |
| 2.2 | **Criar modelo de planos** | Tabela de planos, features por plano, limites | 2 dias | P0 | 🔴 Blocker |
| 2.3 | **Implementar billing page** | Página de gestão de assinatura, upgrade, downgrade | 2 dias | P0 | 🔴 Blocker |
| 2.4 | **Criar trial de 14 dias** | Período de teste com todas as features | 1 dia | P1 | 🟠 Alto |
| 2.5 | **Webhooks do Stripe** | Processar eventos de pagamento, cancelamento, etc. | 2 dias | P1 | 🟠 Alto |
| 2.6 | **Controle de limites** | Verificar limites do plano antes de criar recursos | 2 dias | P1 | 🟠 Alto |
| 2.7 | **Landing page** | Página de vendas com pricing, features, CTA | 3 dias | P1 | 🟠 Alto |

**Duração Estimada Fase 2**: 2-3 semanas

### FASE 3: ESCALA (Crescimento)

| # | Item | Descrição | Esforço | Prioridade | Impacto |
|---|------|-----------|---------|------------|---------|
| 3.1 | **Refatorar gerador-orcamento.tsx** | Dividir em componentes menores, extrair hooks | 5 dias | P2 | 🟡 Médio |
| 3.2 | **Implementar React Query** | Substituir cache manual por React Query/TanStack | 3 dias | P2 | 🟡 Médio |
| 3.3 | **Adicionar paginação server-side** | Paginação com cursor em todas as listas | 2 dias | P2 | 🟡 Médio |
| 3.4 | **Otimizar queries Supabase** | Selecionar apenas campos necessários, remover N+1 | 2 dias | P2 | 🟡 Médio |
| 3.5 | **Configurar CI/CD** | GitHub Actions para build, test, deploy | 2 dias | P2 | 🟡 Médio |
| 3.6 | **Adicionar testes unitários** | Jest + React Testing Library para componentes críticos | 5 dias | P2 | 🟡 Médio |
| 3.7 | **Implementar logging** | Integrar com serviço de logging (ex: Axiom, Logtail) | 1 dia | P2 | 🟡 Médio |
| 3.8 | **Error tracking** | Integrar Sentry para monitoramento de erros | 1 dia | P2 | 🟡 Médio |

**Duração Estimada Fase 3**: 2-3 semanas

### FASE 4: DIFERENCIAÇÃO (Competitividade)

| # | Item | Descrição | Esforço | Prioridade | Impacto |
|---|------|-----------|---------|------------|---------|
| 4.1 | **Multi-usuário por conta** | Permitir múltiplos usuários na mesma organização | 3 dias | P3 | 🟢 Médio |
| 4.2 | **Sistema de roles** | Admin, editor, viewer por organização | 2 dias | P3 | 🟢 Médio |
| 4.3 | **Onboarding wizard** | Tutorial interativo para novos usuários | 2 dias | P3 | 🟢 Médio |
| 4.4 | **Notificações por email** | Alertas de prazo, orçamento aprovado, etc. | 2 dias | P3 | 🟢 Médio |
| 4.5 | **API pública** | REST API para integrações externas | 3 dias | P3 | 🟢 Médio |
| 4.6 | **Whitelabel** | Logo e cores customizáveis por tenant | 2 dias | P3 | 🟢 Baixo |
| 4.7 | **Integração WhatsApp** | Envio de orçamento PDF via WhatsApp | 2 dias | P3 | 🟢 Baixo |

**Duração Estimada Fase 4**: 1-2 semanas

---

## CHECKLIST DE LANÇAMENTO

### Obrigatório (Blocker para lançamento)
- [ ] Autenticação de usuários implementada
- [ ] RLS habilitado em todas as tabelas
- [ ] Multi-tenancy com isolamento de dados
- [ ] API keys removidas do código
- [ ] Gateway de pagamento integrado (Stripe)
- [ ] Sistema de planos funcionando
- [ ] Termos de uso e política de privacidade
- [ ] HTTPS em todas as rotas
- [ ] Backup automatizado configurado

### Importante (MVP+)
- [ ] Landing page com pricing
- [ ] Email de boas-vindas
- [ ] Trial period de 14 dias
- [ ] Página de gestão de assinatura
- [ ] Help/FAQ básico
- [ ] Onboarding mínimo

### Nice to Have (Pós-lançamento)
- [ ] Testes automatizados
- [ ] CI/CD pipeline
- [ ] Monitoramento de erros (Sentry)
- [ ] Analytics de uso
- [ ] Chat de suporte

---

## RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Vazamento de dados antes do fix** | ALTA | CRÍTICO | Implementar RLS IMEDIATAMENTE, revogar API key atual |
| **Complexidade do multi-tenancy** | MÉDIA | ALTO | Usar padrão bem documentado, começar com shared DB |
| **Perda de dados em migração** | BAIXA | CRÍTICO | Fazer backup completo antes, testar em staging |
| **Downtime durante migração** | MÉDIA | MÉDIO | Migrar em horário de baixo uso, comunicar usuários |
| **Regressões por falta de testes** | ALTA | MÉDIO | Adicionar testes para features críticas primeiro |
| **Custo de infraestrutura** | BAIXA | BAIXO | Usar tiers gratuitos inicialmente, escalar sob demanda |
| **Churn por complexidade** | MÉDIA | ALTO | Investir em onboarding e UX |

---

## STACK RECOMENDADO

### Manter (Já Está Bom)
- ✅ Next.js 15 (App Router)
- ✅ React 19
- ✅ TypeScript
- ✅ TailwindCSS + shadcn/ui
- ✅ Supabase (Database + Auth + Storage)
- ✅ Vercel (Deploy)

### Adicionar
| Ferramenta | Propósito | Custo |
|------------|-----------|-------|
| **Stripe** | Pagamentos | 2.9% + R$0.40/transação |
| **Resend** | Emails transacionais | Free até 3k/mês |
| **Sentry** | Error tracking | Free até 5k events/mês |
| **Axiom** | Logging | Free até 500MB/mês |
| **Upstash** | Rate limiting | Free tier generoso |

### Substituir (Opcional - Médio Prazo)
| Atual | Sugerido | Motivo |
|-------|----------|--------|
| Cache manual | React Query/TanStack | Mais robusto, devtools |
| Console.log | Winston/Pino | Logging estruturado |

---

## ESTIMATIVA DE CUSTOS DE INFRAESTRUTURA

### Custo Atual (Single-tenant)
| Serviço | Tier | Custo/mês |
|---------|------|-----------|
| Supabase | Free | R$ 0 |
| Vercel | Hobby | R$ 0 |
| **TOTAL** | - | **R$ 0** |

### Custo Projetado (SaaS - 100 clientes)
| Serviço | Tier | Custo/mês |
|---------|------|-----------|
| Supabase | Pro | $25 (~R$ 125) |
| Vercel | Pro | $20 (~R$ 100) |
| Stripe | Fees | ~2.9% da receita |
| Resend | Pro | $20 (~R$ 100) |
| Sentry | Team | $26 (~R$ 130) |
| **TOTAL** | - | **~R$ 455 + fees** |

### Custo Projetado (SaaS - 1.000 clientes)
| Serviço | Tier | Custo/mês |
|---------|------|-----------|
| Supabase | Pro (scale) | $50-100 (~R$ 250-500) |
| Vercel | Pro | $20 (~R$ 100) |
| Stripe | Fees | ~2.9% da receita |
| Resend | Business | $40 (~R$ 200) |
| Sentry | Business | $80 (~R$ 400) |
| **TOTAL** | - | **~R$ 950-1.200 + fees** |

---

## MÉTRICAS DE SUCESSO SUGERIDAS

### KPIs Técnicos
| Métrica | Target MVP | Target 6 meses |
|---------|------------|----------------|
| Uptime | 99% | 99.9% |
| Page Load Time | < 3s | < 1.5s |
| Error Rate | < 5% | < 1% |
| Test Coverage | 20% | 60% |
| Lighthouse Score | 70 | 90 |

### KPIs de Negócio
| Métrica | Target MVP | Target 6 meses |
|---------|------------|----------------|
| Clientes pagantes | 10 | 100 |
| MRR (Monthly Recurring Revenue) | R$ 500 | R$ 10.000 |
| Churn Rate | < 15% | < 5% |
| Trial → Paid Conversion | 10% | 25% |
| NPS | 30 | 50 |
| Orçamentos gerados/mês | 500 | 5.000 |

---

## PRÓXIMOS PASSOS IMEDIATOS

### Esta Semana (URGENTE - Segurança)
1. **Revogar API key do Gemini** que está exposta no código
2. **Mover credenciais para variáveis de ambiente** seguras
3. **Fazer backup completo** do banco de dados atual
4. **Habilitar RLS** em todas as tabelas do Supabase

### Próximas 2 Semanas
5. **Implementar Supabase Auth** com email/senha
6. **Adicionar campo tenant_id** em todas as tabelas
7. **Criar middleware de autenticação** no Next.js
8. **Criar páginas de login/signup**

### Próximo Mês
9. **Integrar Stripe** para pagamentos
10. **Criar modelo de planos** e página de pricing
11. **Implementar trial period**
12. **Lançar MVP** para primeiros clientes beta

---

## CONCLUSÃO

O ONEBASE tem uma **base técnica sólida** e **funcionalidades core bem implementadas**. O sistema já está em uso real com dados significativos (110+ orçamentos, 975+ movimentações financeiras), o que valida a proposta de valor.

**Porém**, existem **gaps críticos de segurança** que devem ser resolvidos ANTES de qualquer comercialização:
- Autenticação inexistente
- RLS desabilitado
- API keys expostas

Com um investimento de **8-12 semanas** de desenvolvimento focado, o sistema pode ser transformado em um Micro-SaaS viável para o mercado de fabricantes de uniformes no Brasil.

**Potencial de Mercado**: O nicho de fabricantes de uniformes industriais é bem definido e tem demanda real por digitalização. O diferencial de ter IA integrada (Gemini) para extração de orçamentos pode ser um forte diferencial competitivo.

---

*Relatório gerado em 28/11/2025 por análise automatizada do código-fonte.*

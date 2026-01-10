# 🔐 CREDENCIAIS DE ACESSO - Sistema OneBase

**Data:** 29/11/2025 (Atualizado)  
**URL:** http://localhost:3002 (desenvolvimento - porta pode variar)

---

## 👤 USUÁRIOS DISPONÍVEIS

### 1. Usuário Principal (com dados existentes)
```
Email:    jordysilva733@gmail.com
Senha:    [verificar no Supabase Dashboard]
Tenant:   Configurado
Empresa:  ONEBASE Principal
Dados:    ✅ 82 orçamentos carregando corretamente
```

> ⚠️ **NOTA:** Se a senha não funcionar, use o Supabase Dashboard para resetar:
> 1. Acesse: https://supabase.com/dashboard
> 2. Vá em Authentication > Users
> 3. Encontre o usuário e clique em "Send password recovery"

### 2. Usuário de Teste 1 (sem dados - pronto para setup)
```
Email:    teste@exemplo.com
Senha:    teste123
Tenant:   SEM TENANT (precisa fazer onboarding)
Empresa:  -
Dados:    Vazio (ambiente zerado)
```

### 3. Usuário de Teste 2 (sem dados - pronto para setup)
```
Email:    teste.saas@exemplo.com
Senha:    [solicitar reset de senha]
Tenant:   SEM TENANT (precisa fazer onboarding)
Empresa:  -
Dados:    Vazio (ambiente zerado)
```

---

## 🚀 FLUXO DE TESTE

### Para o usuário principal (jordysilva733@gmail.com):
1. Acesse http://localhost:3002/login
2. Digite: jordysilva733@gmail.com / [sua senha]
3. ✅ Deve ver todos os seus dados (82 orçamentos)

### Para usuários de teste (novos ambientes):
1. Acesse http://localhost:3002/cadastro
2. Crie uma nova conta com email válido
3. ⚠️ Confirme o email (se confirmação estiver habilitada)
4. Faça login e será redirecionado para /setup
5. Preencha o nome da empresa
6. ✅ Será criado um novo tenant isolado
7. ✅ Começará com dados zerados

### Para criar novo usuário:
1. Acesse http://localhost:3002/cadastro
2. Preencha nome, email e senha (mínimo 6 caracteres)
3. ⚠️ Confirme o email se necessário
4. Faça login e será redirecionado para /setup
5. Configure o nome da empresa
6. ✅ Pronto! Novo ambiente multi-tenant criado

---

## ✅ O QUE FOI IMPLEMENTADO

- [x] Autenticação com Supabase Auth
- [x] Multi-tenancy com RLS (Row Level Security)
- [x] Isolamento total de dados por tenant
- [x] Página de login (/login)
- [x] Página de cadastro (/cadastro)
- [x] Página de setup/onboarding (/setup)
- [x] Middleware para proteger rotas
- [x] Políticas RLS em todas as tabelas
- [x] Migração dos dados existentes para tenant principal
- [x] Criação de usuários de teste

---

## 🔒 SEGURANÇA

### Políticas RLS Ativas:
Todas as tabelas têm isolamento por tenant_id:
- `clientes`
- `produtos`
- `orcamentos`
- `itens_orcamento`
- `gastos_receitas`
- `empresa`
- `tecidos`
- `tecidos_base`
- `estampas`
- `configuracoes`

### Regra de Isolamento:
```sql
-- SELECT: Permite ver dados sem tenant (para compatibilidade) OU do próprio tenant
tenant_id IS NULL OR tenant_id = get_tenant_id()

-- INSERT/UPDATE/DELETE: Apenas do próprio tenant
tenant_id = get_tenant_id()
```

---

## 🧪 TESTE DE ISOLAMENTO

### Verificar que dados estão isolados:

1. **Login como adw733@gmail.com:**
   - Deve ver: 26 clientes, 32 produtos, 110 orçamentos

2. **Login como teste@exemplo.com:**
   - Fazer setup com nome "Teste XPTO"
   - Deve ver: 0 clientes, 0 produtos, 0 orçamentos
   - Criar 1 cliente de teste

3. **Voltar para adw733@gmail.com:**
   - NÃO deve ver o cliente criado pelo usuário teste
   - Ainda deve ver os 26 clientes originais

4. **Voltar para teste@exemplo.com:**
   - Deve ver apenas o 1 cliente que criou
   - NÃO deve ver os 26 clientes do usuário principal

---

## 🎯 PRÓXIMOS PASSOS

- [x] Adicionar botão de logout no header ✅
- [x] Mostrar nome da empresa logada no header ✅
- [x] Menu de usuário com dropdown ✅
- [ ] Testar isolamento completo (criar dados em ambos usuários)
- [ ] Deploy em produção (Vercel)
- [ ] Convidar primeiros 3 clientes

---

## 📝 NOTAS IMPORTANTES

- **Servidor local:** Porta 3002 (portas anteriores em uso)
- **Confirmação de email:** Habilitada (verificar no Supabase se precisa desabilitar)
- **Service Role Key:** Necessária no .env.local para criar tenants
- **Dados migrados:** Todos vinculados ao tenant 218cefab-7696-4a08-bc1e-d41f19e0aeb3

---

*Documento gerado automaticamente em 29/11/2025*

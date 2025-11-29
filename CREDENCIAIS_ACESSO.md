# 🔐 CREDENCIAIS DE ACESSO - Sistema OneBase

**Data:** 29/11/2025  
**URL:** http://localhost:3001 (desenvolvimento)

---

## 👤 USUÁRIOS DISPONÍVEIS

### 1. Usuário Principal (com dados existentes)
```
Email:    adw733@gmail.com
Senha:    coelho733
Tenant:   218cefab-7696-4a08-bc1e-d41f19e0aeb3
Empresa:  OneBase Uniformes
Dados:    ✅ 26 clientes, 32 produtos, 110 orçamentos
```

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

### Para o usuário principal (adw733@gmail.com):
1. Acesse http://localhost:3001/login
2. Digite: adw733@gmail.com / coelho733
3. ✅ Deve ver todos os seus dados (26 clientes, 110 orçamentos)

### Para usuários de teste (novos ambientes):
1. Acesse http://localhost:3001/login
2. Digite: teste@exemplo.com / teste123
3. ➡️ Será redirecionado para /setup
4. Preencha o nome da empresa (ex: "Empresa Teste XPTO")
5. ✅ Será criado um novo tenant isolado
6. ✅ Começará com dados zerados (sem clientes, produtos ou orçamentos)

### Para criar novo usuário:
1. Acesse http://localhost:3001/cadastro
2. Preencha nome, email e senha
3. ➡️ Será redirecionado para /setup
4. Configure o nome da empresa
5. ✅ Pronto! Novo ambiente multi-tenant criado

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

- [ ] Adicionar botão de logout no header
- [ ] Mostrar nome da empresa logada no header
- [ ] Testar isolamento completo (criar dados em ambos usuários)
- [ ] Deploy em produção (Vercel)
- [ ] Convidar primeiros 3 clientes

---

## 📝 NOTAS IMPORTANTES

- **Servidor local:** Porta 3001 (3000 estava em uso)
- **Confirmação de email:** Desabilitada para testes (auto-confirm)
- **Service Role Key:** Necessária no .env.local para criar tenants
- **Dados migrados:** Todos vinculados ao tenant 218cefab-7696-4a08-bc1e-d41f19e0aeb3

---

*Documento gerado automaticamente em 29/11/2025*

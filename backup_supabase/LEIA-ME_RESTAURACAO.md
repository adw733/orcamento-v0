# 🚨 GUIA DE EMERGÊNCIA - RESTAURAÇÃO TOTAL

Este documento explica como restaurar o sistema **Gerador de Orçamentos** em caso de perda total de dados.

---

## 📦 O QUE ESTÁ NESTE BACKUP?
Este backup é **3.0 (Completo)** e contém:
1.  **DADOS SQL (`schema/data_dump_cli.sql`)**: Todos os registros em formato SQL (54MB).
2.  **ESTRUTURA (`schema/schema_dump_cli.sql`)**: Tabelas, índices, RLS, triggers e funções.
3.  **JSON (`dados/`)**: Cópia de segurança de cada tabela em formato JSON.
4.  **USUÁRIOS (`auth/`)**: Lista de emails dos usuários cadastrados.
5.  **CONFIG (`config/`)**: Variáveis de ambiente necessárias para o `.env.local`.
6.  **IMAGENS (`public/`)**: Arquivos locais do projeto.

---

## 🛠️ PASSO A PASSO PARA RESTAURAR (RÁPIDO)

### 1. Preparar o Banco (Supabase)
Se o projeto no Supabase for novo:
- Acesse o **SQL Editor** no painel do Supabase.
- Abra o arquivo `schema/schema_dump_cli.sql` deste backup.
- Cole o conteúdo e clique em **RUN**. Isso criará todas as tabelas e regras.

### 2. Restaurar os Dados
No seu terminal local (onde o PostgreSQL/pg_dump está instalado):
```powershell
# Altere SENHA e REFERENCE_ID conforme seu projeto atual
$env:PGPASSWORD="SUA_SENHA_DO_BANCO"
psql -h db.REFERENCE_ID.supabase.co -p 5432 -U postgres -d postgres -f "schema/data_dump_cli.sql"
```

### 3. Restaurar Usuários
O Supabase não permite importar senhas. Para os usuários voltarem a acessar:
- Veja a lista em `auth/usuarios_auth.json`.
- Convide-os novamente pelo painel (**Authentication > Users > Invite**).
- Eles receberão um email para criar uma nova senha.

### 4. Configuração do Código
- Copie o arquivo `.env.example` para `.env.local`.
- Preencha com as novas chaves do Supabase (veja `config/env_vars_necessarias.txt`).
- Copie a pasta `public/` do backup para a raiz do seu projeto.
- Execute `npm install` e `npm run dev`.

---

## 💡 DICAS DE SEGURANÇA
- Mantenha sua **DB_PASSWORD** em um gerenciador de senhas.
- O script de backup (`npm run backup`) agora gera esses arquivos automaticamente toda vez que é executado.
- Recomenda-se rodar o backup pelo menos 1x por semana ou após grandes alterações.

---
*Backup gerado em: 18/02/2026*

# Sistema de Backup Completo - Supabase

Sistema completo de backup e restauração para o Supabase, incluindo dados, schema e arquivos de storage.

## 🎯 Funcionalidades

- ✅ **Backup de todas as tabelas** (dados em JSON)
- ✅ **Backup do schema SQL** (estrutura do banco)
- ✅ **Backup do Storage** (imagens e arquivos)
- ✅ **Restauração completa** de dados
- ✅ **Agendamento automático** de backups
- ✅ **Limpeza automática** de backups antigos
- ✅ **Detecção automática** de tabelas

## 📦 Instalação

As dependências necessárias já estão instaladas no projeto:
- `@supabase/supabase-js`
- Node.js 18+

## 🚀 Uso

### 1. Backup Manual Completo

Execute um backup completo imediatamente:

```bash
node scripts/backup-completo.js
```

**O que é incluído:**
- Todas as tabelas do banco (em JSON)
- Estrutura das colunas (schema)
- Todos os arquivos do Storage
- Metadata e estatísticas

**Resultado:**
```
backup_supabase/
  └── backup_10_01_26_1430/
      ├── dados/
      │   ├── clientes.json
      │   ├── orcamentos.json
      │   └── ... (todas as tabelas)
      ├── schema/
      │   └── estrutura.json
      ├── storage/
      │   └── orcamentos-imagens/
      │       └── ... (arquivos)
      ├── metadata.json
      └── README.md
```

### 2. Restaurar Backup

Listar backups disponíveis:

```bash
node scripts/restore-backup.js
```

Restaurar backup específico:

```bash
node scripts/restore-backup.js backup_10_01_26_1430
```

**Modos de restauração:**
1. **INSERT/UPDATE** - Mantém dados existentes, atualiza duplicados
2. **REPLACE** - Limpa tabelas antes de inserir (cuidado!)

### 3. Backup Automático Agendado

Executar backups automaticamente em intervalos definidos:

```bash
node scripts/backup-agendado.js
```

**Configuração padrão:**
- Intervalo: A cada 24 horas
- Mantém: Últimos 7 backups
- Execução inicial: Sim

Para alterar, edite o arquivo [backup-agendado.js](scripts/backup-agendado.js):

```javascript
const CONFIG = {
  intervalo_horas: 24,      // Intervalo entre backups
  max_backups: 7,           // Número de backups a manter
  executar_ao_iniciar: true // Executar imediatamente?
}
```

### 4. Agendamento com Windows Task Scheduler

Para executar automaticamente no Windows:

1. Abra o **Agendador de Tarefas** (Task Scheduler)
2. Criar Tarefa Básica:
   - Nome: "Backup Supabase Diário"
   - Gatilho: Diário às 03:00
   - Ação: Iniciar programa
     - Programa: `node`
     - Argumentos: `scripts/backup-completo.js`
     - Iniciar em: `E:\Google Drive\01 - Desenvolvimento\02 - Projetos\01 - Gerador de Orçamento\orcamento_rev2`

## ⚙️ Configuração

As variáveis de ambiente necessárias (já configuradas no `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui
```

## 📊 Estrutura do Backup

Cada backup contém:

### `dados/`
Arquivos JSON com dados de cada tabela:
- `clientes.json`
- `orcamentos.json`
- `itens_orcamento.json`
- etc...

### `schema/`
Estrutura do banco de dados:
- `estrutura.json` - Definição de colunas, tipos e constraints

### `storage/`
Arquivos organizados por bucket:
- `orcamentos-imagens/` - Imagens dos orçamentos

### `metadata.json`
Informações do backup:
```json
{
  "data_backup": "2026-01-10T14:30:00.000Z",
  "duracao_segundos": 45.2,
  "estatisticas": {
    "total_tabelas": 17,
    "total_registros": 1523
  }
}
```

## 🔧 Comandos Úteis

### Listar todos os backups
```bash
dir backup_supabase /ad /b
```

### Ver tamanho dos backups
```bash
Get-ChildItem "backup_supabase" -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    [PSCustomObject]@{
        Nome = $_.Name
        Tamanho = "$([math]::Round($size, 2)) MB"
    }
} | Format-Table
```

### Remover backups antigos manualmente
```bash
# Remover backups com mais de 30 dias
Get-ChildItem "backup_supabase" -Directory | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item -Recurse -Force
```

## 🎯 Casos de Uso

### Backup antes de deploy
```bash
node scripts/backup-completo.js
git add .
git commit -m "Deploy to production"
npx vercel --prod
```

### Backup e restauração em desenvolvimento
```bash
# Backup do ambiente de produção
node scripts/backup-completo.js

# Restaurar em ambiente de desenvolvimento
# (altere .env.local para o banco de desenvolvimento)
node scripts/restore-backup.js backup_10_01_26_1430
```

### Migração entre projetos
1. Fazer backup do projeto antigo
2. Copiar pasta `backup_supabase/`
3. Restaurar no novo projeto

## ⚠️ Observações Importantes

1. **Service Role Key**: O backup usa a service role key que tem acesso total ao banco. Mantenha-a segura!

2. **Storage Público**: O script baixa arquivos via URL pública. Se os buckets forem privados, será necessário ajustar o código.

3. **Limites**: Para bancos muito grandes (>100k registros por tabela), considere usar `pg_dump` diretamente.

4. **Storage**: Arquivos grandes podem demorar. Use uma conexão estável.

5. **RLS (Row Level Security)**: O backup usa a service role key que bypassa RLS. A restauração também.

## 🐛 Troubleshooting

### Erro: "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### Erro: "SUPABASE_SERVICE_ROLE_KEY not defined"
Verifique se o `.env.local` está configurado corretamente.

### Backup muito lento
- Reduza o número de tabelas em `backup-completo.js`
- Use conexão mais rápida
- Execute em horário de menor uso

### Storage não incluído
Verifique se os buckets são públicos ou ajuste o código para usar signed URLs.

## 🔄 Atualizações Futuras

Melhorias planejadas:
- [ ] Backup incremental (apenas alterações)
- [ ] Compressão de arquivos (.zip)
- [ ] Upload para cloud (S3, Google Drive)
- [ ] Notificações (email, Slack)
- [ ] Interface web para gerenciar backups
- [ ] Suporte a múltiplos schemas
- [ ] Backup de funções e triggers SQL

## 📝 Licença

Parte do projeto Gerador de Orçamento.

---

**Última atualização:** 10/01/2026

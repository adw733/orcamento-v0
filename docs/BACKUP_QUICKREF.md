# ⚡ Backup Quick Reference

## Comandos Principais

```bash
npm run backup           # Backup completo
npm run restore          # Restaurar backup
npm run backup:watch     # Agendador automático
```

## PowerShell

```powershell
.\backup.ps1            # Menu interativo
.\backup.ps1 -List      # Listar backups
.\backup.ps1 -Restore   # Restaurar
.\backup.ps1 -Watch     # Agendador
```

## Estrutura

```
backup_supabase/
└── backup_DD_MM_YY_HHMM/
    ├── dados/           ← Tabelas (JSON)
    ├── schema/          ← Estrutura
    ├── storage/         ← Arquivos
    └── metadata.json    ← Info
```

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| [backup-completo.js](../scripts/backup-completo.js) | Script principal de backup |
| [restore-backup.js](../scripts/restore-backup.js) | Script de restauração |
| [backup-agendado.js](../scripts/backup-agendado.js) | Agendador automático |
| [backup-config.js](../scripts/backup-config.js) | Configurações |
| [load-env.js](../scripts/load-env.js) | Carregador de .env |
| [backup.ps1](../backup.ps1) | Interface PowerShell |

## Documentação

- [SISTEMA_BACKUP.md](SISTEMA_BACKUP.md) - Documentação completa
- [BACKUP_STATUS.md](BACKUP_STATUS.md) - Status da implementação

## Primeiro Backup

✅ Executado com sucesso em 10/01/2026 15:38
- 1.672 registros
- 14 tabelas
- 14.48s

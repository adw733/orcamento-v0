# Sistema de Backup - Supabase
# Uso: .\backup.ps1 [-List] [-Restore] [-Watch] [-BackupName "nome"]

param(
    [switch]$Restore,
    [switch]$Watch,
    [switch]$List,
    [string]$BackupName
)

$ProjectRoot = $PSScriptRoot

function Show-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     SISTEMA DE BACKUP - SUPABASE            ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function ListBackups {
    Show-Banner
    Write-Host "📂 Backups disponíveis:" -ForegroundColor Cyan
    Write-Host ""
    
    $backupDir = Join-Path $ProjectRoot "backup_supabase"
    
    if (-not (Test-Path $backupDir)) {
        Write-Host "⚠️  Nenhum backup encontrado!" -ForegroundColor Yellow
        return
    }
    
    $backups = Get-ChildItem $backupDir -Directory | 
        Where-Object { $_.Name -like "backup_*" } |
        Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "⚠️  Nenhum backup encontrado!" -ForegroundColor Yellow
        return
    }
    
    $index = 1
    foreach ($backup in $backups) {
        $metaPath = Join-Path $backup.FullName "metadata.json"
        
        Write-Host "  $index. " -NoNewline -ForegroundColor Yellow
        Write-Host $backup.Name
        
        if (Test-Path $metaPath) {
            $meta = Get-Content $metaPath | ConvertFrom-Json
            Write-Host "     📅 Data: " -NoNewline -ForegroundColor Gray
            Write-Host ([DateTime]$meta.data_backup).ToString("dd/MM/yyyy HH:mm:ss")
            Write-Host "     📊 Registros: " -NoNewline -ForegroundColor Gray
            Write-Host $meta.estatisticas.total_registros
        }
        
        $size = (Get-ChildItem $backup.FullName -Recurse -File | 
                 Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "     💾 Tamanho: " -NoNewline -ForegroundColor Gray
        Write-Host "$([math]::Round($size, 2)) MB"
        Write-Host ""
        
        $index++
    }
}

function RunBackup {
    Show-Banner
    Write-Host "🚀 Iniciando backup completo..." -ForegroundColor Cyan
    Write-Host ""
    
    Push-Location $ProjectRoot
    
    try {
        node scripts/backup-completo.js
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Backup concluído com sucesso!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Backup falhou!" -ForegroundColor Red
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

function RunRestore {
    Show-Banner
    
    if ($BackupName) {
        Write-Host "🔄 Restaurando backup: $BackupName" -ForegroundColor Cyan
        Write-Host ""
        
        Push-Location $ProjectRoot
        try {
            node scripts/restore-backup.js $BackupName
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "🔄 Iniciando processo de restauração..." -ForegroundColor Cyan
        Write-Host ""
        
        Push-Location $ProjectRoot
        try {
            node scripts/restore-backup.js
        }
        finally {
            Pop-Location
        }
    }
}

function RunWatch {
    Show-Banner
    Write-Host "⏰ Iniciando agendador de backups..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $ProjectRoot
    try {
        node scripts/backup-agendado.js
    }
    finally {
        Pop-Location
    }
}

# Verificar Node.js
try {
    $null = Get-Command node -ErrorAction Stop
}
catch {
    Write-Host "❌ Node.js não encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Executar ação
if ($List) {
    ListBackups
}
elseif ($Restore) {
    RunRestore
}
elseif ($Watch) {
    RunWatch
}
else {
    # Padrão: executar backup
    RunBackup
}

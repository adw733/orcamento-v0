@echo off
title Deploy Rapido - Vercel
color 0E

echo.
echo 🚀 DEPLOY RAPIDO - VERCEL
echo ==========================
echo.

cd /d "%~dp0"

REM Verificar se Vercel CLI está instalado
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI nao encontrado!
    echo.
    echo 📦 Instalando Vercel CLI...
    npm install -g vercel
    
    if errorlevel 1 (
        echo ❌ Erro ao instalar Vercel CLI!
        echo.
        echo 💡 Tente instalar manualmente: npm install -g vercel
        pause
        exit /b 1
    )
)

echo ✅ Vercel CLI encontrado!
echo.

echo 🔍 DEPLOY DE PREVIEW (recomendado para testes)
echo 🌐 DEPLOY DE PRODUCAO (site principal)
echo.

set /p choice="Digite P para Preview ou R para Producao: "

if /i "%choice%"=="P" (
    echo.
    echo 🔍 Iniciando deploy de PREVIEW...
    echo.
    vercel
) else if /i "%choice%"=="R" (
    echo.
    echo ⚠️  ATENÇÃO: Deploy de PRODUÇÃO!
    echo.
    set /p confirm="Tem certeza? (S/N): "
    
    if /i "!confirm!"=="S" (
        echo.
        echo 🌐 Iniciando deploy de PRODUÇÃO...
        echo.
        vercel --prod
    ) else (
        echo.
        echo ❌ Deploy cancelado.
    )
) else (
    echo.
    echo ❌ Opção inválida. Use P para Preview ou R para Produção.
)

echo.
echo 📋 Deploy concluído!
pause

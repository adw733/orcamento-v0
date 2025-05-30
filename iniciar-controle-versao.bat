@echo off
title Sistema de Controle de Versoes - Orcamento Rev1
color 0A

echo.
echo 🚀 Sistema de Controle de Versoes - Orcamento Rev1
echo ================================================
echo.
echo 1. Sistema Completo de Controle de Versoes
echo 2. Deploy Rapido na Vercel
echo 3. Iniciar Servidor de Desenvolvimento
echo.
set /p option="Escolha uma opcao (1-3): "

if "%option%"=="1" goto sistema_completo
if "%option%"=="2" goto deploy_vercel
if "%option%"=="3" goto dev_server

echo ❌ Opcao invalida!
pause
exit /b 1

:sistema_completo
REM Verificar se o Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python nao encontrado! Instale o Python primeiro.
    echo.
    echo 📥 Download: https://python.org/downloads
    pause
    exit /b 1
)

REM Mudar para o diretório do projeto
cd /d "%~dp0"

REM Verificar se os arquivos existem
if not exist "sistema-versao\main.py" (
    echo ❌ Arquivos do sistema nao encontrados!
    pause
    exit /b 1
)

echo ✅ Python encontrado!
echo 📁 Diretorio do projeto: %CD%
echo.

REM Iniciar o sistema
echo 🚀 Iniciando Sistema de Controle de Versoes...
echo.

python sistema-versao\main.py

if errorlevel 1 (
    echo.
    echo ❌ Erro ao executar o sistema!
    echo.
    pause
)
goto end

:deploy_vercel
echo.
echo 🚀 Iniciando Deploy na Vercel...
echo.
call deploy-vercel.bat
goto end

:dev_server
echo.
echo 🚀 Iniciando Servidor de Desenvolvimento...
echo.

REM Verificar package managers disponíveis
npm --version >nul 2>&1
if not errorlevel 1 (
    echo ✅ Usando NPM...
    npm run dev
    goto end
)

pnpm --version >nul 2>&1
if not errorlevel 1 (
    echo ✅ Usando PNPM...
    pnpm dev
    goto end
)

yarn --version >nul 2>&1
if not errorlevel 1 (
    echo ✅ Usando Yarn...
    yarn dev
    goto end
)

echo ❌ Nenhum gerenciador de pacotes encontrado (npm, pnpm, yarn)!
pause

:end

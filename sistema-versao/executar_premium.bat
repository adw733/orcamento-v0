@echo off
title Sistema de Controle de Versoes Premium
cd /d "%~dp0"

echo 🚀 Sistema de Controle de Versoes Premium v2.0
echo ============================================
echo.

REM Verificar se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python nao encontrado!
    echo 📥 Instale Python em: https://python.org
    pause
    exit /b 1
)

REM Verificar se CustomTkinter esta instalado
python -c "import customtkinter" >nul 2>&1
if errorlevel 1 (
    echo ⚠️ CustomTkinter nao encontrado!
    echo 📦 Executando instalacao automatica...
    echo.
    call instalar_premium.bat
    echo.
)

echo 🚀 Iniciando Sistema Premium...
python gerenciador_versao_premium.py

if errorlevel 1 (
    echo.
    echo ❌ Erro ao executar o sistema!
    echo 🔧 Verifique as dependencias executando: instalar_premium.bat
    pause
)
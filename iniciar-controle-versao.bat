@echo off
title Sistema de Controle de Versoes - Orcamento Rev1
color 0A

echo.
echo 🚀 Sistema de Controle de Versoes - Orcamento Rev1
echo ================================================
echo.

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

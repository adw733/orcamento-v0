@echo off
title Acesso Rapido - Orcamento Rev1
color 0B

echo.
echo ⚡ ACESSO RAPIDO - ORCAMENTO REV1
echo =================================
echo.

cd /d "%~dp0"

echo 🚀 Iniciando sistema completo...
python sistema-versao\main.py

if errorlevel 1 (
    echo.
    echo ❌ Erro! Tentando script alternativo...
    call iniciar-controle-versao.bat
)

pause

@echo off
echo ===================================
echo TESTE DE CONEXAO SUPABASE
echo ===================================
echo.

echo Carregando variaveis de ambiente...
if not exist .env.local (
    echo ERRO: Arquivo .env.local nao encontrado!
    echo Certifique-se de que o arquivo existe com as variaveis do Supabase.
    pause
    exit /b 1
)

echo Executando teste de conexao...
echo.

node scripts/criar-tabela-teste.js

echo.
echo ===================================
echo TESTE CONCLUIDO
echo ===================================
pause

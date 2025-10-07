@echo off
echo 🚀 Criando tabela movimentacoes_financeiras no Supabase...
echo.
echo ⚠️  IMPORTANTE: Você precisa ter o PostgreSQL (psql) instalado
echo.
echo 📋 Instruções:
echo 1. Instale o PostgreSQL se não tiver: https://www.postgresql.org/download/
echo 2. Execute este comando no terminal:
echo.
echo psql "postgresql://postgres:[SUA_SENHA]@db.fpejkwmapomxfyxmxqrd.supabase.co:5432/postgres" -f scripts/create-movimentacoes-financeiras.sql
echo.
echo 🔑 Substitua [SUA_SENHA] pela senha do seu projeto Supabase
echo 📁 A senha pode ser encontrada em: Settings > Database > Connection string
echo.
pause
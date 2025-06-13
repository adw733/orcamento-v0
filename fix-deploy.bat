@echo off
echo 🔧 Corrigindo lockfiles para deploy...

cd /d "%~dp0"

echo ❌ Removendo package-lock.json (conflito com pnpm)...
if exist package-lock.json del package-lock.json

echo ❌ Removendo pnpm-lock.yaml desatualizado...
if exist pnpm-lock.yaml del pnpm-lock.yaml

echo 📦 Reinstalando dependências com pnpm...
pnpm install

echo ✅ Lockfiles corrigidos! Agora você pode fazer deploy.
echo 💡 Use 'git add . && git commit -m "fix: sync lockfiles" && git push' para enviar as correções

pause

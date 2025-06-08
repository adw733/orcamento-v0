@echo off
echo 🚀 Sistema de Controle de Versoes Premium - Instalacao
echo =====================================================
echo.

echo 📦 Instalando dependencias Python...
pip install -r requirements.txt

echo.
echo 🔍 Verificando instalacao...
python -c "import customtkinter; print('✅ CustomTkinter instalado')"
python -c "import psutil; print('✅ psutil instalado')"
python -c "import PIL; print('✅ Pillow instalado')"
python -c "import qrcode; print('✅ qrcode instalado')"

echo.
echo ✅ Instalacao concluida!
echo 🚀 Execute: python gerenciador_versao_premium.py
echo.
pause
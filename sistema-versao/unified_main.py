#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Principal - Sistema Unificado
Executa o sistema completo de controle de versões + deploy
"""

import os
import sys

# Adicionar diretório atual ao path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Função principal
def main():
    """Executa o sistema unificado"""
    print("🚀 Iniciando Sistema Unificado...")
    
    try:
        # Executar o sistema original melhorado
        from version_control_app import main as run_original
        run_original()
        
    except ImportError as e:
        print(f"❌ Erro ao importar: {e}")
        print("Verifique se todos os arquivos estão presentes.")
        input("Pressione Enter para sair...")
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        input("Pressione Enter para sair...")

if __name__ == "__main__":
    main()

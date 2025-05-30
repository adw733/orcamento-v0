#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inicializador do Sistema de Controle de Versões
Script principal para iniciar o aplicativo
"""

import sys
import os

# Adicionar o diretório do sistema de versão ao path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Importar e executar a aplicação
from version_control_app import main

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Controle de Versões Premium - Orçamento v2.0
Versão totalmente redesenhada com interface moderna e terminal integrado
Inclui funcionalidades avançadas para Git, deploy e Claude Code
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, filedialog
import customtkinter as ctk
import subprocess
import os
import json
import datetime
import threading
import webbrowser
import time
import re
import sys
from pathlib import Path
import psutil
import platform

# Configurações do CustomTkinter
ctk.set_appearance_mode("dark")  # "dark" ou "light"
ctk.set_default_color_theme("blue")  # "blue", "green", "dark-blue"

class ModernVersionControlGUI:
    def __init__(self):
        # Configuração da janela principal
        self.root = ctk.CTk()
        self.root.title("🚀 Sistema de Controle de Versões Premium - Orçamento v2.0")
        self.root.geometry("1400x900")
        self.root.minsize(1200, 800)
        
        # Configurar ícone e estilo
        self.setup_window_style()
        
        # Detectar caminho do projeto e configurações
        self.project_path = os.path.dirname(os.path.dirname(__file__))
        self.config_file = os.path.join(self.project_path, '.version_manager_config.json')
        self.load_config()
        
        # Variáveis de controle
        self.setup_variables()
        
        # Processo do terminal
        self.terminal_process = None
        
        # Setup da interface
        self.setup_interface()
        
        # Carregar dados iniciais
        self.root.after(100, self.refresh_all_data)
        
        # Configurar cleanup ao fechar
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def setup_window_style(self):
        """Configura estilo e aparência da janela"""
        try:
            # Tentar configurar ícone (se disponível)
            icon_path = os.path.join(self.project_path, "public", "placeholder-logo.png")
            if os.path.exists(icon_path):
                self.root.iconphoto(True, tk.PhotoImage(file=icon_path))
        except:
            pass

    def setup_variables(self):
        """Inicializa variáveis de controle"""
        self.current_branch = tk.StringVar()
        self.git_status = tk.StringVar()
        self.project_stats = {
            'commits': 0,
            'branches': 0,
            'files_modified': 0,
            'last_commit': 'N/A'
        }
        
        # Dados para tabelas
        self.versions_data = []
        self.branches_data = []
        self.terminal_history = []
        
        # Variáveis para ordenação das tabelas
        self.versions_sort_column = None
        self.versions_sort_reverse = False
        self.branches_sort_column = None
        self.branches_sort_reverse = False

    def load_config(self):
        """Carrega configurações salvas"""
        self.config = {
            'theme': 'dark',
            'terminal_shell': 'wsl',
            'auto_refresh': True,
            'notifications': True,
            'claude_path': 'claude-code',
            'git_user_name': 'Usuario',
            'git_user_email': 'usuario@local.com'
        }
        
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    saved_config = json.load(f)
                    self.config.update(saved_config)
        except Exception as e:
            print(f"Erro ao carregar configurações: {e}")

    def save_config(self):
        """Salva configurações"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Erro ao salvar configurações: {e}")

    def setup_interface(self):
        """Cria a interface principal"""
        # Container principal
        self.main_container = ctk.CTkFrame(self.root)
        self.main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Cabeçalho
        self.create_header()
        
        # Notebook com abas
        self.create_tabview()
        
        # Status bar
        self.create_status_bar()

    def create_header(self):
        """Cria cabeçalho da aplicação"""
        header_frame = ctk.CTkFrame(self.main_container)
        header_frame.pack(fill="x", pady=(0, 10))
        
        # Título e informações
        title_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_frame.pack(side="left", fill="x", expand=True, padx=20, pady=15)
        
        title_label = ctk.CTkLabel(
            title_frame, 
            text="🚀 Sistema de Controle de Versões Premium",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title_label.pack(anchor="w")
        
        # Informações do projeto
        info_frame = ctk.CTkFrame(title_frame, fg_color="transparent")
        info_frame.pack(fill="x", pady=(5, 0))
        
        self.project_info_label = ctk.CTkLabel(
            info_frame,
            text=f"📁 {os.path.basename(self.project_path)}",
            font=ctk.CTkFont(size=14)
        )
        self.project_info_label.pack(side="left")
        
        self.branch_info_label = ctk.CTkLabel(
            info_frame,
            text="🌟 Carregando...",
            font=ctk.CTkFont(size=14)
        )
        self.branch_info_label.pack(side="left", padx=(20, 0))
        
        # Botões de ação rápida
        actions_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        actions_frame.pack(side="right", padx=20, pady=15)
        
        refresh_btn = ctk.CTkButton(
            actions_frame,
            text="🔄 Atualizar",
            command=self.refresh_all_data,
            width=100
        )
        refresh_btn.pack(side="right", padx=(5, 0))
        
        settings_btn = ctk.CTkButton(
            actions_frame,
            text="⚙️ Config",
            command=self.open_settings,
            width=100
        )
        settings_btn.pack(side="right", padx=(5, 0))

    def create_tabview(self):
        """Cria o sistema de abas"""
        self.tabview = ctk.CTkTabview(self.main_container)
        self.tabview.pack(fill="both", expand=True)
        
        # Aba Dashboard
        self.tab_dashboard = self.tabview.add("📊 Dashboard")
        self.setup_dashboard_tab()
        
        # Aba Git & Versões
        self.tab_git = self.tabview.add("📦 Git & Versões")
        self.setup_git_tab()
        
        # Aba Terminal
        self.tab_terminal = self.tabview.add("💻 Terminal")
        self.setup_terminal_tab()
        
        # Aba Deploy
        self.tab_deploy = self.tabview.add("🚀 Deploy")
        self.setup_deploy_tab()
        
        # Aba Ferramentas
        self.tab_tools = self.tabview.add("🛠️ Ferramentas")
        self.setup_tools_tab()

    def setup_dashboard_tab(self):
        """Configura aba do dashboard"""
        # Container principal do dashboard
        dashboard_container = ctk.CTkScrollableFrame(self.tab_dashboard)
        dashboard_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Estatísticas rápidas
        stats_frame = ctk.CTkFrame(dashboard_container)
        stats_frame.pack(fill="x", pady=(0, 20))
        
        stats_title = ctk.CTkLabel(
            stats_frame,
            text="📈 Estatísticas do Projeto",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        stats_title.pack(pady=(20, 10))
        
        # Grid de estatísticas
        stats_grid = ctk.CTkFrame(stats_frame)
        stats_grid.pack(fill="x", padx=20, pady=(0, 20))
        
        # Cards de estatísticas
        self.create_stat_cards(stats_grid)
        
        # Gráfico de atividade (simulado)
        activity_frame = ctk.CTkFrame(dashboard_container)
        activity_frame.pack(fill="x", pady=(0, 20))
        
        activity_title = ctk.CTkLabel(
            activity_frame,
            text="📅 Atividade Recente",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        activity_title.pack(pady=(20, 10))
        
        # Lista de atividades
        self.activity_text = ctk.CTkTextbox(activity_frame, height=200)
        self.activity_text.pack(fill="x", padx=20, pady=(0, 20))
        
        # Status do sistema
        system_frame = ctk.CTkFrame(dashboard_container)
        system_frame.pack(fill="x")
        
        system_title = ctk.CTkLabel(
            system_frame,
            text="💻 Status do Sistema",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        system_title.pack(pady=(20, 10))
        
        self.system_info_text = ctk.CTkTextbox(system_frame, height=150)
        self.system_info_text.pack(fill="x", padx=20, pady=(0, 20))

    def create_stat_cards(self, parent):
        """Cria cards de estatísticas"""
        # Frame para os cards
        cards_frame = ctk.CTkFrame(parent, fg_color="transparent")
        cards_frame.pack(fill="x", padx=20, pady=10)
        
        # Configurar grid
        cards_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)
        
        # Card 1: Commits
        commits_card = ctk.CTkFrame(cards_frame)
        commits_card.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        
        ctk.CTkLabel(commits_card, text="📝", font=ctk.CTkFont(size=30)).pack(pady=(10, 5))
        self.commits_label = ctk.CTkLabel(commits_card, text="0", font=ctk.CTkFont(size=24, weight="bold"))
        self.commits_label.pack()
        ctk.CTkLabel(commits_card, text="Commits", font=ctk.CTkFont(size=12)).pack(pady=(0, 10))
        
        # Card 2: Branches
        branches_card = ctk.CTkFrame(cards_frame)
        branches_card.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        
        ctk.CTkLabel(branches_card, text="🌿", font=ctk.CTkFont(size=30)).pack(pady=(10, 5))
        self.branches_label = ctk.CTkLabel(branches_card, text="0", font=ctk.CTkFont(size=24, weight="bold"))
        self.branches_label.pack()
        ctk.CTkLabel(branches_card, text="Branches", font=ctk.CTkFont(size=12)).pack(pady=(0, 10))
        
        # Card 3: Arquivos modificados
        files_card = ctk.CTkFrame(cards_frame)
        files_card.grid(row=0, column=2, padx=10, pady=10, sticky="ew")
        
        ctk.CTkLabel(files_card, text="📄", font=ctk.CTkFont(size=30)).pack(pady=(10, 5))
        self.files_label = ctk.CTkLabel(files_card, text="0", font=ctk.CTkFont(size=24, weight="bold"))
        self.files_label.pack()
        ctk.CTkLabel(files_card, text="Modificados", font=ctk.CTkFont(size=12)).pack(pady=(0, 10))
        
        # Card 4: Status
        status_card = ctk.CTkFrame(cards_frame)
        status_card.grid(row=0, column=3, padx=10, pady=10, sticky="ew")
        
        ctk.CTkLabel(status_card, text="🔍", font=ctk.CTkFont(size=30)).pack(pady=(10, 5))
        self.status_label = ctk.CTkLabel(status_card, text="OK", font=ctk.CTkFont(size=24, weight="bold"))
        self.status_label.pack()
        ctk.CTkLabel(status_card, text="Status", font=ctk.CTkFont(size=12)).pack(pady=(0, 10))

    def setup_git_tab(self):
        """Configura aba de Git e versões"""
        # Container principal
        git_container = ctk.CTkFrame(self.tab_git)
        git_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Divisão em duas colunas
        left_frame = ctk.CTkFrame(git_container)
        left_frame.pack(side="left", fill="both", expand=True, padx=(0, 5))
        
        right_frame = ctk.CTkFrame(git_container)
        right_frame.pack(side="right", fill="both", expand=True, padx=(5, 0))
        
        # Coluna esquerda: Controle de versões
        self.setup_version_control(left_frame)
        
        # Coluna direita: Branches e ações
        self.setup_branch_management(right_frame)

    def setup_version_control(self, parent):
        """Configura controle de versões"""
        # Título
        title = ctk.CTkLabel(
            parent,
            text="📦 Controle de Versões",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        title.pack(pady=(10, 20))
        
        # Status atual
        status_frame = ctk.CTkFrame(parent)
        status_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        ctk.CTkLabel(
            status_frame,
            text="📋 Status Atual",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))
        
        self.git_status_text = ctk.CTkTextbox(status_frame, height=100)
        self.git_status_text.pack(fill="x", padx=10, pady=(0, 10))
        
        # Nova versão
        new_version_frame = ctk.CTkFrame(parent)
        new_version_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        ctk.CTkLabel(
            new_version_frame,
            text="💾 Nova Versão",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))
        
        self.commit_message_entry = ctk.CTkEntry(
            new_version_frame,
            placeholder_text="Descrição das mudanças..."
        )
        self.commit_message_entry.pack(fill="x", padx=10, pady=5)
        
        commit_btn = ctk.CTkButton(
            new_version_frame,
            text="💾 Salvar Versão",
            command=self.commit_changes
        )
        commit_btn.pack(pady=(5, 10))
        
        # Histórico de versões
        history_frame = ctk.CTkFrame(parent)
        history_frame.pack(fill="both", expand=True, padx=10)
        
        ctk.CTkLabel(
            history_frame,
            text="📚 Histórico",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))
        
        # Criar frame para Treeview (usa tkinter tradicional)
        tree_frame = tk.Frame(history_frame, bg='#2b2b2b')
        tree_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        
        # Treeview para versões
        self.versions_tree = ttk.Treeview(
            tree_frame,
            columns=('hash', 'date', 'message'),
            show='headings',
            height=10
        )
        
        # Configurar colunas com ordenação
        self.versions_tree.heading('hash', text='Hash ↕️', command=lambda: self.sort_versions('hash'))
        self.versions_tree.heading('date', text='Data ↕️', command=lambda: self.sort_versions('date'))
        self.versions_tree.heading('message', text='Mensagem ↕️', command=lambda: self.sort_versions('message'))
        
        self.versions_tree.column('hash', width=80)
        self.versions_tree.column('date', width=120)
        self.versions_tree.column('message', width=200)
        
        # Scrollbar para o Treeview
        scrollbar_versions = ttk.Scrollbar(tree_frame, orient="vertical", command=self.versions_tree.yview)
        self.versions_tree.configure(yscrollcommand=scrollbar_versions.set)
        
        self.versions_tree.pack(side="left", fill="both", expand=True)
        scrollbar_versions.pack(side="right", fill="y")
        
        # Bind para duplo clique e menu de contexto
        self.versions_tree.bind('<Double-1>', self.on_version_double_click)
        self.versions_tree.bind('<Button-3>', self.show_version_context_menu)  # Botão direito

    def setup_branch_management(self, parent):
        """Configura gerenciamento de branches"""
        # Título
        title = ctk.CTkLabel(
            parent,
            text="🌿 Gerenciamento de Branches",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        title.pack(pady=(10, 20))
        
        # Actions frame
        actions_frame = ctk.CTkFrame(parent)
        actions_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        ctk.CTkLabel(
            actions_frame,
            text="⚡ Ações Rápidas",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))
        
        # Botões de ação em grid
        buttons_frame = ctk.CTkFrame(actions_frame, fg_color="transparent")
        buttons_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        # Configurar grid
        buttons_frame.grid_columnconfigure((0, 1), weight=1)
        
        new_branch_btn = ctk.CTkButton(
            buttons_frame,
            text="🌱 Nova Branch",
            command=self.create_new_branch
        )
        new_branch_btn.grid(row=0, column=0, padx=5, pady=5, sticky="ew")
        
        stash_btn = ctk.CTkButton(
            buttons_frame,
            text="📦 Stash",
            command=self.manage_stash
        )
        stash_btn.grid(row=0, column=1, padx=5, pady=5, sticky="ew")
        
        pull_btn = ctk.CTkButton(
            buttons_frame,
            text="⬇️ Pull",
            command=self.git_pull
        )
        pull_btn.grid(row=1, column=0, padx=5, pady=5, sticky="ew")
        
        push_btn = ctk.CTkButton(
            buttons_frame,
            text="⬆️ Push",
            command=self.git_push
        )
        push_btn.grid(row=1, column=1, padx=5, pady=5, sticky="ew")
        
        # Lista de branches
        branches_frame = ctk.CTkFrame(parent)
        branches_frame.pack(fill="both", expand=True, padx=10)
        
        ctk.CTkLabel(
            branches_frame,
            text="🌿 Branches",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))
        
        # Frame para Treeview de branches
        branches_tree_frame = tk.Frame(branches_frame, bg='#2b2b2b')
        branches_tree_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        
        # Treeview para branches
        self.branches_tree = ttk.Treeview(
            branches_tree_frame,
            columns=('status', 'name', 'last_commit'),
            show='headings',
            height=8
        )
        
        # Configurar colunas com ordenação
        self.branches_tree.heading('status', text='Status ↕️', command=lambda: self.sort_branches('status'))
        self.branches_tree.heading('name', text='Nome ↕️', command=lambda: self.sort_branches('name'))
        self.branches_tree.heading('last_commit', text='Último Commit ↕️', command=lambda: self.sort_branches('last_commit'))
        
        self.branches_tree.column('status', width=80)
        self.branches_tree.column('name', width=150)
        self.branches_tree.column('last_commit', width=150)
        
        # Scrollbar para branches
        scrollbar_branches = ttk.Scrollbar(branches_tree_frame, orient="vertical", command=self.branches_tree.yview)
        self.branches_tree.configure(yscrollcommand=scrollbar_branches.set)
        
        self.branches_tree.pack(side="left", fill="both", expand=True)
        scrollbar_branches.pack(side="right", fill="y")
        
        # Bind para duplo clique e menu de contexto
        self.branches_tree.bind('<Double-1>', self.on_branch_double_click)
        self.branches_tree.bind('<Button-3>', self.show_branch_context_menu)  # Botão direito

    def setup_terminal_tab(self):
        """Configura aba do terminal"""
        # Container principal
        terminal_container = ctk.CTkFrame(self.tab_terminal)
        terminal_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Barra de ferramentas do terminal
        toolbar_frame = ctk.CTkFrame(terminal_container)
        toolbar_frame.pack(fill="x", pady=(0, 10))
        
        # Título
        title = ctk.CTkLabel(
            toolbar_frame,
            text="💻 Terminal Integrado",
            font=ctk.CTkFont(size=18, weight="bold")
        )
        title.pack(side="left", padx=20, pady=15)
        
        # Botões de controle
        controls_frame = ctk.CTkFrame(toolbar_frame, fg_color="transparent")
        controls_frame.pack(side="right", padx=20, pady=15)
        
        # Dropdown para seleção de shell
        self.shell_var = ctk.StringVar(value=self.config.get('terminal_shell', 'wsl'))
        shell_menu = ctk.CTkOptionMenu(
            controls_frame,
            values=["wsl", "cmd", "powershell", "git-bash"],
            variable=self.shell_var
        )
        shell_menu.pack(side="left", padx=(0, 10))
        
        # Botões de controle
        new_terminal_btn = ctk.CTkButton(
            controls_frame,
            text="🆕 Novo Terminal",
            command=self.open_new_terminal,
            width=120
        )
        new_terminal_btn.pack(side="left", padx=(0, 5))
        
        claude_btn = ctk.CTkButton(
            controls_frame,
            text="🤖 Claude Code",
            command=self.launch_claude_code,
            width=120
        )
        claude_btn.pack(side="left", padx=(0, 5))
        
        clear_btn = ctk.CTkButton(
            controls_frame,
            text="🧹 Limpar",
            command=self.clear_terminal,
            width=100
        )
        clear_btn.pack(side="left")
        
        # Área do terminal
        terminal_area = ctk.CTkFrame(terminal_container)
        terminal_area.pack(fill="both", expand=True)
        
        # Terminal output
        self.terminal_output = ctk.CTkTextbox(
            terminal_area,
            font=ctk.CTkFont(family="Courier New", size=12)
        )
        self.terminal_output.pack(fill="both", expand=True, padx=10, pady=(10, 5))
        
        # Input de comando
        input_frame = ctk.CTkFrame(terminal_area, fg_color="transparent")
        input_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        # Prompt label
        prompt_label = ctk.CTkLabel(
            input_frame,
            text="$",
            font=ctk.CTkFont(family="Courier New", size=12, weight="bold")
        )
        prompt_label.pack(side="left", padx=(0, 5))
        
        # Entry de comando
        self.command_entry = ctk.CTkEntry(
            input_frame,
            placeholder_text="Digite um comando...",
            font=ctk.CTkFont(family="Courier New", size=12)
        )
        self.command_entry.pack(side="left", fill="x", expand=True, padx=(0, 5))
        self.command_entry.bind('<Return>', self.execute_command)
        
        # Botão executar
        execute_btn = ctk.CTkButton(
            input_frame,
            text="▶️",
            command=self.execute_command,
            width=40
        )
        execute_btn.pack(side="right")
        
        # Histórico de comandos
        history_frame = ctk.CTkFrame(terminal_container)
        history_frame.pack(fill="x", pady=(10, 0))
        
        ctk.CTkLabel(
            history_frame,
            text="📋 Comandos Frequentes",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(side="left", padx=20, pady=10)
        
        # Botões de comandos frequentes
        frequent_frame = ctk.CTkFrame(history_frame, fg_color="transparent")
        frequent_frame.pack(side="right", padx=20, pady=10)
        
        frequent_commands = [
            ("git status", "📊"),
            ("npm run dev", "🚀"),
            ("git log --oneline -10", "📚"),
            ("ls -la", "📁")
        ]
        
        for cmd, icon in frequent_commands:
            btn = ctk.CTkButton(
                frequent_frame,
                text=f"{icon} {cmd.split()[0]}",
                command=lambda c=cmd: self.quick_command(c),
                width=100
            )
            btn.pack(side="left", padx=2)

    def setup_deploy_tab(self):
        """Configura aba de deploy"""
        # Container principal
        deploy_container = ctk.CTkScrollableFrame(self.tab_deploy)
        deploy_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Título
        title = ctk.CTkLabel(
            deploy_container,
            text="🚀 Deploy e Publicação",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.pack(pady=(10, 30))
        
        # Seção Vercel
        self.setup_vercel_section(deploy_container)
        
        # Seção Build e Test
        self.setup_build_section(deploy_container)
        
        # Seção de Logs
        self.setup_logs_section(deploy_container)

    def setup_vercel_section(self, parent):
        """Configura seção Vercel"""
        vercel_frame = ctk.CTkFrame(parent)
        vercel_frame.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(
            vercel_frame,
            text="🌐 Vercel Deploy",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(pady=(20, 10))
        
        # Status do login
        status_frame = ctk.CTkFrame(vercel_frame)
        status_frame.pack(fill="x", padx=20, pady=(0, 10))
        
        self.vercel_status_label = ctk.CTkLabel(
            status_frame,
            text="🔍 Verificando status...",
            font=ctk.CTkFont(size=14)
        )
        self.vercel_status_label.pack(pady=10)
        
        # Botões de ação
        vercel_actions = ctk.CTkFrame(vercel_frame, fg_color="transparent")
        vercel_actions.pack(fill="x", padx=20, pady=(0, 20))
        
        # Grid de botões
        vercel_actions.grid_columnconfigure((0, 1, 2, 3), weight=1)
        
        login_btn = ctk.CTkButton(
            vercel_actions,
            text="🔑 Login",
            command=self.vercel_login
        )
        login_btn.grid(row=0, column=0, padx=5, pady=5, sticky="ew")
        
        preview_btn = ctk.CTkButton(
            vercel_actions,
            text="👀 Preview",
            command=self.deploy_preview
        )
        preview_btn.grid(row=0, column=1, padx=5, pady=5, sticky="ew")
        
        prod_btn = ctk.CTkButton(
            vercel_actions,
            text="🌟 Production",
            command=self.deploy_production
        )
        prod_btn.grid(row=0, column=2, padx=5, pady=5, sticky="ew")
        
        status_btn = ctk.CTkButton(
            vercel_actions,
            text="📊 Status",
            command=self.check_vercel_status
        )
        status_btn.grid(row=0, column=3, padx=5, pady=5, sticky="ew")

    def setup_build_section(self, parent):
        """Configura seção de build"""
        build_frame = ctk.CTkFrame(parent)
        build_frame.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(
            build_frame,
            text="🔧 Build e Testes",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(pady=(20, 10))
        
        # Botões de build
        build_actions = ctk.CTkFrame(build_frame, fg_color="transparent")
        build_actions.pack(fill="x", padx=20, pady=(0, 20))
        
        build_actions.grid_columnconfigure((0, 1, 2), weight=1)
        
        install_btn = ctk.CTkButton(
            build_actions,
            text="📦 npm install",
            command=lambda: self.run_npm_command("install")
        )
        install_btn.grid(row=0, column=0, padx=5, pady=5, sticky="ew")
        
        build_btn = ctk.CTkButton(
            build_actions,
            text="🔨 npm run build",
            command=lambda: self.run_npm_command("build")
        )
        build_btn.grid(row=0, column=1, padx=5, pady=5, sticky="ew")
        
        dev_btn = ctk.CTkButton(
            build_actions,
            text="🚀 npm run dev",
            command=lambda: self.run_npm_command("dev")
        )
        dev_btn.grid(row=0, column=2, padx=5, pady=5, sticky="ew")

    def setup_logs_section(self, parent):
        """Configura seção de logs"""
        logs_frame = ctk.CTkFrame(parent)
        logs_frame.pack(fill="both", expand=True)
        
        ctk.CTkLabel(
            logs_frame,
            text="📄 Logs de Deploy",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(pady=(20, 10))
        
        self.deploy_logs = ctk.CTkTextbox(
            logs_frame,
            font=ctk.CTkFont(family="Courier New", size=11)
        )
        self.deploy_logs.pack(fill="both", expand=True, padx=20, pady=(0, 20))

    def setup_tools_tab(self):
        """Configura aba de ferramentas"""
        # Container principal
        tools_container = ctk.CTkScrollableFrame(self.tab_tools)
        tools_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Título
        title = ctk.CTkLabel(
            tools_container,
            text="🛠️ Ferramentas e Utilitários",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.pack(pady=(10, 30))
        
        # Seção Git Tools
        self.setup_git_tools(tools_container)
        
        # Seção File Tools
        self.setup_file_tools(tools_container)
        
        # Seção System Tools
        self.setup_system_tools(tools_container)

    def setup_git_tools(self, parent):
        """Configura ferramentas Git"""
        git_tools_frame = ctk.CTkFrame(parent)
        git_tools_frame.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(
            git_tools_frame,
            text="📚 Ferramentas Git",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(pady=(20, 10))
        
        # Grid de ferramentas
        tools_grid = ctk.CTkFrame(git_tools_frame, fg_color="transparent")
        tools_grid.pack(fill="x", padx=20, pady=(0, 20))
        
        tools_grid.grid_columnconfigure((0, 1, 2), weight=1)
        
        # Ferramentas Git
        git_tools = [
            ("🏷️ Criar Tag", self.create_git_tag),
            ("🔄 Reset Hard", self.git_reset_hard),
            ("🧹 Clean", self.git_clean),
            ("📊 Git Log Graph", self.show_git_graph),
            ("🔍 Git Blame", self.git_blame_file),
            ("⚡ Git Bisect", self.git_bisect)
        ]
        
        for i, (name, command) in enumerate(git_tools):
            btn = ctk.CTkButton(
                tools_grid,
                text=name,
                command=command
            )
            btn.grid(row=i//3, column=i%3, padx=5, pady=5, sticky="ew")

    def setup_file_tools(self, parent):
        """Configura ferramentas de arquivo"""
        file_tools_frame = ctk.CTkFrame(parent)
        file_tools_frame.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(
            file_tools_frame,
            text="📁 Ferramentas de Arquivo",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(pady=(20, 10))
        
        # Grid de ferramentas
        file_tools_grid = ctk.CTkFrame(file_tools_frame, fg_color="transparent")
        file_tools_grid.pack(fill="x", padx=20, pady=(0, 20))
        
        file_tools_grid.grid_columnconfigure((0, 1, 2), weight=1)
        
        # Ferramentas de arquivo
        file_tools = [
            ("📂 Abrir Pasta", self.open_project_folder),
            ("🔍 Buscar Arquivos", self.search_files),
            ("📊 Análise de Código", self.analyze_code),
            ("🧹 Limpar Cache", self.clear_cache),
            ("📋 Backup Projeto", self.backup_project),
            ("⚙️ Config Editor", self.open_config_editor)
        ]
        
        for i, (name, command) in enumerate(file_tools):
            btn = ctk.CTkButton(
                file_tools_grid,
                text=name,
                command=command
            )
            btn.grid(row=i//3, column=i%3, padx=5, pady=5, sticky="ew")

    def setup_system_tools(self, parent):
        """Configura ferramentas do sistema"""
        system_tools_frame = ctk.CTkFrame(parent)
        system_tools_frame.pack(fill="x")
        
        ctk.CTkLabel(
            system_tools_frame,
            text="💻 Ferramentas do Sistema",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(pady=(20, 10))
        
        # Grid de ferramentas
        system_tools_grid = ctk.CTkFrame(system_tools_frame, fg_color="transparent")
        system_tools_grid.pack(fill="x", padx=20, pady=(0, 20))
        
        system_tools_grid.grid_columnconfigure((0, 1, 2), weight=1)
        
        # Ferramentas do sistema
        system_tools = [
            ("📊 Monitor Sistema", self.show_system_monitor),
            ("🌐 Testar Conexão", self.test_network),
            ("🔧 Diagnóstico", self.run_diagnostics),
            ("📱 QR Code URL", self.generate_qr_code),
            ("🎨 Trocar Tema", self.toggle_theme),
            ("⚙️ Configurações", self.open_settings)
        ]
        
        for i, (name, command) in enumerate(system_tools):
            btn = ctk.CTkButton(
                system_tools_grid,
                text=name,
                command=command
            )
            btn.grid(row=i//3, column=i%3, padx=5, pady=5, sticky="ew")

    def create_status_bar(self):
        """Cria barra de status"""
        self.status_bar = ctk.CTkFrame(self.main_container)
        self.status_bar.pack(fill="x", pady=(10, 0))
        
        # Status left
        status_left = ctk.CTkFrame(self.status_bar, fg_color="transparent")
        status_left.pack(side="left", padx=20, pady=10)
        
        self.status_left_label = ctk.CTkLabel(
            status_left,
            text="✅ Pronto",
            font=ctk.CTkFont(size=12)
        )
        self.status_left_label.pack(side="left")
        
        # Status right
        status_right = ctk.CTkFrame(self.status_bar, fg_color="transparent")
        status_right.pack(side="right", padx=20, pady=10)
        
        self.status_right_label = ctk.CTkLabel(
            status_right,
            text=f"🕐 {datetime.datetime.now().strftime('%H:%M:%S')}",
            font=ctk.CTkFont(size=12)
        )
        self.status_right_label.pack(side="right")
        
        # Atualizar relógio
        self.update_clock()

    def update_clock(self):
        """Atualiza relógio na barra de status"""
        current_time = datetime.datetime.now().strftime('%H:%M:%S')
        self.status_right_label.configure(text=f"🕐 {current_time}")
        self.root.after(1000, self.update_clock)

    # ==================== MÉTODOS DE FUNCIONALIDADE ====================

    def run_command(self, command, cwd=None):
        """Executa comando no sistema"""
        try:
            if cwd is None:
                cwd = self.project_path
            
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=cwd,
                encoding='utf-8'
            )
            
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            return False, "", str(e)

    def refresh_all_data(self):
        """Atualiza todos os dados"""
        try:
            self.update_status("🔄 Atualizando dados...")
            
            # Atualizar informações do projeto
            self.update_project_info()
            
            # Atualizar estatísticas
            self.update_statistics()
            
            # Atualizar listas
            self.load_git_status()
            self.load_versions()
            self.load_branches()
            
            # Atualizar activity
            self.update_activity()
            
            # Atualizar sistema
            self.update_system_info()
            
            self.update_status("✅ Dados atualizados")
            
        except Exception as e:
            self.update_status(f"❌ Erro: {str(e)}")

    def update_project_info(self):
        """Atualiza informações do projeto"""
        # Atualizar branch atual
        success, output, _ = self.run_command('git branch --show-current')
        if success and output.strip():
            branch = output.strip()
            self.branch_info_label.configure(text=f"🌟 {branch}")
        else:
            self.branch_info_label.configure(text="🌟 (detached)")

    def update_statistics(self):
        """Atualiza estatísticas do dashboard"""
        # Commits
        success, output, _ = self.run_command('git rev-list --count HEAD')
        commits = output.strip() if success and output.strip().isdigit() else "0"
        self.commits_label.configure(text=commits)
        
        # Branches
        success, output, _ = self.run_command('git branch -a')
        branches = str(len(output.split('\n')) - 1) if success else "0"
        self.branches_label.configure(text=branches)
        
        # Arquivos modificados
        success, output, _ = self.run_command('git status --porcelain')
        files = str(len([l for l in output.split('\n') if l.strip()])) if success else "0"
        self.files_label.configure(text=files)
        
        # Status geral
        if int(files) > 0:
            self.status_label.configure(text="📝", text_color="orange")
        else:
            self.status_label.configure(text="✅", text_color="green")

    def load_git_status(self):
        """Carrega status do Git"""
        success, output, _ = self.run_command('git status --porcelain')
        if success:
            if output.strip():
                formatted_output = ""
                for line in output.strip().split('\n'):
                    if line.strip():
                        status = line[:2]
                        file_path = line[3:]
                        icon = {'M ': '📝', '??': '🆕', 'A ': '➕', 'D ': '🗑️'}.get(status, '📄')
                        formatted_output += f"{icon} {file_path}\n"
                self.git_status_text.delete("0.0", "end")
                self.git_status_text.insert("0.0", formatted_output)
            else:
                self.git_status_text.delete("0.0", "end")
                self.git_status_text.insert("0.0", "✅ Nenhuma mudança pendente")

    def load_versions(self):
        """Carrega lista de versões"""
        # Limpar dados anteriores
        self.versions_data = []
        
        # Carregar commits com informações de timestamp
        success, output, _ = self.run_command('git log --oneline --date=format:"%d/%m/%Y %H:%M" --pretty=format:"%h|%ad|%s|%at" -20')
        if success and output:
            for line in output.strip().split('\n'):
                if '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 4:
                        hash_short = parts[0]
                        date_time = parts[1]
                        message = parts[2]
                        timestamp = int(parts[3]) if parts[3].isdigit() else 0
                        
                        # Verificar se há tag para este commit
                        tag_success, tag_output, _ = self.run_command(f'git tag --points-at {hash_short}')
                        display_message = message
                        if tag_success and tag_output.strip():
                            tag_name = tag_output.strip().split('\n')[0]
                            display_message = f"🏷️ {tag_name}"
                        
                        # Armazenar dados para ordenação
                        self.versions_data.append({
                            'hash': hash_short,
                            'date': date_time,
                            'message': display_message,
                            'original_message': message,
                            'timestamp': timestamp
                        })
        
        # Exibir dados ordenados
        self.display_versions()

    def load_branches(self):
        """Carrega lista de branches"""
        # Limpar dados anteriores
        self.branches_data = []
        
        # Carregar branch atual
        current_success, current_output, _ = self.run_command('git branch --show-current')
        current_branch = current_output.strip() if current_success else None
        
        # Carregar branches com mais informações
        success, output, _ = self.run_command('git for-each-ref --format="%(refname:short)|%(committerdate:unix)|%(objectname:short)|%(subject)" refs/heads/')
        if success and output:
            for line in output.strip().split('\n'):
                if line.strip() and '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 4:
                        branch_name = parts[0]
                        timestamp = int(parts[1]) if parts[1].isdigit() else 0
                        last_commit = parts[2]
                        subject = parts[3][:50] + "..." if len(parts[3]) > 50 else parts[3]
                        
                        # Determinar status
                        is_current = current_branch == branch_name
                        status = "🌟 Atual" if is_current else "🔀 Branch"
                        
                        # Armazenar dados para ordenação
                        self.branches_data.append({
                            'status': status,
                            'name': branch_name,
                            'last_commit': last_commit,
                            'subject': subject,
                            'timestamp': timestamp,
                            'is_current': is_current
                        })
        
        # Exibir dados ordenados
        self.display_branches()

    def update_activity(self):
        """Atualiza atividade recente"""
        activity_text = "📅 Atividade Recente:\n\n"
        
        # Git log recente
        success, output, _ = self.run_command('git log --oneline -5')
        if success and output:
            activity_text += "🔄 Commits Recentes:\n"
            for line in output.strip().split('\n'):
                if line.strip():
                    activity_text += f"  • {line}\n"
        
        activity_text += "\n📊 Status: Sistema funcionando normalmente\n"
        activity_text += f"🕐 Última atualização: {datetime.datetime.now().strftime('%H:%M:%S')}"
        
        self.activity_text.delete("0.0", "end")
        self.activity_text.insert("0.0", activity_text)

    def update_system_info(self):
        """Atualiza informações do sistema"""
        system_text = "💻 Informações do Sistema:\n\n"
        
        try:
            # Informações básicas
            system_text += f"🖥️  Sistema: {platform.system()} {platform.release()}\n"
            system_text += f"🐍 Python: {sys.version.split()[0]}\n"
            
            # Informações do projeto
            package_json = os.path.join(self.project_path, 'package.json')
            if os.path.exists(package_json):
                with open(package_json, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                    system_text += f"📦 Projeto: {package_data.get('name', 'N/A')}\n"
                    system_text += f"🏷️  Versão: {package_data.get('version', 'N/A')}\n"
            
            # Informações de memória
            memory = psutil.virtual_memory()
            system_text += f"🧠 RAM: {memory.percent}% usado\n"
            
            # Informações de disco
            disk = psutil.disk_usage(self.project_path)
            system_text += f"💾 Disco: {disk.percent}% usado\n"
            
        except Exception as e:
            system_text += f"❌ Erro ao obter informações: {str(e)}\n"
        
        self.system_info_text.delete("0.0", "end")
        self.system_info_text.insert("0.0", system_text)

    def update_status(self, message):
        """Atualiza status na barra inferior"""
        self.status_left_label.configure(text=message)

    # ==================== EVENTOS ====================

    def on_version_double_click(self, event):
        """Evento de duplo clique em versão"""
        selection = self.versions_tree.selection()
        if selection:
            item = self.versions_tree.item(selection[0])
            hash_commit = item['values'][0]
            message = item['values'][2]
            
            # Mostrar opções
            result = messagebox.askyesnocancel(
                "Ação da Versão",
                f"Versão: {message}\nHash: {hash_commit}\n\n"
                "Sim: Checkout para esta versão\n"
                "Não: Criar branch desta versão\n"
                "Cancelar: Fechar"
            )
            
            if result is True:
                self.checkout_version(hash_commit)
            elif result is False:
                self.create_branch_from_version(hash_commit)

    def on_branch_double_click(self, event):
        """Evento de duplo clique em branch"""
        selection = self.branches_tree.selection()
        if selection:
            item = self.branches_tree.item(selection[0])
            branch_name = item['values'][1]
            status = item['values'][0]
            
            if "🌟" not in status:  # Não é a branch atual
                if messagebox.askyesno("Trocar Branch", f"Trocar para a branch '{branch_name}'?"):
                    self.switch_to_branch(branch_name)

    def on_closing(self):
        """Evento de fechamento da aplicação"""
        if self.terminal_process and self.terminal_process.poll() is None:
            try:
                self.terminal_process.terminate()
            except:
                pass
        
        self.save_config()
        self.root.destroy()

    # ==================== MÉTODOS DE COMANDO ====================

    def commit_changes(self):
        """Faz commit das mudanças"""
        message = self.commit_message_entry.get().strip()
        if not message:
            messagebox.showwarning("Aviso", "Digite uma mensagem para o commit!")
            return
        
        # Add e commit
        success1, _, _ = self.run_command('git add .')
        success2, output, error = self.run_command(f'git commit -m "{message}"')
        
        if success2:
            messagebox.showinfo("Sucesso", "Commit realizado com sucesso!")
            self.commit_message_entry.delete(0, 'end')
            self.refresh_all_data()
        else:
            messagebox.showerror("Erro", f"Erro no commit: {error}")

    def create_new_branch(self):
        """Cria nova branch"""
        branch_name = simpledialog.askstring(
            "Nova Branch",
            "Nome da nova branch:",
            initialvalue=f"feature_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}"
        )
        
        if branch_name:
            success, output, error = self.run_command(f'git checkout -b {branch_name}')
            if success:
                messagebox.showinfo("Sucesso", f"Branch '{branch_name}' criada!")
                self.refresh_all_data()
            else:
                messagebox.showerror("Erro", f"Erro ao criar branch: {error}")

    def manage_stash(self):
        """Gerencia stash"""
        # Criar janela de stash
        stash_window = ctk.CTkToplevel(self.root)
        stash_window.title("📦 Gerenciar Stash")
        stash_window.geometry("600x400")
        
        # Lista de stashes
        success, output, _ = self.run_command('git stash list')
        stash_text = ctk.CTkTextbox(stash_window)
        stash_text.pack(fill="both", expand=True, padx=20, pady=20)
        
        if success and output:
            stash_text.insert("0.0", output)
        else:
            stash_text.insert("0.0", "Nenhum stash encontrado")

    def git_pull(self):
        """Executa git pull"""
        success, output, error = self.run_command('git pull')
        if success:
            messagebox.showinfo("Sucesso", "Pull realizado com sucesso!")
            self.refresh_all_data()
        else:
            messagebox.showerror("Erro", f"Erro no pull: {error}")

    def git_push(self):
        """Executa git push"""
        success, output, error = self.run_command('git push')
        if success:
            messagebox.showinfo("Sucesso", "Push realizado com sucesso!")
        else:
            messagebox.showerror("Erro", f"Erro no push: {error}")

    def checkout_version(self, hash_commit):
        """Faz checkout para uma versão"""
        success, output, error = self.run_command(f'git checkout {hash_commit}')
        if success:
            messagebox.showinfo("Sucesso", f"Checkout para {hash_commit} realizado!")
            self.refresh_all_data()
        else:
            messagebox.showerror("Erro", f"Erro no checkout: {error}")

    def create_branch_from_version(self, hash_commit):
        """Cria branch a partir de uma versão"""
        branch_name = simpledialog.askstring(
            "Nova Branch",
            f"Nome da branch baseada em {hash_commit}:",
            initialvalue=f"branch_{hash_commit}_{datetime.datetime.now().strftime('%H%M')}"
        )
        
        if branch_name:
            success, output, error = self.run_command(f'git checkout -b {branch_name} {hash_commit}')
            if success:
                messagebox.showinfo("Sucesso", f"Branch '{branch_name}' criada!")
                self.refresh_all_data()
            else:
                messagebox.showerror("Erro", f"Erro ao criar branch: {error}")

    def switch_to_branch(self, branch_name):
        """Troca para uma branch"""
        success, output, error = self.run_command(f'git checkout {branch_name}')
        if success:
            messagebox.showinfo("Sucesso", f"Trocou para branch '{branch_name}'!")
            self.refresh_all_data()
        else:
            messagebox.showerror("Erro", f"Erro ao trocar branch: {error}")

    # ==================== MÉTODOS DO TERMINAL ====================

    def open_new_terminal(self):
        """Abre novo terminal"""
        shell = self.shell_var.get()
        
        try:
            if shell == "wsl":
                cmd = ["wsl", "-d", "Ubuntu"]
            elif shell == "cmd":
                cmd = ["cmd"]
            elif shell == "powershell":
                cmd = ["powershell"]
            elif shell == "git-bash":
                cmd = ["C:\\Program Files\\Git\\bin\\bash.exe"]
            else:
                cmd = ["cmd"]
            
            # Abrir em nova janela
            subprocess.Popen(
                cmd,
                cwd=self.project_path,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            
            self.log_terminal(f"🆕 Novo terminal {shell} aberto")
            
        except Exception as e:
            self.log_terminal(f"❌ Erro ao abrir terminal: {str(e)}")

    def launch_claude_code(self):
        """Lança Claude Code no terminal"""
        try:
            # Comando para WSL
            claude_cmd = f"cd {self.project_path} && {self.config.get('claude_path', 'claude-code')}"
            
            # Executar via WSL
            subprocess.Popen(
                ["wsl", "-e", "bash", "-c", claude_cmd],
                cwd=self.project_path,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            
            self.log_terminal("🤖 Claude Code iniciado!")
            
        except Exception as e:
            self.log_terminal(f"❌ Erro ao iniciar Claude Code: {str(e)}")

    def execute_command(self, event=None):
        """Executa comando no terminal integrado"""
        command = self.command_entry.get().strip()
        if not command:
            return
        
        self.command_entry.delete(0, 'end')
        self.log_terminal(f"$ {command}")
        
        # Executar comando
        success, output, error = self.run_command(command)
        
        if success:
            if output:
                self.log_terminal(output)
        else:
            if error:
                self.log_terminal(f"❌ {error}")
        
        # Adicionar ao histórico
        self.terminal_history.append(command)

    def quick_command(self, command):
        """Executa comando rápido"""
        self.command_entry.delete(0, 'end')
        self.command_entry.insert(0, command)
        self.execute_command()

    def clear_terminal(self):
        """Limpa terminal"""
        self.terminal_output.delete("0.0", "end")
        self.log_terminal("🧹 Terminal limpo")

    def log_terminal(self, message):
        """Adiciona mensagem ao terminal"""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        log_message = f"[{timestamp}] {message}\n"
        
        self.terminal_output.insert("end", log_message)
        self.terminal_output.see("end")

    # ==================== MÉTODOS DE DEPLOY ====================

    def vercel_login(self):
        """Login no Vercel"""
        self.log_deploy("🔑 Fazendo login no Vercel...")
        
        def login_thread():
            success, output, error = self.run_command("vercel login")
            if success:
                self.root.after(0, lambda: self.log_deploy("✅ Login realizado com sucesso!"))
                self.root.after(0, self.check_vercel_status)
            else:
                self.root.after(0, lambda: self.log_deploy(f"❌ Erro no login: {error}"))
        
        threading.Thread(target=login_thread, daemon=True).start()

    def deploy_preview(self):
        """Deploy de preview"""
        self.log_deploy("👀 Iniciando deploy de preview...")
        
        def deploy_thread():
            success, output, error = self.run_command("vercel")
            if success:
                self.root.after(0, lambda: self.log_deploy("✅ Deploy de preview concluído!"))
                # Extrair URL se possível
                for line in output.split('\n'):
                    if 'https://' in line and 'vercel.app' in line:
                        self.root.after(0, lambda url=line.strip(): self.log_deploy(f"🌐 URL: {url}"))
                        break
            else:
                self.root.after(0, lambda: self.log_deploy(f"❌ Erro no deploy: {error}"))
        
        threading.Thread(target=deploy_thread, daemon=True).start()

    def deploy_production(self):
        """Deploy de produção"""
        if not messagebox.askyesno("Confirmar", "Deploy para produção?"):
            return
        
        self.log_deploy("🌟 Iniciando deploy de produção...")
        
        def deploy_thread():
            success, output, error = self.run_command("vercel --prod")
            if success:
                self.root.after(0, lambda: self.log_deploy("✅ Deploy de produção concluído!"))
            else:
                self.root.after(0, lambda: self.log_deploy(f"❌ Erro no deploy: {error}"))
        
        threading.Thread(target=deploy_thread, daemon=True).start()

    def check_vercel_status(self):
        """Verifica status do Vercel"""
        success, output, _ = self.run_command("vercel whoami")
        if success and output.strip():
            username = output.strip()
            self.vercel_status_label.configure(text=f"✅ Logado como: {username}")
        else:
            self.vercel_status_label.configure(text="❌ Não logado no Vercel")

    def run_npm_command(self, script):
        """Executa comando npm"""
        self.log_deploy(f"📦 Executando npm {script}...")
        
        def npm_thread():
            success, output, error = self.run_command(f"npm run {script}")
            if success:
                self.root.after(0, lambda: self.log_deploy(f"✅ npm {script} concluído!"))
            else:
                self.root.after(0, lambda: self.log_deploy(f"❌ Erro no npm {script}: {error}"))
        
        threading.Thread(target=npm_thread, daemon=True).start()

    def log_deploy(self, message):
        """Adiciona mensagem ao log de deploy"""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        log_message = f"[{timestamp}] {message}\n"
        
        self.deploy_logs.insert("end", log_message)
        self.deploy_logs.see("end")

    # ==================== MÉTODOS DE FERRAMENTAS ====================

    def create_git_tag(self):
        """Cria tag Git"""
        tag_name = simpledialog.askstring("Nova Tag", "Nome da tag:")
        if tag_name:
            success, output, error = self.run_command(f'git tag {tag_name}')
            if success:
                messagebox.showinfo("Sucesso", f"Tag '{tag_name}' criada!")
            else:
                messagebox.showerror("Erro", f"Erro ao criar tag: {error}")

    def git_reset_hard(self):
        """Git reset hard"""
        if messagebox.askyesno("Confirmar", "Reset hard? Isso irá descartar todas as mudanças!"):
            success, output, error = self.run_command('git reset --hard')
            if success:
                messagebox.showinfo("Sucesso", "Reset hard realizado!")
                self.refresh_all_data()
            else:
                messagebox.showerror("Erro", f"Erro no reset: {error}")

    def git_clean(self):
        """Git clean"""
        if messagebox.askyesno("Confirmar", "Limpar arquivos não rastreados?"):
            success, output, error = self.run_command('git clean -fd')
            if success:
                messagebox.showinfo("Sucesso", "Limpeza realizada!")
                self.refresh_all_data()
            else:
                messagebox.showerror("Erro", f"Erro na limpeza: {error}")

    def show_git_graph(self):
        """Mostra graph do Git"""
        success, output, _ = self.run_command('git log --oneline --graph -10')
        if success:
            # Criar janela para mostrar o graph
            graph_window = ctk.CTkToplevel(self.root)
            graph_window.title("📊 Git Graph")
            graph_window.geometry("600x400")
            
            graph_text = ctk.CTkTextbox(graph_window, font=ctk.CTkFont(family="Courier New"))
            graph_text.pack(fill="both", expand=True, padx=20, pady=20)
            graph_text.insert("0.0", output)

    def git_blame_file(self):
        """Git blame de arquivo"""
        file_path = filedialog.askopenfilename(
            title="Selecionar arquivo para blame",
            initialdir=self.project_path
        )
        
        if file_path:
            rel_path = os.path.relpath(file_path, self.project_path)
            success, output, error = self.run_command(f'git blame "{rel_path}"')
            
            if success:
                # Mostrar resultado
                blame_window = ctk.CTkToplevel(self.root)
                blame_window.title(f"🔍 Git Blame - {rel_path}")
                blame_window.geometry("800x600")
                
                blame_text = ctk.CTkTextbox(blame_window, font=ctk.CTkFont(family="Courier New", size=10))
                blame_text.pack(fill="both", expand=True, padx=20, pady=20)
                blame_text.insert("0.0", output)
            else:
                messagebox.showerror("Erro", f"Erro no blame: {error}")

    def git_bisect(self):
        """Inicia Git bisect"""
        messagebox.showinfo("Git Bisect", "Funcionalidade Git Bisect em desenvolvimento...")

    def open_project_folder(self):
        """Abre pasta do projeto"""
        try:
            if os.name == 'nt':  # Windows
                os.startfile(self.project_path)
            else:  # Linux/Mac
                subprocess.run(['xdg-open', self.project_path])
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao abrir pasta: {str(e)}")

    def search_files(self):
        """Busca arquivos"""
        search_term = simpledialog.askstring("Buscar", "Termo de busca:")
        if search_term:
            # Usar find ou grep dependendo do sistema
            if os.name == 'nt':
                success, output, _ = self.run_command(f'findstr /s /i "{search_term}" *.*')
            else:
                success, output, _ = self.run_command(f'grep -r "{search_term}" .')
            
            if success and output:
                # Mostrar resultados
                results_window = ctk.CTkToplevel(self.root)
                results_window.title(f"🔍 Resultados: {search_term}")
                results_window.geometry("800x600")
                
                results_text = ctk.CTkTextbox(results_window)
                results_text.pack(fill="both", expand=True, padx=20, pady=20)
                results_text.insert("0.0", output)
            else:
                messagebox.showinfo("Busca", "Nenhum resultado encontrado")

    def analyze_code(self):
        """Análise de código"""
        analysis_text = "📊 Análise de Código:\n\n"
        
        # Contar tipos de arquivo
        file_counts = {}
        for root, dirs, files in os.walk(self.project_path):
            if '.git' in root or 'node_modules' in root:
                continue
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                file_counts[ext] = file_counts.get(ext, 0) + 1
        
        analysis_text += "📁 Tipos de arquivo:\n"
        for ext, count in sorted(file_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            if ext:
                analysis_text += f"  {ext}: {count} arquivos\n"
        
        # Mostrar análise
        analysis_window = ctk.CTkToplevel(self.root)
        analysis_window.title("📊 Análise de Código")
        analysis_window.geometry("600x400")
        
        analysis_display = ctk.CTkTextbox(analysis_window)
        analysis_display.pack(fill="both", expand=True, padx=20, pady=20)
        analysis_display.insert("0.0", analysis_text)

    def clear_cache(self):
        """Limpa cache do projeto"""
        if messagebox.askyesno("Confirmar", "Limpar cache? Isso pode demorar..."):
            self.update_status("🧹 Limpando cache...")
            
            # Limpar node_modules, .next, etc.
            cache_dirs = ['node_modules', '.next', 'dist', 'build', '.nuxt', '.output']
            
            for cache_dir in cache_dirs:
                cache_path = os.path.join(self.project_path, cache_dir)
                if os.path.exists(cache_path):
                    try:
                        if os.name == 'nt':
                            subprocess.run(['rmdir', '/s', '/q', cache_path], shell=True)
                        else:
                            subprocess.run(['rm', '-rf', cache_path])
                    except:
                        pass
            
            messagebox.showinfo("Sucesso", "Cache limpo!")
            self.update_status("✅ Cache limpo")

    def backup_project(self):
        """Faz backup do projeto"""
        backup_dir = filedialog.askdirectory(title="Pasta para backup")
        if backup_dir:
            self.update_status("💾 Criando backup...")
            
            # Nome do backup
            backup_name = f"backup_{os.path.basename(self.project_path)}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
            backup_path = os.path.join(backup_dir, backup_name)
            
            try:
                # Copiar projeto (excluindo .git, node_modules, etc.)
                import shutil
                
                def ignore_patterns(dir, files):
                    return [f for f in files if f in ['.git', 'node_modules', '.next', 'dist', 'build']]
                
                shutil.copytree(self.project_path, backup_path, ignore=ignore_patterns)
                
                messagebox.showinfo("Sucesso", f"Backup criado em:\n{backup_path}")
                self.update_status("✅ Backup criado")
                
            except Exception as e:
                messagebox.showerror("Erro", f"Erro no backup: {str(e)}")
                self.update_status("❌ Erro no backup")

    def open_config_editor(self):
        """Abre editor de configurações"""
        config_window = ctk.CTkToplevel(self.root)
        config_window.title("⚙️ Editor de Configurações")
        config_window.geometry("500x400")
        
        # Editor simples de JSON
        config_text = ctk.CTkTextbox(config_window)
        config_text.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Carregar configurações atuais
        config_json = json.dumps(self.config, indent=2, ensure_ascii=False)
        config_text.insert("0.0", config_json)
        
        # Botão salvar
        def save_config():
            try:
                new_config = json.loads(config_text.get("0.0", "end"))
                self.config.update(new_config)
                self.save_config()
                messagebox.showinfo("Sucesso", "Configurações salvas!")
                config_window.destroy()
            except json.JSONDecodeError as e:
                messagebox.showerror("Erro", f"JSON inválido: {str(e)}")
        
        save_btn = ctk.CTkButton(config_window, text="💾 Salvar", command=save_config)
        save_btn.pack(pady=10)

    def show_system_monitor(self):
        """Mostra monitor do sistema"""
        monitor_window = ctk.CTkToplevel(self.root)
        monitor_window.title("📊 Monitor do Sistema")
        monitor_window.geometry("600x400")
        
        monitor_text = ctk.CTkTextbox(monitor_window)
        monitor_text.pack(fill="both", expand=True, padx=20, pady=20)
        
        def update_monitor():
            try:
                info = f"""📊 Monitor do Sistema - {datetime.datetime.now().strftime('%H:%M:%S')}

🧠 Memória:
  Total: {psutil.virtual_memory().total // (1024**3)} GB
  Usado: {psutil.virtual_memory().percent}%
  Disponível: {psutil.virtual_memory().available // (1024**3)} GB

💾 Disco:
  Total: {psutil.disk_usage('/').total // (1024**3)} GB
  Usado: {psutil.disk_usage('/').percent}%
  Livre: {psutil.disk_usage('/').free // (1024**3)} GB

🖥️ CPU:
  Uso: {psutil.cpu_percent()}%
  Cores: {psutil.cpu_count()}

📊 Processos Node.js: {len([p for p in psutil.process_iter(['pid', 'name']) if 'node' in p.info['name'].lower()])}
"""
                
                monitor_text.delete("0.0", "end")
                monitor_text.insert("0.0", info)
                
                # Atualizar a cada 2 segundos se a janela ainda existir
                if monitor_window.winfo_exists():
                    monitor_window.after(2000, update_monitor)
                    
            except Exception as e:
                monitor_text.insert("end", f"\n❌ Erro: {str(e)}")
        
        update_monitor()

    def test_network(self):
        """Testa conexão de rede"""
        self.update_status("🌐 Testando conexão...")
        
        def test_thread():
            tests = [
                ("Google", "8.8.8.8"),
                ("Cloudflare", "1.1.1.1"),
                ("GitHub", "github.com"),
                ("NPM", "registry.npmjs.org")
            ]
            
            results = []
            for name, host in tests:
                success, output, _ = self.run_command(f"ping -c 1 {host}" if os.name != 'nt' else f"ping -n 1 {host}")
                status = "✅" if success else "❌"
                results.append(f"{status} {name} ({host})")
            
            result_text = "🌐 Teste de Conexão:\n\n" + "\n".join(results)
            
            self.root.after(0, lambda: messagebox.showinfo("Teste de Rede", result_text))
            self.root.after(0, lambda: self.update_status("✅ Teste concluído"))
        
        threading.Thread(target=test_thread, daemon=True).start()

    def run_diagnostics(self):
        """Executa diagnósticos do sistema"""
        diag_window = ctk.CTkToplevel(self.root)
        diag_window.title("🔧 Diagnósticos")
        diag_window.geometry("700x500")
        
        diag_text = ctk.CTkTextbox(diag_window)
        diag_text.pack(fill="both", expand=True, padx=20, pady=20)
        
        def run_diag():
            diag_info = "🔧 Diagnósticos do Sistema:\n\n"
            
            # Verificar Git
            success, output, _ = self.run_command('git --version')
            diag_info += f"📚 Git: {'✅' if success else '❌'} {output.strip() if success else 'Não encontrado'}\n"
            
            # Verificar Node.js
            success, output, _ = self.run_command('node --version')
            diag_info += f"🟢 Node.js: {'✅' if success else '❌'} {output.strip() if success else 'Não encontrado'}\n"
            
            # Verificar NPM
            success, output, _ = self.run_command('npm --version')
            diag_info += f"📦 NPM: {'✅' if success else '❌'} {output.strip() if success else 'Não encontrado'}\n"
            
            # Verificar Vercel CLI
            success, output, _ = self.run_command('vercel --version')
            diag_info += f"🚀 Vercel CLI: {'✅' if success else '❌'} {output.strip() if success else 'Não encontrado'}\n"
            
            # Verificar projeto
            diag_info += f"\n📁 Projeto:\n"
            diag_info += f"  📍 Pasta: {self.project_path}\n"
            
            package_json = os.path.join(self.project_path, 'package.json')
            diag_info += f"  📄 package.json: {'✅' if os.path.exists(package_json) else '❌'}\n"
            
            node_modules = os.path.join(self.project_path, 'node_modules')
            diag_info += f"  📦 node_modules: {'✅' if os.path.exists(node_modules) else '❌'}\n"
            
            git_dir = os.path.join(self.project_path, '.git')
            diag_info += f"  📚 Git repo: {'✅' if os.path.exists(git_dir) else '❌'}\n"
            
            diag_text.insert("0.0", diag_info)
        
        run_diag()

    def generate_qr_code(self):
        """Gera QR code para URL local"""
        try:
            import qrcode
            from PIL import ImageTk
            
            url = "http://localhost:3000"
            
            # Gerar QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Mostrar em janela
            qr_window = ctk.CTkToplevel(self.root)
            qr_window.title("📱 QR Code - localhost:3000")
            qr_window.geometry("300x350")
            
            # Converter para PhotoImage
            photo = ImageTk.PhotoImage(img)
            
            qr_label = tk.Label(qr_window, image=photo)
            qr_label.image = photo  # Manter referência
            qr_label.pack(padx=20, pady=20)
            
            url_label = ctk.CTkLabel(qr_window, text=url, font=ctk.CTkFont(size=12))
            url_label.pack()
            
        except ImportError:
            messagebox.showinfo("QR Code", "Instale 'qrcode' e 'Pillow' para gerar QR codes:\npip install qrcode[pil]")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar QR code: {str(e)}")

    def toggle_theme(self):
        """Alterna tema"""
        current_mode = ctk.get_appearance_mode()
        new_mode = "light" if current_mode == "Dark" else "dark"
        ctk.set_appearance_mode(new_mode)
        
        self.config['theme'] = new_mode
        self.save_config()
        
        messagebox.showinfo("Tema", f"Tema alterado para: {new_mode}")

    def open_settings(self):
        """Abre configurações avançadas"""
        settings_window = ctk.CTkToplevel(self.root)
        settings_window.title("⚙️ Configurações")
        settings_window.geometry("600x500")
        
        # Notebook para categorias
        settings_notebook = ctk.CTkTabview(settings_window)
        settings_notebook.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Aba Geral
        general_tab = settings_notebook.add("🔧 Geral")
        
        # Tema
        ctk.CTkLabel(general_tab, text="🎨 Tema:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 5))
        theme_var = ctk.StringVar(value=self.config.get('theme', 'dark'))
        theme_menu = ctk.CTkOptionMenu(general_tab, values=["dark", "light"], variable=theme_var)
        theme_menu.pack(anchor="w", pady=(0, 10))
        
        # Auto-refresh
        auto_refresh_var = ctk.BooleanVar(value=self.config.get('auto_refresh', True))
        auto_refresh_check = ctk.CTkCheckBox(general_tab, text="🔄 Auto-refresh", variable=auto_refresh_var)
        auto_refresh_check.pack(anchor="w", pady=5)
        
        # Aba Terminal
        terminal_tab = settings_notebook.add("💻 Terminal")
        
        ctk.CTkLabel(terminal_tab, text="🐚 Shell padrão:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 5))
        shell_var = ctk.StringVar(value=self.config.get('terminal_shell', 'wsl'))
        shell_menu = ctk.CTkOptionMenu(terminal_tab, values=["wsl", "cmd", "powershell", "git-bash"], variable=shell_var)
        shell_menu.pack(anchor="w", pady=(0, 10))
        
        ctk.CTkLabel(terminal_tab, text="🤖 Caminho Claude Code:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 5))
        claude_var = ctk.StringVar(value=self.config.get('claude_path', 'claude-code'))
        claude_entry = ctk.CTkEntry(terminal_tab, textvariable=claude_var, width=300)
        claude_entry.pack(anchor="w", pady=(0, 10))
        
        # Aba Git
        git_tab = settings_notebook.add("📚 Git")
        
        ctk.CTkLabel(git_tab, text="👤 Nome do usuário:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 5))
        git_name_var = ctk.StringVar(value=self.config.get('git_user_name', 'Usuario'))
        git_name_entry = ctk.CTkEntry(git_tab, textvariable=git_name_var, width=300)
        git_name_entry.pack(anchor="w", pady=(0, 10))
        
        ctk.CTkLabel(git_tab, text="📧 Email:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 5))
        git_email_var = ctk.StringVar(value=self.config.get('git_user_email', 'usuario@local.com'))
        git_email_entry = ctk.CTkEntry(git_tab, textvariable=git_email_var, width=300)
        git_email_entry.pack(anchor="w", pady=(0, 10))
        
        # Botões
        buttons_frame = ctk.CTkFrame(settings_window, fg_color="transparent")
        buttons_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        def save_settings():
            # Salvar configurações
            self.config.update({
                'theme': theme_var.get(),
                'auto_refresh': auto_refresh_var.get(),
                'terminal_shell': shell_var.get(),
                'claude_path': claude_var.get(),
                'git_user_name': git_name_var.get(),
                'git_user_email': git_email_var.get()
            })
            
            self.save_config()
            
            # Aplicar tema se mudou
            if theme_var.get() != ctk.get_appearance_mode().lower():
                ctk.set_appearance_mode(theme_var.get())
            
            # Configurar Git se necessário
            self.run_command(f'git config user.name "{git_name_var.get()}"')
            self.run_command(f'git config user.email "{git_email_var.get()}"')
            
            messagebox.showinfo("Sucesso", "Configurações salvas!")
            settings_window.destroy()
        
        save_btn = ctk.CTkButton(buttons_frame, text="💾 Salvar", command=save_settings)
        save_btn.pack(side="right", padx=(5, 0))
        
        cancel_btn = ctk.CTkButton(buttons_frame, text="❌ Cancelar", command=settings_window.destroy)
        cancel_btn.pack(side="right")

    # ==================== FUNCIONALIDADES DE TABELA ====================

    def display_versions(self):
        """Exibe os dados das versões na tabela"""
        # Limpar tabela
        for item in self.versions_tree.get_children():
            self.versions_tree.delete(item)
        
        # Adicionar dados
        for version in self.versions_data:
            self.versions_tree.insert('', 'end', 
                                    values=(version['hash'], version['date'], version['message']),
                                    tags=(version['hash'],))

    def display_branches(self):
        """Exibe os dados das branches na tabela"""
        # Limpar tabela
        for item in self.branches_tree.get_children():
            self.branches_tree.delete(item)
        
        # Adicionar dados
        for branch in self.branches_data:
            self.branches_tree.insert('', 'end', 
                                      values=(branch['status'], branch['name'], branch['last_commit']),
                                      tags=(branch['name'],))

    def sort_versions(self, column):
        """Ordena a tabela de versões pela coluna especificada"""
        # Determinar se deve reverter a ordenação
        if self.versions_sort_column == column:
            self.versions_sort_reverse = not self.versions_sort_reverse
        else:
            self.versions_sort_column = column
            self.versions_sort_reverse = False
        
        # Ordenar dados
        if column == 'hash':
            self.versions_data.sort(key=lambda x: x['hash'].lower(), reverse=self.versions_sort_reverse)
        elif column == 'date':
            # Ordenar por timestamp para ordenação correta de datas
            self.versions_data.sort(key=lambda x: x['timestamp'], reverse=self.versions_sort_reverse)
        elif column == 'message':
            # Ordenar por mensagem (alfabética)
            self.versions_data.sort(key=lambda x: x['message'].lower(), reverse=self.versions_sort_reverse)
        
        # Atualizar cabeçalhos com indicadores de ordenação
        self.update_versions_headers()
        
        # Reexibir dados
        self.display_versions()

    def sort_branches(self, column):
        """Ordena a tabela de branches pela coluna especificada"""
        # Determinar se deve reverter a ordenação
        if self.branches_sort_column == column:
            self.branches_sort_reverse = not self.branches_sort_reverse
        else:
            self.branches_sort_column = column
            self.branches_sort_reverse = False
        
        # Ordenar dados
        if column == 'status':
            # Branches atuais primeiro
            self.branches_data.sort(key=lambda x: (not x['is_current'], x['status'].lower()), reverse=self.branches_sort_reverse)
        elif column == 'name':
            # Ordenar por nome (alfabética)
            self.branches_data.sort(key=lambda x: x['name'].lower(), reverse=self.branches_sort_reverse)
        elif column == 'last_commit':
            # Ordenar por timestamp
            self.branches_data.sort(key=lambda x: x['timestamp'], reverse=self.branches_sort_reverse)
        
        # Atualizar cabeçalhos com indicadores de ordenação
        self.update_branches_headers()
        
        # Reexibir dados
        self.display_branches()

    def update_versions_headers(self):
        """Atualiza os cabeçalhos da tabela de versões com indicadores de ordenação"""
        # Resetar cabeçalhos
        hash_text = 'Hash'
        date_text = 'Data'
        message_text = 'Mensagem'
        
        # Adicionar indicadores de ordenação
        if self.versions_sort_column == 'hash':
            hash_text += ' ↑' if not self.versions_sort_reverse else ' ↓'
        else:
            hash_text += ' ↕️'
            
        if self.versions_sort_column == 'date':
            date_text += ' ↑' if not self.versions_sort_reverse else ' ↓'
        else:
            date_text += ' ↕️'
            
        if self.versions_sort_column == 'message':
            message_text += ' ↑' if not self.versions_sort_reverse else ' ↓'
        else:
            message_text += ' ↕️'
        
        # Atualizar cabeçalhos
        self.versions_tree.heading('hash', text=hash_text, command=lambda: self.sort_versions('hash'))
        self.versions_tree.heading('date', text=date_text, command=lambda: self.sort_versions('date'))
        self.versions_tree.heading('message', text=message_text, command=lambda: self.sort_versions('message'))

    def update_branches_headers(self):
        """Atualiza os cabeçalhos da tabela de branches com indicadores de ordenação"""
        # Resetar cabeçalhos
        status_text = 'Status'
        name_text = 'Nome'
        commit_text = 'Último Commit'
        
        # Adicionar indicadores de ordenação
        if self.branches_sort_column == 'status':
            status_text += ' ↑' if not self.branches_sort_reverse else ' ↓'
        else:
            status_text += ' ↕️'
            
        if self.branches_sort_column == 'name':
            name_text += ' ↑' if not self.branches_sort_reverse else ' ↓'
        else:
            name_text += ' ↕️'
            
        if self.branches_sort_column == 'last_commit':
            commit_text += ' ↑' if not self.branches_sort_reverse else ' ↓'
        else:
            commit_text += ' ↕️'
        
        # Atualizar cabeçalhos
        self.branches_tree.heading('status', text=status_text, command=lambda: self.sort_branches('status'))
        self.branches_tree.heading('name', text=name_text, command=lambda: self.sort_branches('name'))
        self.branches_tree.heading('last_commit', text=commit_text, command=lambda: self.sort_branches('last_commit'))

    # ==================== MENUS DE CONTEXTO ====================

    def show_version_context_menu(self, event):
        """Mostra menu de contexto para versões"""
        # Selecionar item clicado
        item = self.versions_tree.identify_row(event.y)
        if item:
            self.versions_tree.selection_set(item)
            
            # Criar menu de contexto
            context_menu = tk.Menu(self.root, tearoff=0)
            context_menu.add_command(label="🏷️ Renomear Versão", command=self.rename_version)
            context_menu.add_command(label="🔄 Checkout para esta versão", command=self.checkout_selected_version)
            context_menu.add_command(label="🌱 Criar Branch desta versão", command=self.create_branch_from_selected_version)
            context_menu.add_separator()
            context_menu.add_command(label="📋 Copiar Hash", command=self.copy_version_hash)
            context_menu.add_command(label="📝 Ver Detalhes", command=self.show_version_details)
            
            # Mostrar menu
            try:
                context_menu.tk_popup(event.x_root, event.y_root)
            finally:
                context_menu.grab_release()

    def show_branch_context_menu(self, event):
        """Mostra menu de contexto para branches"""
        # Selecionar item clicado
        item = self.branches_tree.identify_row(event.y)
        if item:
            self.branches_tree.selection_set(item)
            
            # Criar menu de contexto
            context_menu = tk.Menu(self.root, tearoff=0)
            context_menu.add_command(label="✏️ Renomear Branch", command=self.rename_branch)
            context_menu.add_command(label="🔄 Trocar para esta Branch", command=self.switch_to_selected_branch)
            context_menu.add_separator()
            context_menu.add_command(label="🗑️ Excluir Branch", command=self.delete_selected_branch)
            context_menu.add_command(label="📋 Copiar Nome", command=self.copy_branch_name)
            context_menu.add_command(label="📊 Ver Log", command=self.show_branch_log)
            
            # Mostrar menu
            try:
                context_menu.tk_popup(event.x_root, event.y_root)
            finally:
                context_menu.grab_release()

    # ==================== FUNCIONALIDADES DE RENOMEAÇÃO ====================

    def rename_version(self):
        """Renomeia uma versão selecionada usando tags"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão para renomear!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        current_message = item['values'][2] if len(item['values']) > 2 else ""
        
        if not commit_hash:
            messagebox.showerror("Erro", "Erro ao obter hash do commit")
            return
        
        # Verificar se já tem tag
        tag_success, tag_output, _ = self.run_command(f'git tag --points-at {commit_hash}')
        current_tag = None
        if tag_success and tag_output.strip():
            current_tag = tag_output.strip().split('\n')[0]
            current_display = current_tag
        else:
            current_display = current_message.replace('🏷️ ', '')
        
        # Criar janela de renomeação
        rename_window = ctk.CTkToplevel(self.root)
        rename_window.title("🏷️ Renomear Versão")
        rename_window.geometry("500x300")
        rename_window.transient(self.root)
        rename_window.grab_set()
        
        # Frame principal
        main_frame = ctk.CTkFrame(rename_window, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Título
        title_label = ctk.CTkLabel(
            main_frame,
            text=f"Renomear Versão: {commit_hash}",
            font=ctk.CTkFont(size=16, weight="bold")
        )
        title_label.pack(pady=(0, 20))
        
        # Campo de entrada
        ctk.CTkLabel(main_frame, text="Novo nome para a versão:").pack(anchor="w", pady=(0, 5))
        entry_var = ctk.StringVar(value=current_display)
        name_entry = ctk.CTkEntry(main_frame, textvariable=entry_var, width=400)
        name_entry.pack(fill="x", pady=(0, 15))
        name_entry.focus()
        name_entry.select_range(0, 'end')
        
        # Informações
        info_label = ctk.CTkLabel(
            main_frame,
            text="💡 O nome será salvo como uma tag Git.\nCaracteres especiais serão convertidos para underscore.",
            font=ctk.CTkFont(size=12)
        )
        info_label.pack(pady=(0, 20))
        
        # Botões
        buttons_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        buttons_frame.pack(fill="x", pady=(10, 0))
        
        def confirm_rename():
            new_name = entry_var.get().strip()
            if not new_name:
                messagebox.showwarning("Aviso", "Digite um nome para a versão!")
                return
            
            if new_name == current_display:
                rename_window.destroy()
                return
            
            # Limpar nome (remover caracteres especiais)
            clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', new_name)
            clean_name = re.sub(r'_+', '_', clean_name)
            
            try:
                # Remover tag antiga se existir
                if current_tag:
                    self.run_command(f'git tag -d {current_tag}')
                
                # Criar nova tag
                success, output, error = self.run_command(f'git tag {clean_name} {commit_hash}')
                
                if success:
                    messagebox.showinfo("Sucesso", f"Versão renomeada para '{clean_name}' com sucesso!")
                    rename_window.destroy()
                    self.refresh_all_data()
                else:
                    if "already exists" in error:
                        if messagebox.askyesno("Tag Existe", f"Já existe uma tag com o nome '{clean_name}'.\nDeseja substituí-la?"):
                            self.run_command(f'git tag -d {clean_name}')
                            success2, _, error2 = self.run_command(f'git tag {clean_name} {commit_hash}')
                            if success2:
                                messagebox.showinfo("Sucesso", f"Versão renomeada para '{clean_name}' com sucesso!")
                                rename_window.destroy()
                                self.refresh_all_data()
                            else:
                                messagebox.showerror("Erro", f"Erro ao renomear: {error2}")
                    else:
                        messagebox.showerror("Erro", f"Erro ao criar tag: {error}")
            
            except Exception as e:
                messagebox.showerror("Erro", f"Erro ao renomear versão: {e}")
        
        cancel_btn = ctk.CTkButton(buttons_frame, text="❌ Cancelar", command=rename_window.destroy)
        cancel_btn.pack(side="right", padx=(5, 0))
        
        confirm_btn = ctk.CTkButton(buttons_frame, text="✅ Confirmar", command=confirm_rename)
        confirm_btn.pack(side="right")
        
        # Bind Enter
        name_entry.bind('<Return>', lambda e: confirm_rename())

    def rename_branch(self):
        """Renomeia uma branch selecionada"""
        selection = self.branches_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma branch para renomear!")
            return
        
        item = self.branches_tree.item(selection[0])
        old_name = item['tags'][0] if item['tags'] else None
        status = item['values'][0] if item['values'] else ""
        
        if not old_name:
            messagebox.showerror("Erro", "Erro ao obter nome da branch")
            return
        
        if old_name in ['main', 'master']:
            messagebox.showwarning("Aviso", "Não é possível renomear a branch principal!")
            return
        
        # Criar janela de renomeação
        rename_window = ctk.CTkToplevel(self.root)
        rename_window.title("✏️ Renomear Branch")
        rename_window.geometry("500x250")
        rename_window.transient(self.root)
        rename_window.grab_set()
        
        # Frame principal
        main_frame = ctk.CTkFrame(rename_window, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Título
        title_label = ctk.CTkLabel(
            main_frame,
            text=f"Renomear Branch: {old_name}",
            font=ctk.CTkFont(size=16, weight="bold")
        )
        title_label.pack(pady=(0, 20))
        
        # Campo de entrada
        ctk.CTkLabel(main_frame, text="Novo nome para a branch:").pack(anchor="w", pady=(0, 5))
        entry_var = ctk.StringVar(value=old_name)
        name_entry = ctk.CTkEntry(main_frame, textvariable=entry_var, width=400)
        name_entry.pack(fill="x", pady=(0, 15))
        name_entry.focus()
        name_entry.select_range(0, 'end')
        
        # Botão para nome padrão
        default_btn = ctk.CTkButton(
            main_frame,
            text="📅 Nome Padrão (Data/Hora)",
            command=lambda: entry_var.set(f"branch_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}")
        )
        default_btn.pack(pady=(0, 20))
        
        # Botões
        buttons_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        buttons_frame.pack(fill="x")
        
        def confirm_rename():
            new_name = entry_var.get().strip()
            if not new_name:
                messagebox.showwarning("Aviso", "Digite um nome para a branch!")
                return
            
            if new_name == old_name:
                rename_window.destroy()
                return
            
            # Validar nome
            if not re.match(r'^[a-zA-Z0-9._/-]+$', new_name):
                messagebox.showwarning("Nome Inválido", "O nome da branch deve conter apenas letras, números, pontos, hífens, underscores e barras.")
                return
            
            success, _, error = self.run_command(f'git branch -m {old_name} {new_name}')
            if success:
                messagebox.showinfo("Sucesso", f"Branch renomeada para '{new_name}'!")
                rename_window.destroy()
                self.refresh_all_data()
            else:
                if "already exists" in error:
                    messagebox.showerror("Erro", f"Já existe uma branch com o nome '{new_name}'!")
                else:
                    messagebox.showerror("Erro", f"Erro ao renomear branch: {error}")
        
        cancel_btn = ctk.CTkButton(buttons_frame, text="❌ Cancelar", command=rename_window.destroy)
        cancel_btn.pack(side="right", padx=(5, 0))
        
        confirm_btn = ctk.CTkButton(buttons_frame, text="✅ Confirmar", command=confirm_rename)
        confirm_btn.pack(side="right")
        
        # Bind Enter
        name_entry.bind('<Return>', lambda e: confirm_rename())

    # ==================== FUNCIONALIDADES AUXILIARES ====================

    def checkout_selected_version(self):
        """Faz checkout da versão selecionada"""
        selection = self.versions_tree.selection()
        if selection:
            item = self.versions_tree.item(selection[0])
            hash_commit = item['values'][0]
            self.checkout_version(hash_commit)

    def create_branch_from_selected_version(self):
        """Cria branch da versão selecionada"""
        selection = self.versions_tree.selection()
        if selection:
            item = self.versions_tree.item(selection[0])
            hash_commit = item['values'][0]
            self.create_branch_from_version(hash_commit)

    def switch_to_selected_branch(self):
        """Troca para a branch selecionada"""
        selection = self.branches_tree.selection()
        if selection:
            item = self.branches_tree.item(selection[0])
            branch_name = item['tags'][0]
            status = item['values'][0]
            
            if "🌟" not in status:  # Não é a branch atual
                self.switch_to_branch(branch_name)

    def delete_selected_branch(self):
        """Exclui a branch selecionada"""
        selection = self.branches_tree.selection()
        if selection:
            item = self.branches_tree.item(selection[0])
            branch_name = item['tags'][0]
            status = item['values'][0]
            
            if branch_name in ['main', 'master'] or "🌟" in status:
                messagebox.showwarning("Aviso", "Não é possível excluir a branch principal ou atual!")
                return
            
            if messagebox.askyesno("Confirmar", f"Excluir a branch '{branch_name}'?\n\n⚠️ Esta ação não pode ser desfeita!"):
                success, _, error = self.run_command(f'git branch -D {branch_name}')
                if success:
                    messagebox.showinfo("Sucesso", f"Branch '{branch_name}' excluída!")
                    self.refresh_all_data()
                else:
                    messagebox.showerror("Erro", f"Erro ao excluir branch: {error}")

    def copy_version_hash(self):
        """Copia hash da versão para clipboard"""
        selection = self.versions_tree.selection()
        if selection:
            item = self.versions_tree.item(selection[0])
            hash_commit = item['values'][0]
            self.root.clipboard_clear()
            self.root.clipboard_append(hash_commit)
            self.update_status(f"📋 Hash copiado: {hash_commit}")

    def copy_branch_name(self):
        """Copia nome da branch para clipboard"""
        selection = self.branches_tree.selection()
        if selection:
            item = self.branches_tree.item(selection[0])
            branch_name = item['tags'][0]
            self.root.clipboard_clear()
            self.root.clipboard_append(branch_name)
            self.update_status(f"📋 Nome copiado: {branch_name}")

    def show_version_details(self):
        """Mostra detalhes da versão selecionada"""
        selection = self.versions_tree.selection()
        if selection:
            item = self.versions_tree.item(selection[0])
            hash_commit = item['values'][0]
            
            success, output, _ = self.run_command(f'git show --stat {hash_commit}')
            if success:
                # Criar janela de detalhes
                details_window = ctk.CTkToplevel(self.root)
                details_window.title(f"📝 Detalhes - {hash_commit}")
                details_window.geometry("700x500")
                
                details_text = ctk.CTkTextbox(details_window, font=ctk.CTkFont(family="Courier New", size=11))
                details_text.pack(fill="both", expand=True, padx=20, pady=20)
                details_text.insert("0.0", output)

    def show_branch_log(self):
        """Mostra log da branch selecionada"""
        selection = self.branches_tree.selection()
        if selection:
            item = self.branches_tree.item(selection[0])
            branch_name = item['tags'][0]
            
            success, output, _ = self.run_command(f'git log --oneline -10 {branch_name}')
            if success:
                # Criar janela de log
                log_window = ctk.CTkToplevel(self.root)
                log_window.title(f"📚 Log - {branch_name}")
                log_window.geometry("600x400")
                
                log_text = ctk.CTkTextbox(log_window, font=ctk.CTkFont(family="Courier New", size=11))
                log_text.pack(fill="both", expand=True, padx=20, pady=20)
                log_text.insert("0.0", output)

    def run(self):
        """Inicia a aplicação"""
        # Verificar e inicializar Git se necessário
        if not os.path.exists(os.path.join(self.project_path, '.git')):
            if messagebox.askyesno("Git", "Repositório Git não encontrado. Deseja inicializar?"):
                success, _, error = self.run_command('git init')
                if success:
                    self.run_command(f'git config user.name "{self.config["git_user_name"]}"')
                    self.run_command(f'git config user.email "{self.config["git_user_email"]}"')
                    messagebox.showinfo("Sucesso", "Repositório Git inicializado!")
                else:
                    messagebox.showerror("Erro", f"Erro ao inicializar Git: {error}")
        
        # Iniciar aplicação
        self.root.mainloop()


def main():
    """Função principal"""
    try:
        app = ModernVersionControlGUI()
        app.run()
    except ImportError as e:
        if "customtkinter" in str(e):
            print("❌ CustomTkinter não encontrado!")
            print("📦 Instale com: pip install customtkinter")
            print("🔄 Ou execute: pip install -r requirements.txt")
        else:
            print(f"❌ Erro de importação: {e}")
    except Exception as e:
        print(f"❌ Erro na aplicação: {e}")


if __name__ == "__main__":
    main()
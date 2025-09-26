#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Controle de Versões Unificado - Orçamento v0
Layout vertical com tabelas empilhadas e ordenação por clique
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, scrolledtext, filedialog
import subprocess
import os
import json
import datetime
import threading
import webbrowser
import re

class VersionControlUnified:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🚀 Sistema Controle de Versões - Orçamento v0")
        self.root.geometry("1400x900")
        try:
            self.root.state('zoomed')
        except:
            pass
        
        # Limpa o log de debug anterior ao iniciar
        if os.path.exists("debug.log"):
            os.remove("debug.log")

        # Define um caminho inicial, mas o usuário poderá mudar
        self.project_path = os.getcwd() 
        self.is_repo_valid = False
        self.is_git_available = False
        self.git_executable = "git" # Default, assume que está no PATH. Será substituído se encontrado em outro lugar.

        
        # Variáveis de ordenação
        self.versions_sort_column = None
        self.versions_sort_reverse = False
        self.forks_sort_column = None
        self.forks_sort_reverse = False
        
        # Dados
        self.versions_data = []
        self.forks_data = []
        
        self.setup_interface()
        
    def setup_interface(self):
        """Interface unificada com layout vertical"""
        # MENU BAR
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Ajuda", menu=help_menu)
        help_menu.add_command(label="Exibir Log de Debug", command=self.show_debug_log)
        help_menu.add_command(label="Verificar Instalação do Git", command=self.check_git_availability)


        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        main_frame.columnconfigure(0, weight=2)
        main_frame.columnconfigure(1, weight=1)
        main_frame.columnconfigure(2, weight=2)
        main_frame.rowconfigure(1, weight=1)
        
        # CABEÇALHO
        header = ttk.Frame(main_frame)
        header.grid(row=0, column=0, columnspan=3, sticky='ew', pady=(0, 10))
        header.columnconfigure(1, weight=1)

        title_label = ttk.Label(header, text="🚀 Sistema de Controle de Versões", font=('Arial', 14, 'bold'))
        title_label.grid(row=0, column=0, sticky='w')

        path_frame = ttk.Frame(header)
        path_frame.grid(row=0, column=1, sticky='ew', padx=10)
        path_frame.columnconfigure(0, weight=1)

        self.path_label = ttk.Label(path_frame, text=f"Pasta: {self.project_path}", anchor='w', foreground="blue")
        self.path_label.grid(row=0, column=0, sticky='ew')
        
        select_folder_button = ttk.Button(path_frame, text="Selecionar Pasta", command=self.select_project_folder)
        select_folder_button.grid(row=0, column=1, sticky='e', padx=(5,0))

        self.git_status_label = ttk.Label(header, text="Aguardando validação...", font=('Arial', 10))
        self.git_status_label.grid(row=0, column=2, sticky='e')

        # COLUNA 1: TABELAS EMPILHADAS
        tables_frame = ttk.Frame(main_frame)
        tables_frame.grid(row=1, column=0, sticky='nsew', padx=(0, 10))
        tables_frame.rowconfigure(0, weight=3)
        tables_frame.rowconfigure(1, weight=1)
        tables_frame.columnconfigure(0, weight=1)
        
        # VERSÕES (superior)
        versions_frame = ttk.LabelFrame(tables_frame, text="📦 Versões Salvas", padding="5")
        versions_frame.grid(row=0, column=0, sticky='nsew', pady=(0, 5))
        versions_frame.rowconfigure(0, weight=1)
        versions_frame.columnconfigure(0, weight=1)
        
        self.versions_tree = ttk.Treeview(versions_frame, columns=('date', 'message'), show='headings')
        self.versions_tree.heading('#1', text='📅 Data/Hora ↕️', command=lambda: self.sort_versions('date'))
        self.versions_tree.heading('#2', text='📝 Descrição ↕️', command=lambda: self.sort_versions('message'))
        self.versions_tree.column('#1', width=120, anchor='center')
        self.versions_tree.column('#2', width=400)
        self.versions_tree.grid(row=0, column=0, sticky='nsew', pady=(0, 5))
        
        v_scroll = ttk.Scrollbar(versions_frame, orient="vertical", command=self.versions_tree.yview)
        self.versions_tree.configure(yscrollcommand=v_scroll.set)
        v_scroll.grid(row=0, column=1, sticky='ns')
        
        v_buttons = ttk.Frame(versions_frame)
        v_buttons.grid(row=1, column=0, columnspan=2, sticky='ew', pady=5)
        ttk.Button(v_buttons, text="⏪ Restaurar", command=self.restore_version).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(v_buttons, text="🔀 Fork", command=self.create_fork_from_version).pack(side=tk.LEFT, padx=5)
        ttk.Button(v_buttons, text="✏️ Renomear", command=self.rename_version).pack(side=tk.LEFT, padx=5)
        
        # FORKS (inferior)
        forks_frame = ttk.LabelFrame(tables_frame, text="🔀 Forks/Branches", padding="5")
        forks_frame.grid(row=1, column=0, sticky='nsew', pady=(5, 0))
        forks_frame.rowconfigure(0, weight=1)
        forks_frame.columnconfigure(0, weight=1)
        
        self.forks_tree = ttk.Treeview(forks_frame, columns=('status', 'name', 'date'), show='headings')
        self.forks_tree.heading('#1', text='📊 Status ↕️', command=lambda: self.sort_forks('status'))
        self.forks_tree.heading('#2', text='🏷️ Nome ↕️', command=lambda: self.sort_forks('name'))
        self.forks_tree.heading('#3', text='📅 Data ↕️', command=lambda: self.sort_forks('date'))
        self.forks_tree.column('#1', width=80, anchor='center')
        self.forks_tree.column('#2', width=200)
        self.forks_tree.column('#3', width=100, anchor='center')
        self.forks_tree.grid(row=0, column=0, sticky='nsew', pady=(0, 5))
        
        f_scroll = ttk.Scrollbar(forks_frame, orient="vertical", command=self.forks_tree.yview)
        self.forks_tree.configure(yscrollcommand=f_scroll.set)
        f_scroll.grid(row=0, column=1, sticky='ns')
        
        f_buttons = ttk.Frame(forks_frame)
        f_buttons.grid(row=1, column=0, columnspan=2, sticky='ew', pady=5)
        ttk.Button(f_buttons, text="🆕 Criar", command=self.create_new_fork, width=10).pack(side=tk.LEFT, padx=(0, 3))
        ttk.Button(f_buttons, text="↩️ Mudar", command=self.switch_fork, width=10).pack(side=tk.LEFT, padx=3)
        ttk.Button(f_buttons, text="✏️ Renomear", command=self.rename_fork, width=10).pack(side=tk.LEFT, padx=3)
        ttk.Button(f_buttons, text="🗑️ Excluir", command=self.delete_fork, width=10).pack(side=tk.LEFT, padx=3)
        
        self.detached_button = ttk.Button(f_buttons, text="🆘 Sair Detached", command=self.exit_detached_head)
        
        # COLUNA 2: AÇÕES
        actions_frame = ttk.LabelFrame(main_frame, text="💾 Ações & Projeto", padding="5")
        actions_frame.grid(row=1, column=1, sticky='nsew', padx=5)
        
        ttk.Label(actions_frame, text="📄 Status:", font=('Arial', 9, 'bold')).pack(anchor='w')
        self.status_text = tk.Text(actions_frame, height=8, width=30, font=('Consolas', 8))
        self.status_text.pack(fill='x', pady=(2, 8))
        
        ttk.Label(actions_frame, text="📝 Descrição:", font=('Arial', 9, 'bold')).pack(anchor='w')
        self.message_entry = ttk.Entry(actions_frame)
        self.message_entry.pack(fill='x', pady=(2, 8))
        
        action_buttons = ttk.Frame(actions_frame)
        action_buttons.pack(fill='x', pady=(0, 10))
        ttk.Button(action_buttons, text="💾 Salvar", command=self.save_version).pack(fill='x', pady=2)
        ttk.Button(action_buttons, text="🔄 Atualizar", command=self.refresh_all).pack(fill='x', pady=2)
        ttk.Button(action_buttons, text="📦 Stash", command=self.manage_stash).pack(fill='x', pady=2)
        
        ttk.Separator(actions_frame, orient='horizontal').pack(fill='x', pady=10)
        
        ttk.Label(actions_frame, text="🚀 Projeto:", font=('Arial', 9, 'bold')).pack(anchor='w')
        proj_buttons = ttk.Frame(actions_frame)
        proj_buttons.pack(fill='x')
        ttk.Button(proj_buttons, text="▶️ Iniciar", command=self.start_project).pack(fill='x', pady=2)
        ttk.Button(proj_buttons, text="🌐 Navegador", command=self.open_browser).pack(fill='x', pady=2)
        ttk.Button(proj_buttons, text="📥 Sync", command=self.sync_repository).pack(fill='x', pady=2)
        
        # COLUNA 3: DEPLOY
        deploy_frame = ttk.LabelFrame(main_frame, text="🚀 Deploy Vercel", padding="5")
        deploy_frame.grid(row=1, column=2, sticky='nsew', padx=(10, 0))
        deploy_frame.rowconfigure(3, weight=1)
        deploy_frame.columnconfigure(0, weight=1)
        
        self.login_status_label = ttk.Label(deploy_frame, text="❌ Não logado", font=('Arial', 9, 'bold'))
        self.login_status_label.grid(row=0, column=0, sticky='w', pady=(0, 5))
        
        login_buttons = ttk.Frame(deploy_frame)
        login_buttons.grid(row=1, column=0, sticky='ew', pady=(0, 10))
        ttk.Button(login_buttons, text="🔑 Login", command=self.vercel_login, width=8).pack(side=tk.LEFT, padx=(0, 3))
        ttk.Button(login_buttons, text="🔍 Status", command=self.check_vercel_status, width=8).pack(side=tk.LEFT, padx=3)
        ttk.Button(login_buttons, text="🚪 Logout", command=self.vercel_logout, width=8).pack(side=tk.LEFT, padx=3)
        
        config_frame = ttk.Frame(deploy_frame)
        config_frame.grid(row=2, column=0, sticky='ew', pady=(0, 10))
        ttk.Label(config_frame, text="📝 Projeto:", font=('Arial', 9, 'bold')).pack(anchor='w')
        self.project_name_var = tk.StringVar(value="orcamento-sistema")
        self.project_name_entry = ttk.Entry(config_frame, textvariable=self.project_name_var)
        self.project_name_entry.pack(fill='x', pady=(2, 5))
        
        deploy_buttons = ttk.Frame(config_frame)
        deploy_buttons.pack(fill='x')
        ttk.Button(deploy_buttons, text="🔍 Verificar", command=self.check_project_setup).pack(fill='x', pady=1)
        ttk.Button(deploy_buttons, text="🚀 Preview", command=self.deploy_preview).pack(fill='x', pady=1)
        ttk.Button(deploy_buttons, text="⭐ Production", command=self.deploy_production).pack(fill='x', pady=1)
        ttk.Button(deploy_buttons, text="📋 Listar", command=self.list_deployments).pack(fill='x', pady=1)
        
        self.deploy_log = scrolledtext.ScrolledText(deploy_frame, height=10, font=('Consolas', 8))
        self.deploy_log.grid(row=3, column=0, sticky='nsew', pady=(5, 5))
        
        urls_frame = ttk.Frame(deploy_frame)
        urls_frame.grid(row=4, column=0, sticky='ew')
        
        self.preview_url_var = tk.StringVar()
        self.production_url_var = tk.StringVar()
        
        ttk.Label(urls_frame, text="🔗 URLs:", font=('Arial', 9, 'bold')).pack(anchor='w')
        
        preview_frame = ttk.Frame(urls_frame)
        preview_frame.pack(fill='x', pady=2)
        ttk.Label(preview_frame, text="Preview:", width=8).pack(side=tk.LEFT)
        ttk.Entry(preview_frame, textvariable=self.preview_url_var, state="readonly", width=20).pack(side=tk.LEFT, fill='x', expand=True, padx=(5, 3))
        ttk.Button(preview_frame, text="🌐", command=lambda: self.open_url(self.preview_url_var.get()), width=3).pack(side=tk.RIGHT)
        
        prod_frame = ttk.Frame(urls_frame)
        prod_frame.pack(fill='x', pady=2)
        ttk.Label(prod_frame, text="Prod:", width=8).pack(side=tk.LEFT)
        ttk.Entry(prod_frame, textvariable=self.production_url_var, state="readonly", width=20).pack(side=tk.LEFT, fill='x', expand=True, padx=(5, 3))
        ttk.Button(prod_frame, text="🌐", command=lambda: self.open_url(self.production_url_var.get()), width=3).pack(side=tk.RIGHT)
        
        # Inicializar
        self.root.after(100, self.check_git_availability)
        self.root.after(500, self.check_vercel_status)

    # ==================== MÉTODOS DE CAMINHO E VALIDAÇÃO ====================
    def find_git_executable(self):
        """Tenta encontrar o executável do Git em locais comuns no Windows."""
        if os.name != 'nt': # Em Linux/Mac, assume-se que está no PATH
            return "git" 

        search_paths = [
            os.environ.get("ProgramFiles", "C:\\Program Files"),
            os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs")
        ]
        
        for path in search_paths:
            if not path: continue
            # Verifica ambos os caminhos, bin e cmd, pois pode variar
            git_path_bin = os.path.join(path, "Git", "bin", "git.exe")
            git_path_cmd = os.path.join(path, "Git", "cmd", "git.exe")
            
            if os.path.exists(git_path_bin):
                return git_path_bin
            if os.path.exists(git_path_cmd):
                return git_path_cmd
        
        return None

    def check_git_availability(self):
        """Verifica se o comando 'git' está disponível, procurando o executável se necessário."""
        try:
            # Tenta executar com o default 'git', que pode estar no PATH
            subprocess.run('git --version', shell=True, check=True, capture_output=True)
            self.is_git_available = True
            self.verify_project_path()
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Se falhou, tenta encontrar o executável em pastas comuns
            found_path = self.find_git_executable()
            if found_path:
                self.git_executable = found_path
                self.is_git_available = True
                self.verify_project_path()
                return True
            else:
                # Se não encontrou de nenhuma forma, exibe o erro
                self.is_git_available = False
                self.clear_all_views()
                self.git_status_label.config(text="❌ Git não encontrado!", foreground="red")
                messagebox.showerror(
                    "Erro de Configuração: Git não encontrado",
                    "O sistema não conseguiu encontrar o Git instalado no seu computador.\n\n"
                    "Para que o programa funcione, por favor, siga estes passos:\n\n"
                    "1. Verifique se o Git está instalado. Se não estiver, baixe e instale a partir de:\n"
                    "   https://git-scm.com/downloads\n\n"
                    "2. Durante a instalação, na etapa 'Adjusting your PATH environment', "
                    "certifique-se de selecionar a opção recomendada:\n"
                    "   'Git from the command line and also from 3rd-party software'.\n\n"
                    "3. Após a instalação, reinicie este programa."
                )
                return False


    def select_project_folder(self):
        """Abre um diálogo para o usuário selecionar a pasta do projeto Git."""
        if not self.is_git_available:
            messagebox.showwarning("Aviso", "A instalação do Git não foi encontrada. Verifique a configuração do seu sistema.")
            return
        path = filedialog.askdirectory(title="Selecione a pasta do seu projeto Git")
        if path:
            self.project_path = path
            self.verify_project_path()

    def verify_project_path(self):
        """Verifica se o caminho selecionado é um repositório Git válido."""
        if not self.is_git_available: return

        git_path = os.path.join(self.project_path, '.git')
        self.path_label.config(text=f"Pasta: {self.project_path}")
        
        if os.path.isdir(git_path):
            self.is_repo_valid = True
            self.git_status_label.config(foreground="black")
            self.refresh_all()
        else:
            self.is_repo_valid = False
            self.git_status_label.config(text="❌ Repositório Git não encontrado", foreground="red")
            if messagebox.askyesno("Repositório Git não encontrado", 
                                   f"A pasta selecionada não parece ser um repositório Git.\n\nDeseja inicializar um novo repositório em:\n{self.project_path}?"):
                success, _, error = self.run_command('git init')
                if success:
                    self.run_command('git config user.name "Usuario"')
                    self.run_command('git config user.email "usuario@local"')
                    messagebox.showinfo("Sucesso", "✅ Repositório Git inicializado!")
                    self.is_repo_valid = True
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", f"Falha ao inicializar o repositório:\n{error}")
            else:
                self.clear_all_views()

    def clear_all_views(self):
        """Limpa as tabelas e campos de texto."""
        self.versions_data = []
        self.forks_data = []
        self.display_versions()
        self.display_forks()
        self.status_text.delete('1.0', tk.END)
        self.status_text.insert('1.0', "Selecione uma pasta de repositório válida.")
    
    # ==================== MÉTODOS BÁSICOS ====================
    
    def run_command(self, command):
        """Executa comando no terminal e loga a saída."""
        try:
            if not self.project_path or not os.path.isdir(self.project_path):
                 return False, "", f"Diretório do projeto inválido: {self.project_path}"
            
            # Prepara o comando com o caminho completo do executável do Git, se necessário
            if command.strip().startswith("git "):
                command_parts = command.split(" ", 1)
                # Adiciona aspas ao redor do executável para lidar com espaços no caminho
                full_command = f'"{self.git_executable}" {command_parts[1]}'
            else:
                full_command = command

            with open("debug.log", "a", encoding='utf-8') as f:
                f.write(f"\n{'='*20} {datetime.datetime.now()} {'='*20}\n")
                f.write(f"CWD: {self.project_path}\n")
                f.write(f"COMMAND: {full_command}\n")

            result = subprocess.run(full_command, shell=True, capture_output=True, text=True, 
                                    encoding='utf-8', errors='ignore', cwd=self.project_path)
            
            with open("debug.log", "a", encoding='utf-8') as f:
                f.write(f"RETURN CODE: {result.returncode}\n")
                f.write(f"STDOUT:\n{result.stdout}\n")
                f.write(f"STDERR:\n{result.stderr}\n")

            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            with open("debug.log", "a", encoding='utf-8') as f:
                f.write(f"EXCEPTION: {e}\n")
            return False, "", str(e)

    def refresh_all(self):
        """Atualiza todas as listas se o repositório for válido."""
        if not self.is_repo_valid or not self.is_git_available:
            self.clear_all_views()
            return
        try:
            threading.Thread(target=self._refresh_in_background, daemon=True).start()
        except Exception as e:
            print(f"Erro ao iniciar thread de atualização: {e}")

    def _refresh_in_background(self):
        """Função que executa as cargas de dados em segundo plano."""
        self.load_versions()
        self.load_status()
        self.load_forks()
        self.update_git_status()
    
    def update_git_status(self):
        """Atualiza status Git no cabeçalho."""
        if not self.is_repo_valid: return
        try:
            success, output, _ = self.run_command('git branch --show-current')
            current_branch = output.strip() if success and output.strip() else "HEAD detached"
            
            success, status_output, _ = self.run_command('git status --porcelain')
            modified_count = len(status_output.strip().split('\n')) if status_output.strip() else 0
            
            status_text = f"📂 {current_branch}"
            if modified_count > 0:
                status_text += f" | 📝 {modified_count} modificado(s)"
            else:
                status_text += " | ✅ Limpo"
            
            self.root.after(0, lambda: self.git_status_label.config(text=status_text))
        except Exception:
            self.root.after(0, lambda: self.git_status_label.config(text="❌ Erro Git"))
    
    # ==================== MÉTODOS DE ORDENAÇÃO ====================
    
    def sort_versions(self, column):
        """Ordena versões por coluna"""
        if self.versions_sort_column == column:
            self.versions_sort_reverse = not self.versions_sort_reverse
        else:
            self.versions_sort_column = column
            self.versions_sort_reverse = False
        
        if column == 'date':
            self.versions_data.sort(key=lambda x: x.get('timestamp', 0), reverse=self.versions_sort_reverse)
        elif column == 'message':
            self.versions_data.sort(key=lambda x: x.get('message', '').lower(), reverse=self.versions_sort_reverse)
        
        self.update_headers()
        self.display_versions()
    
    def sort_forks(self, column):
        """Ordena forks por coluna"""
        if self.forks_sort_column == column:
            self.forks_sort_reverse = not self.forks_sort_reverse
        else:
            self.forks_sort_column = column
            self.forks_sort_reverse = False
        
        if column == 'status':
            priority = {'🌟': 1, '🔴': 2, '🔀': 3}
            self.forks_data.sort(key=lambda x: priority.get(x.get('status_icon', '🔀'), 3), reverse=self.forks_sort_reverse)
        elif column == 'name':
            self.forks_data.sort(key=lambda x: x.get('name', '').lower(), reverse=self.forks_sort_reverse)
        elif column == 'date':
            self.forks_data.sort(key=lambda x: x.get('timestamp', 0), reverse=self.forks_sort_reverse)
        
        self.update_headers()
        self.display_forks()
    
    def update_headers(self):
        """Atualiza cabeçalhos com indicadores de ordenação"""
        date_text = '📅 Data/Hora' + (' ↕️' if self.versions_sort_column != 'date' else ' ↑' if not self.versions_sort_reverse else ' ↓')
        message_text = '📝 Descrição' + (' ↕️' if self.versions_sort_column != 'message' else ' ↑' if not self.versions_sort_reverse else ' ↓')
        self.versions_tree.heading('#1', text=date_text)
        self.versions_tree.heading('#2', text=message_text)

        status_text = '📊 Status' + (' ↕️' if self.forks_sort_column != 'status' else ' ↑' if not self.forks_sort_reverse else ' ↓')
        name_text = '🏷️ Nome' + (' ↕️' if self.forks_sort_column != 'name' else ' ↑' if not self.forks_sort_reverse else ' ↓')
        fork_date_text = '📅 Data' + (' ↕️' if self.forks_sort_column != 'date' else ' ↑' if not self.forks_sort_reverse else ' ↓')
        self.forks_tree.heading('#1', text=status_text)
        self.forks_tree.heading('#2', text=name_text)
        self.forks_tree.heading('#3', text=fork_date_text)

    # ==================== CARREGAR DADOS ====================
    
    def load_versions(self):
        """Carrega lista de versões"""
        if not self.is_repo_valid: return
        
        temp_versions_data = []
        try:
            separator = "<|>"
            command = f'git log --date=format:"%d/%m %H:%M" --pretty=format:"%h{separator}%ad{separator}%s{separator}%at" -20'
            success, output, _ = self.run_command(command)

            if success and output:
                for line in output.strip().split('\n'):
                    if separator in line:
                        parts = line.split(separator)
                        if len(parts) == 4:
                            hash_short, date_time, message, timestamp_str = parts
                            timestamp = int(timestamp_str) if timestamp_str.isdigit() else 0
                            
                            tag_success, tag_output, _ = self.run_command(f'git tag --points-at {hash_short}')
                            display_message = f"🏷️ {tag_output.strip().splitlines()[0]}" if tag_success and tag_output.strip() else message
                            
                            temp_versions_data.append({
                                'hash': hash_short, 'date': date_time,
                                'message': display_message, 'timestamp': timestamp
                            })
            
            if not temp_versions_data:
                temp_versions_data.append({
                    'hash': '', 'date': '',
                    'message': 'Nenhuma versão. Execute "git commit" primeiro.', 'timestamp': 0
                })
            
            self.versions_data = temp_versions_data
            if not self.versions_sort_column:
                self.versions_data.sort(key=lambda x: x['timestamp'], reverse=True)
            
            self.root.after(0, self.display_versions)
        except Exception as e:
            print(f"Erro ao carregar versões: {e}")
    
    def display_versions(self):
        """Exibe versões na tabela"""
        for item in self.versions_tree.get_children():
            self.versions_tree.delete(item)
        
        for version in self.versions_data:
            self.versions_tree.insert('', tk.END, values=(version['date'], version['message']), tags=(version['hash'],))
    
    def load_status(self):
        """Carrega status dos arquivos"""
        if not self.is_repo_valid: return
        try:
            success, output, _ = self.run_command('git status --porcelain')
            
            def update_status_text():
                self.status_text.delete('1.0', tk.END)
                if success and output.strip():
                    lines = output.strip().split('\n')
                    for line in lines[:10]:
                        status, file_path = line[:2], line[3:]
                        icon = {'M ': '📝', '??': '🆕', 'A ': '➕', 'D ': '🗑️'}.get(status, '📄')
                        self.status_text.insert(tk.END, f"{icon} {os.path.basename(file_path)}\n")
                    
                    if len(lines) > 10: self.status_text.insert(tk.END, "... (mais arquivos)\n")
                    self.status_text.insert(tk.END, f"\n📊 Total: {len(lines)} arquivo(s)")
                else:
                    self.status_text.insert(tk.END, "✅ Sem mudanças\n🎉 Repositório limpo!")

            self.root.after(0, update_status_text)
        except Exception as e:
            self.root.after(0, lambda: self.status_text.insert(tk.END, f"❌ Erro: {str(e)}"))
    
    def load_forks(self):
        """Carrega lista de forks"""
        if not self.is_repo_valid: return
        
        temp_forks_data = []
        separator = "<|>"
        try:
            current_success, current_output, _ = self.run_command('git branch --show-current')
            current_branch = current_output.strip() if current_success and current_output.strip() else None
            is_detached = not current_branch
            
            self.root.after(0, lambda d=is_detached: self.detached_button.pack(side=tk.LEFT, padx=3) if d else self.detached_button.pack_forget())

            if is_detached:
                commit_success, commit_output, _ = self.run_command(f'git log -1 --format="%h{separator}%ad{separator}%at" --date=format:"%d/%m %H:%M"')
                if commit_success and commit_output.strip():
                    parts = commit_output.strip().split(separator)
                    if len(parts) == 3:
                        hash_short, commit_date, timestamp = parts[0], parts[1], int(parts[2]) if parts[2].isdigit() else 0
                        temp_forks_data.append({'status_icon': '🔴', 'status': '🔴 Detached', 'name': f"HEAD at {hash_short}",
                                                 'date': commit_date, 'timestamp': timestamp, 'tag': f"detached-{hash_short}"})

            success, output, _ = self.run_command(f'git for-each-ref --format="%(refname:short){separator}%(committerdate:format:%d/%m %H:%M){separator}%(committerdate:unix)" refs/heads/')
            if success and output:
                for line in output.strip().split('\n'):
                    if separator in line:
                        parts = line.split(separator)
                        if len(parts) == 3:
                            branch_name, date_formatted, date_unix = parts[0], parts[1], int(parts[2]) if parts[2].isdigit() else 0
                            is_current = current_branch == branch_name
                            status_icon, status = ('🌟', '🌟 Atual') if is_current else ('🔀', '🔀 Fork')
                            temp_forks_data.append({'status_icon': status_icon, 'status': status, 'name': branch_name,
                                                     'date': date_formatted, 'timestamp': date_unix, 'tag': branch_name})
            
            self.forks_data = temp_forks_data
            if not self.forks_sort_column:
                self.forks_data.sort(key=lambda x: ({'🌟': 1, '🔴': 2, '🔀': 3}).get(x.get('status_icon'), 3))
            
            self.root.after(0, self.display_forks)
        except Exception as e:
            print(f"Erro ao carregar forks: {e}")
    
    def display_forks(self):
        """Exibe forks na tabela"""
        for item in self.forks_tree.get_children():
            self.forks_tree.delete(item)
        
        for fork in self.forks_data:
            self.forks_tree.insert('', tk.END, values=(fork['status'], fork['name'], fork['date']), tags=(fork['tag'],))
    
    # ==================== AÇÕES DE VERSÃO ====================
    def _check_repo_validity(self):
        if not self.is_repo_valid: 
            messagebox.showerror("Erro", "Nenhum repositório Git válido selecionado.")
            return False
        return True

    def save_version(self):
        if not self._check_repo_validity(): return
        message = self.message_entry.get().strip()
        if not message:
            messagebox.showwarning("Aviso", "Digite uma descrição!")
            return
        
        success, status_output, _ = self.run_command('git status --porcelain')
        confirm_msg = f"Salvar versão: {message}" + ("" if success and status_output.strip() else "\n\n⚠️ Sem alterações (versão vazia)")
        
        if not messagebox.askyesno("Confirmar", confirm_msg): return
        
        self.run_command('git add .')
        success, _, error = self.run_command(f'git commit -m "{message}" --allow-empty')
        
        if success:
            messagebox.showinfo("Sucesso", "✅ Versão salva!")
            self.message_entry.delete(0, tk.END)
            self.refresh_all()
        else:
            messagebox.showerror("Erro", f"❌ Erro: {error}")
    
    def restore_version(self):
        if not self._check_repo_validity(): return
        selection = self.versions_tree.selection()
        if not selection: messagebox.showwarning("Aviso", "Selecione uma versão!"); return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item.get('tags') else None
        if not commit_hash: return
        
        choice = messagebox.askyesnocancel("Restaurar", "SIM: Criar fork desta versão\nNÃO: Apenas visualizar (detached)")
        
        if choice is None: return
        elif choice:
            fork_name = simpledialog.askstring("Nome do Fork", "Nome:", initialvalue=f"restore_{datetime.datetime.now().strftime('%m%d_%H%M')}")
            if fork_name:
                success, _, error = self.run_command(f'git checkout -b "{fork_name}" {commit_hash}')
                if success: messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!"); self.refresh_all()
                else: messagebox.showerror("Erro", error)
        else:
            success, _, error = self.run_command(f'git checkout {commit_hash}')
            if success: messagebox.showinfo("Sucesso", "✅ Versão restaurada (visualização)"); self.refresh_all()
            else: messagebox.showerror("Erro", error)
    
    def rename_version(self):
        if not self._check_repo_validity(): return
        selection = self.versions_tree.selection()
        if not selection: messagebox.showwarning("Aviso", "Selecione uma versão!"); return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item.get('tags') else None
        if not commit_hash: return
        
        current_message = item['values'][1] if len(item['values']) > 1 else ""
        tag_success, tag_output, _ = self.run_command(f'git tag --points-at {commit_hash}')
        current_tag = tag_output.strip().split('\n')[0] if tag_success and tag_output.strip() else None
        
        new_name = simpledialog.askstring("Renomear", "Novo nome:", initialvalue=current_tag or current_message.replace('🏷️ ', ''))
        if not new_name: return
        
        clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', new_name.strip())
        
        if current_tag: self.run_command(f'git tag -d "{current_tag}"')
        success, _, error = self.run_command(f'git tag "{clean_name}" {commit_hash}')
        
        if success: messagebox.showinfo("Sucesso", f"✅ Renomeado para '{clean_name}'!"); self.refresh_all()
        else: messagebox.showerror("Erro", error)
    
    def create_fork_from_version(self):
        if not self._check_repo_validity(): return
        selection = self.versions_tree.selection()
        if not selection: messagebox.showwarning("Aviso", "Selecione uma versão!"); return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item.get('tags') else None
        if not commit_hash: return

        fork_name = simpledialog.askstring("Fork", "Nome do fork:", initialvalue=f"fork_{datetime.datetime.now().strftime('%m%d_%H%M')}")
        if fork_name:
            success, _, error = self.run_command(f'git checkout -b "{fork_name}" {commit_hash}')
            if success: messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!"); self.refresh_all()
            else: messagebox.showerror("Erro", error)
    
    # ==================== AÇÕES DE FORK ====================
    def create_new_fork(self):
        if not self._check_repo_validity(): return
        fork_name = simpledialog.askstring("Novo Fork", "Nome:", initialvalue=f"fork_{datetime.datetime.now().strftime('%m%d_%H%M')}")
        if fork_name:
            success, _, error = self.run_command(f'git checkout -b "{fork_name}"')
            if success: messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!"); self.refresh_all()
            else: messagebox.showerror("Erro", error)
    
    def switch_fork(self):
        if not self._check_repo_validity(): return
        selection = self.forks_tree.selection()
        if not selection: messagebox.showwarning("Aviso", "Selecione um fork!"); return
        
        item = self.forks_tree.item(selection[0])
        fork_name = item['tags'][0] if item.get('tags') else None
        
        if fork_name and not fork_name.startswith('detached-'):
            success, _, error = self.run_command(f'git checkout "{fork_name}"')
            if success: messagebox.showinfo("Sucesso", f"✅ Mudou para '{fork_name}'!"); self.refresh_all()
            else: messagebox.showerror("Erro", error)
    
    def rename_fork(self):
        if not self._check_repo_validity(): return
        selection = self.forks_tree.selection()
        if not selection: messagebox.showwarning("Aviso", "Selecione um fork!"); return
        
        item = self.forks_tree.item(selection[0])
        old_name = item['tags'][0] if item.get('tags') else None
        
        if not old_name or old_name.startswith('detached-'): messagebox.showwarning("Aviso", "Não é possível renomear 'detached'."); return
        if old_name in ['main', 'master']: messagebox.showwarning("Aviso", "❌ Não é possível renomear branch principal!"); return
        
        new_name = simpledialog.askstring("Renomear Fork", "Novo nome:", initialvalue=old_name)
        if new_name and new_name != old_name:
            success, _, error = self.run_command(f'git branch -m "{old_name}" "{new_name}"')
            if success: messagebox.showinfo("Sucesso", f"✅ Fork renomeado para '{new_name}'!"); self.refresh_all()
            else: messagebox.showerror("Erro", error)
    
    def delete_fork(self):
        if not self._check_repo_validity(): return
        selection = self.forks_tree.selection()
        if not selection: messagebox.showwarning("Aviso", "Selecione um fork!"); return
        
        item = self.forks_tree.item(selection[0])
        fork_name = item['tags'][0] if item.get('tags') else None
        status = item['values'][0] if item['values'] else ""
        
        if not fork_name or fork_name.startswith('detached-'): messagebox.showwarning("Aviso", "Não é possível excluir 'detached'."); return
        if fork_name in ['main', 'master'] or "🌟" in status: messagebox.showwarning("Aviso", "❌ Não é possível excluir branch principal/atual!"); return
        
        if messagebox.askyesno("Confirmar", f"Excluir fork '{fork_name}'?\n\n⚠️ Ação irreversível!"):
            success, _, error = self.run_command(f'git branch -D "{fork_name}"')
            if success: messagebox.showinfo("Sucesso", "✅ Fork excluído!"); self.refresh_all()
            else: messagebox.showerror("Erro", error)
    
    def exit_detached_head(self):
        if not self._check_repo_validity(): return
        choice = messagebox.askyesnocancel("Sair do Detached", "SIM: Criar fork da posição atual\nNÃO: Voltar para branch principal")
        
        if choice is None: return
        elif choice:
            fork_name = simpledialog.askstring("Nome do Fork", "Nome:", initialvalue=f"detached_save_{datetime.datetime.now().strftime('%m%d_%H%M')}")
            if fork_name:
                self.run_command(f'git checkout -b "{fork_name}"')
                self.refresh_all()
        else:
            _, branches_output, _ = self.run_command('git branch')
            main_branch = 'main' if 'main' in branches_output else 'master'
            self.run_command(f'git checkout {main_branch}')
            self.refresh_all()
    
    def show_debug_log(self):
        log_window = tk.Toplevel(self.root)
        log_window.title("Log de Debug")
        log_window.geometry("800x600")
        log_text = scrolledtext.ScrolledText(log_window, wrap=tk.WORD, font=('Consolas', 9))
        log_text.pack(expand=True, fill=tk.BOTH)
        try:
            with open("debug.log", "r", encoding='utf-8', errors='ignore') as f:
                log_text.insert(tk.END, f.read())
        except FileNotFoundError:
            log_text.insert(tk.END, "Arquivo de log não encontrado.")
        log_text.config(state=tk.DISABLED)

    # ... O restante do código permanece o mesmo ...
    def manage_stash(self):
        if not self._check_repo_validity(): return
        stash_window = tk.Toplevel(self.root)
        stash_window.title("📦 Gerenciar Stash")
        stash_window.geometry("600x400")
        stash_window.transient(self.root)
        stash_window.grab_set()
        
        main_frame = ttk.Frame(stash_window, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(main_frame, text="📦 Stashes Disponíveis:", font=('Arial', 12, 'bold')).pack(anchor='w', pady=(0, 10))
        
        stash_tree = ttk.Treeview(main_frame, columns=('index', 'message'), show='headings', height=10)
        stash_tree.heading('#1', text='Index')
        stash_tree.heading('#2', text='Mensagem')
        stash_tree.column('#1', width=80)
        stash_tree.column('#2', width=400)
        stash_tree.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        def load_stashes():
            for item in stash_tree.get_children(): stash_tree.delete(item)
            success, output, _ = self.run_command('git stash list')
            if success and output.strip():
                for line in output.strip().split('\n'):
                    if line.strip():
                        parts = line.split(': ', 2)
                        if len(parts) >= 2:
                            stash_tree.insert('', tk.END, values=(parts[0], parts[2] if len(parts)>2 else parts[1]))
            else:
                stash_tree.insert('', tk.END, values=("", "Nenhum stash encontrado"))
        
        def apply_stash():
            selection = stash_tree.selection()
            if not selection: messagebox.showwarning("Aviso", "Selecione um stash!"); return
            item = stash_tree.item(selection[0])
            stash_index = item['values'][0] if item['values'] else None
            if not stash_index: return
            if messagebox.askyesno("Confirmar", f"Aplicar {stash_index}?"):
                success, _, error = self.run_command(f'git stash apply {stash_index}')
                if success: messagebox.showinfo("Sucesso", "✅ Stash aplicado!"); load_stashes(); self.refresh_all()
                else: messagebox.showerror("Erro", error)
        
        def create_stash():
            message = simpledialog.askstring("Criar Stash", "Mensagem:", initialvalue="Mudanças temporárias")
            if message:
                success, _, error = self.run_command(f'git stash push -m "{message}"')
                if success: messagebox.showinfo("Sucesso", "✅ Stash criado!"); load_stashes(); self.refresh_all()
                else: messagebox.showerror("Erro", error)
        
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill='x', pady=(10, 0))
        ttk.Button(buttons_frame, text="💾 Criar", command=create_stash).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="✅ Aplicar", command=apply_stash).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="🔄 Atualizar", command=load_stashes).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="❌ Fechar", command=stash_window.destroy).pack(side=tk.RIGHT)
        
        load_stashes()
        
    def start_project(self):
        if not self._check_repo_validity(): return
        package_json = os.path.join(self.project_path, 'package.json')
        if not os.path.exists(package_json):
            messagebox.showerror("Erro", "Arquivo package.json não encontrado!")
            return

        def kill_node_processes():
            if os.name != 'nt': return True, "Não é Windows."
            try:
                subprocess.run(['taskkill', '/F', '/IM', 'node.exe'], capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW)
                return True, "Processos Node.js anteriores terminados."
            except Exception as e: return False, f"Erro ao terminar processos: {e}"

        def start_in_background():
            kill_success, kill_message = kill_node_processes()
            print(kill_message)
            time.sleep(1)
            
            with open(package_json, 'r', encoding='utf-8') as f: scripts = json.load(f).get('scripts', {})
            
            dev_command = None
            if 'dev' in scripts:
                if os.path.exists(os.path.join(self.project_path, 'pnpm-lock.yaml')): dev_command = 'pnpm dev'
                elif os.path.exists(os.path.join(self.project_path, 'yarn.lock')): dev_command = 'yarn dev'
                else: dev_command = 'npm run dev'

            if dev_command:
                try:
                    subprocess.Popen(dev_command, shell=True, cwd=self.project_path, creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
                    return True, dev_command
                except Exception as e: return False, f"Erro ao iniciar projeto: {e}"
            return False, "Script 'dev' não encontrado no package.json"

        def run_start():
            success, result = start_in_background()
            self.root.after(0, lambda: messagebox.showinfo("Sucesso", f"Projeto iniciado com: {result}") if success else messagebox.showerror("Erro", result))
            if success: self.root.after(3000, self.open_browser)

        threading.Thread(target=run_start, daemon=True).start()
    
    def open_browser(self):
        webbrowser.open("http://localhost:3000")
    
    def sync_repository(self):
        if not self._check_repo_validity(): return
        if messagebox.askyesno("Sync", "Sincronizar com repositório remoto?"):
            self.log_deploy_message("Sincronizando...", "INFO")
            def sync_thread():
                _, remote_out, _ = self.run_command("git remote")
                if not remote_out.strip(): self.root.after(0, lambda: self.log_deploy_message("Nenhum remote configurado", "WARNING")); return
                
                pull_success, pull_out, pull_err = self.run_command("git pull")
                self.root.after(0, lambda: self.log_deploy_message(f"Pull: {pull_out or pull_err}", "SUCCESS" if pull_success else "ERROR"))
                
                if pull_success:
                    push_success, push_out, push_err = self.run_command("git push")
                    self.root.after(0, lambda: self.log_deploy_message(f"Push: {push_out or push_err}", "SUCCESS" if push_success else "ERROR"))
                
                self.root.after(0, self.refresh_all)
            threading.Thread(target=sync_thread, daemon=True).start()
    
    def run_vercel_command(self, command, show_output=True):
        try:
            if not self.is_repo_valid: return False, "", "Repositório inválido"
            result = subprocess.run(command, shell=True, capture_output=True, text=True, encoding='utf-8', errors='ignore', cwd=self.project_path)
            if show_output:
                if result.stdout.strip(): self.log_deploy_message(result.stdout.strip(), "INFO")
                if result.stderr.strip(): self.log_deploy_message(result.stderr.strip(), "WARNING")
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            if show_output: self.log_deploy_message(f"Erro na execução: {e}", "ERROR")
            return False, "", str(e)
    
    def log_deploy_message(self, message, level="INFO"):
        def do_insert():
            self.deploy_log.config(state=tk.NORMAL)
            self.deploy_log.insert(tk.END, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {message}\n", level)
            self.deploy_log.config(state=tk.DISABLED)
            self.deploy_log.see(tk.END)
        self.root.after(0, do_insert)
    
    # ==================== VERCEL METHODS ====================
    def setup_deploy_log_tags(self):
        self.deploy_log.tag_config("SUCCESS", foreground="green")
        self.deploy_log.tag_config("WARNING", foreground="orange")
        self.deploy_log.tag_config("ERROR", foreground="red")
        self.deploy_log.tag_config("INFO", foreground="black")

    def check_vercel_cli_installed(self):
        success, _, _ = self.run_vercel_command("vercel --version", show_output=False)
        return success
    
    def vercel_login(self):
        if not self._check_repo_validity(): return
        if not self.check_vercel_cli_installed():
            if messagebox.askyesno("Instalar Vercel CLI", "Vercel CLI não encontrado. Instalar com 'npm install -g vercel'?"):
                self.log_deploy_message("Instalando Vercel CLI...", "INFO")
                subprocess.Popen('npm install -g vercel', shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
            return
        
        self.log_deploy_message("Abra o terminal para fazer o login no Vercel...", "INFO")
        subprocess.Popen('vercel login', shell=True, cwd=self.project_path, creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
        self.root.after(5000, self.check_vercel_status)

    def vercel_logout(self):
        if messagebox.askyesno("Logout", "Fazer logout do Vercel?"):
            self.run_vercel_command("vercel logout")
            self.check_vercel_status()
    
    def check_vercel_status(self):
        def check():
            if not self.is_repo_valid: return
            success, output, _ = self.run_vercel_command("vercel whoami", show_output=False)
            status_text = f"✅ {output.strip()}" if success and output.strip() else "❌ Não logado"
            self.root.after(0, lambda: self.login_status_label.config(text=status_text))
        threading.Thread(target=check, daemon=True).start()

    def check_project_setup(self):
        if not self.is_repo_valid: return False
        self.log_deploy_message("Verificando projeto...", "INFO")
        if not os.path.exists(os.path.join(self.project_path, 'package.json')):
            self.log_deploy_message("❌ package.json não encontrado!", "ERROR")
            return False
        self.log_deploy_message("✅ package.json encontrado!", "SUCCESS")
        return True
    
    def _run_deploy(self, prod=False):
        if not self.check_project_setup(): return
        env = "produção" if prod else "preview"
        if prod and not messagebox.askyesno(f"Deploy {env.capitalize()}", f"Confirmar deploy para {env}?"): return
        
        self.log_deploy_message(f"Iniciando deploy de {env}...", "INFO")
        
        def deploy_thread():
            command = f"vercel {'--prod' if prod else ''}"
            if self.project_name_var.get().strip(): command += f" --name {self.project_name_var.get().strip()}"
            
            success, output, error = self.run_vercel_command(command, show_output=False)
            self.root.after(0, lambda: self.log_deploy_message(output or error, "INFO" if success else "ERROR"))

            if success:
                url = next((line.strip().split(' ')[-1] for line in reversed(output.split('\n')) if 'https://' in line), None)
                if url:
                    var = self.production_url_var if prod else self.preview_url_var
                    self.root.after(0, lambda: var.set(url))
                    self.root.after(0, lambda: self.log_deploy_message(f"Deploy {env} concluído: {url}", "SUCCESS"))
        threading.Thread(target=deploy_thread, daemon=True).start()

    def deploy_preview(self): self._run_deploy(prod=False)
    def deploy_production(self): self._run_deploy(prod=True)
        
    def list_deployments(self):
        self.log_deploy_message("Listando deployments...", "INFO")
        self.run_vercel_command(f"vercel ls {self.project_name_var.get().strip()}")

    def open_url(self, url):
        if url: webbrowser.open(url.strip())
        else: messagebox.showwarning("Aviso", "URL não disponível!")
    
    # ==================== INICIALIZAÇÃO ====================
    
    def run(self):
        """Inicia aplicação"""
        self.setup_deploy_log_tags()
        self.deploy_log.config(state=tk.DISABLED)
        self.root.mainloop()

def main():
    """Função principal"""
    try:
        app = VersionControlUnified()
        app.run()
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        root = tk.Tk(); root.withdraw()
        messagebox.showerror("Erro Fatal", f"❌ Erro ao iniciar aplicação:\n\n{e}\n\nDetalhes:\n{error_details}")
        root.destroy()

if __name__ == "__main__":
    main()



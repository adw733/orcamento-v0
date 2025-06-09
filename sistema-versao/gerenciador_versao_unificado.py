#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Controle de Versões Unificado - Orçamento v0
Layout vertical com tabelas empilhadas e ordenação por clique
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, scrolledtext
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
        
        self.project_path = os.path.dirname(os.path.dirname(__file__))
        
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
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Grid 3 colunas
        main_frame.columnconfigure(0, weight=2)  # Tabelas empilhadas
        main_frame.columnconfigure(1, weight=1)  # Ações
        main_frame.columnconfigure(2, weight=2)  # Deploy
        main_frame.rowconfigure(1, weight=1)
        
        # CABEÇALHO
        header = ttk.Frame(main_frame)
        header.grid(row=0, column=0, columnspan=3, sticky='ew', pady=(0, 10))
        
        ttk.Label(header, text="🚀 Sistema de Controle de Versões - Orçamento v0", 
                 font=('Arial', 14, 'bold')).pack(side=tk.LEFT)
        
        self.git_status_label = ttk.Label(header, text="🔄 Carregando...", font=('Arial', 10))
        self.git_status_label.pack(side=tk.RIGHT)
        
        # COLUNA 1: TABELAS EMPILHADAS
        tables_frame = ttk.Frame(main_frame)
        tables_frame.grid(row=1, column=0, sticky='nsew', padx=(0, 10))
        tables_frame.rowconfigure(0, weight=3)  # Versões (mais espaço)
        tables_frame.rowconfigure(1, weight=1)  # Forks
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
        self.root.after(100, self.refresh_all)
        self.root.after(500, self.check_vercel_status)
    
    # ==================== MÉTODOS BÁSICOS ====================
    
    def run_command(self, command):
        """Executa comando no terminal"""
        try:
            os.chdir(self.project_path)
            result = subprocess.run(command, shell=True, capture_output=True, text=True, encoding='utf-8')
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            return False, "", str(e)
    
    def refresh_all(self):
        """Atualiza todas as listas"""
        try:
            self.load_versions()
            self.load_status()
            self.load_forks()
            self.update_git_status()
        except Exception as e:
            print(f"Erro ao atualizar: {e}")
    
    def update_git_status(self):
        """Atualiza status Git no cabeçalho"""
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
            
            self.git_status_label.config(text=status_text)
        except:
            self.git_status_label.config(text="❌ Erro Git")
    
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
        # Versões
        date_text = '📅 Data/Hora'
        message_text = '📝 Descrição'
        
        if self.versions_sort_column == 'date':
            date_text += ' ↑' if not self.versions_sort_reverse else ' ↓'
        else:
            date_text += ' ↕️'
            
        if self.versions_sort_column == 'message':
            message_text += ' ↑' if not self.versions_sort_reverse else ' ↓'
        else:
            message_text += ' ↕️'
        
        self.versions_tree.heading('#1', text=date_text, command=lambda: self.sort_versions('date'))
        self.versions_tree.heading('#2', text=message_text, command=lambda: self.sort_versions('message'))
        
        # Forks
        status_text = '📊 Status'
        name_text = '🏷️ Nome'
        fork_date_text = '📅 Data'
        
        if self.forks_sort_column == 'status':
            status_text += ' ↑' if not self.forks_sort_reverse else ' ↓'
        else:
            status_text += ' ↕️'
            
        if self.forks_sort_column == 'name':
            name_text += ' ↑' if not self.forks_sort_reverse else ' ↓'
        else:
            name_text += ' ↕️'
            
        if self.forks_sort_column == 'date':
            fork_date_text += ' ↑' if not self.forks_sort_reverse else ' ↓'
        else:
            fork_date_text += ' ↕️'
        
        self.forks_tree.heading('#1', text=status_text, command=lambda: self.sort_forks('status'))
        self.forks_tree.heading('#2', text=name_text, command=lambda: self.sort_forks('name'))
        self.forks_tree.heading('#3', text=fork_date_text, command=lambda: self.sort_forks('date'))
    
    # ==================== CARREGAR DADOS ====================
    
    def load_versions(self):
        """Carrega lista de versões"""
        try:
            self.versions_data = []
            
            success, output, _ = self.run_command('git log --oneline --date=format:"%d/%m %H:%M" --pretty=format:"%h|%ad|%s|%at" -20')
            if success and output:
                for line in output.strip().split('\n'):
                    if '|' in line:
                        parts = line.split('|')
                        if len(parts) >= 4:
                            hash_short = parts[0]
                            date_time = parts[1]
                            message = parts[2]
                            timestamp = int(parts[3]) if parts[3].isdigit() else 0
                            
                            # Verificar tag
                            tag_success, tag_output, _ = self.run_command(f'git tag --points-at {hash_short}')
                            if tag_success and tag_output.strip():
                                tag_name = tag_output.strip().split('\n')[0]
                                display_message = f"🏷️ {tag_name}"
                            else:
                                display_message = message[:60] + "..." if len(message) > 60 else message
                            
                            self.versions_data.append({
                                'hash': hash_short,
                                'date': date_time,
                                'message': display_message,
                                'timestamp': timestamp
                            })
            
            if not self.versions_data:
                self.versions_data.append({
                    'hash': '',
                    'date': '',
                    'message': 'Nenhuma versão - Execute git commit primeiro',
                    'timestamp': 0
                })
            
            if not self.versions_sort_column:
                self.versions_data.sort(key=lambda x: x['timestamp'], reverse=True)
            
            self.display_versions()
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
        try:
            self.status_text.delete('1.0', tk.END)
            
            success, output, _ = self.run_command('git status --porcelain')
            if success and output:
                count = 0
                for line in output.strip().split('\n')[:10]:
                    if line.strip():
                        status = line[:2]
                        file_path = line[3:]
                        icon = {'M ': '📝', '??': '🆕', 'A ': '➕', 'D ': '🗑️'}.get(status, '📄')
                        short_name = file_path.split('/')[-1][:25]
                        self.status_text.insert(tk.END, f"{icon} {short_name}\n")
                        count += 1
                
                if count == 10:
                    self.status_text.insert(tk.END, "... (mais arquivos)")
                
                self.status_text.insert(tk.END, f"\n📊 Total: {len(output.strip().split(chr(10)))} arquivo(s)")
            else:
                self.status_text.insert(tk.END, "✅ Sem mudanças\n🎉 Repositório limpo!")
        except Exception as e:
            self.status_text.insert(tk.END, f"❌ Erro: {str(e)}")
    
    def load_forks(self):
        """Carrega lista de forks"""
        try:
            self.forks_data = []
            
            current_success, current_output, _ = self.run_command('git branch --show-current')
            current_branch = current_output.strip() if current_success else None
            is_detached = not current_branch
            
            if is_detached:
                commit_success, commit_output, _ = self.run_command('git log -1 --format="%h|%ad|%at" --date=format:"%d/%m %H:%M"')
                if commit_success and commit_output.strip():
                    parts = commit_output.strip().split('|')
                    if len(parts) >= 3:
                        hash_short = parts[0]
                        commit_date = parts[1]
                        timestamp = int(parts[2]) if parts[2].isdigit() else 0
                        
                        self.forks_data.append({
                            'status_icon': '🔴',
                            'status': '🔴 Detached',
                            'name': f"HEAD detached at {hash_short}",
                            'date': commit_date,
                            'timestamp': timestamp,
                            'tag': f"detached-{hash_short}"
                        })
                
                self.detached_button.pack(side=tk.LEFT, padx=3)
            else:
                self.detached_button.pack_forget()
            
            success, output, _ = self.run_command('git for-each-ref --format="%(refname:short)|%(committerdate:format:%d/%m %H:%M)|%(committerdate:unix)" refs/heads/')
            
            if success and output:
                for line in output.strip().split('\n'):
                    if line and '|' in line:
                        parts = line.split('|')
                        if len(parts) >= 3:
                            branch_name = parts[0]
                            date_formatted = parts[1]
                            date_unix = int(parts[2]) if parts[2].isdigit() else 0
                            
                            if current_branch == branch_name:
                                status_icon = '🌟'
                                status = '🌟 Atual'
                            else:
                                status_icon = '🔀'
                                status = '🔀 Fork'
                            
                            self.forks_data.append({
                                'status_icon': status_icon,
                                'status': status,
                                'name': branch_name,
                                'date': date_formatted,
                                'timestamp': date_unix,
                                'tag': branch_name
                            })
            
            if not self.forks_data:
                now = datetime.datetime.now()
                self.forks_data.append({
                    'status_icon': '🌟',
                    'status': '🌟 Atual',
                    'name': 'main',
                    'date': now.strftime('%d/%m %H:%M'),
                    'timestamp': int(now.timestamp()),
                    'tag': 'main'
                })
            
            if not self.forks_sort_column:
                priority = {'🌟': 1, '🔴': 2, '🔀': 3}
                self.forks_data.sort(key=lambda x: priority.get(x.get('status_icon', '🔀'), 3))
            
            self.display_forks()
        except Exception as e:
            print(f"Erro ao carregar forks: {e}")
    
    def display_forks(self):
        """Exibe forks na tabela"""
        for item in self.forks_tree.get_children():
            self.forks_tree.delete(item)
        
        for fork in self.forks_data:
            self.forks_tree.insert('', tk.END, values=(fork['status'], fork['name'], fork['date']), tags=(fork['tag'],))
    
    # ==================== AÇÕES DE VERSÃO ====================
    
    def save_version(self):
        """Salva nova versão"""
        message = self.message_entry.get().strip()
        if not message:
            messagebox.showwarning("Aviso", "Digite uma descrição!")
            return
        
        success, status_output, _ = self.run_command('git status --porcelain')
        has_changes = success and status_output.strip()
        
        confirm_msg = f"Salvar versão: {message}"
        if not has_changes:
            confirm_msg += "\n\n⚠️ Sem alterações (versão vazia)"
        
        if not messagebox.askyesno("Confirmar", confirm_msg):
            return
        
        self.run_command('git add .')
        success, _, error = self.run_command(f'git commit -m "{message}" --allow-empty')
        
        if success:
            messagebox.showinfo("Sucesso", "✅ Versão salva!")
            self.message_entry.delete(0, tk.END)
            self.refresh_all()
        else:
            messagebox.showerror("Erro", f"❌ Erro: {error}")
    
    def restore_version(self):
        """Restaura versão selecionada"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        
        if not commit_hash:
            return
        
        choice = messagebox.askyesnocancel(
            "Restaurar",
            "SIM: Criar fork desta versão\nNÃO: Apenas visualizar (detached)"
        )
        
        if choice is None:
            return
        elif choice:
            fork_name = simpledialog.askstring("Nome do Fork", "Nome:", 
                                              initialvalue=f"restore_{datetime.datetime.now().strftime('%m%d_%H%M')}")
            if fork_name:
                success, _, error = self.run_command(f'git checkout -b {fork_name} {commit_hash}')
                if success:
                    messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!")
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", error)
        else:
            success, _, error = self.run_command(f'git checkout {commit_hash}')
            if success:
                messagebox.showinfo("Sucesso", "✅ Versão restaurada (visualização)")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    def rename_version(self):
        """Renomeia versão usando tags"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        current_message = item['values'][1] if len(item['values']) > 1 else ""
        
        if not commit_hash:
            return
        
        tag_success, tag_output, _ = self.run_command(f'git tag --points-at {commit_hash}')
        current_tag = tag_output.strip().split('\n')[0] if tag_success and tag_output.strip() else None
        
        new_name = simpledialog.askstring("Renomear", "Novo nome:", 
                                         initialvalue=current_tag or current_message.replace('🏷️ ', ''))
        
        if not new_name:
            return
        
        clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', new_name.strip())
        
        try:
            if current_tag:
                self.run_command(f'git tag -d {current_tag}')
            
            success, _, error = self.run_command(f'git tag {clean_name} {commit_hash}')
            if success:
                messagebox.showinfo("Sucesso", f"✅ Renomeado para '{clean_name}'!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
        except Exception as e:
            messagebox.showerror("Erro", str(e))
    
    def create_fork_from_version(self):
        """Cria fork da versão selecionada"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        
        fork_name = simpledialog.askstring("Fork", "Nome do fork:", 
                                          initialvalue=f"fork_{datetime.datetime.now().strftime('%m%d_%H%M')}")
        
        if fork_name and commit_hash:
            success, _, error = self.run_command(f'git checkout -b {fork_name} {commit_hash}')
            if success:
                messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    # ==================== AÇÕES DE FORK ====================
    
    def create_new_fork(self):
        """Cria novo fork"""
        fork_name = simpledialog.askstring("Novo Fork", "Nome:", 
                                          initialvalue=f"fork_{datetime.datetime.now().strftime('%m%d_%H%M')}")
        
        if fork_name:
            success, _, error = self.run_command(f'git checkout -b {fork_name}')
            if success:
                messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    def switch_fork(self):
        """Muda para fork selecionado"""
        selection = self.forks_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um fork!")
            return
        
        item = self.forks_tree.item(selection[0])
        fork_name = item['tags'][0] if item['tags'] else None
        
        if fork_name:
            success, _, error = self.run_command(f'git checkout {fork_name}')
            if success:
                messagebox.showinfo("Sucesso", f"✅ Mudou para '{fork_name}'!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    def rename_fork(self):
        """Renomeia fork selecionado"""
        selection = self.forks_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um fork!")
            return
        
        item = self.forks_tree.item(selection[0])
        old_name = item['tags'][0] if item['tags'] else None
        
        if old_name in ['main', 'master']:
            messagebox.showwarning("Aviso", "❌ Não é possível renomear branch principal!")
            return
        
        new_name = simpledialog.askstring("Renomear Fork", "Novo nome:", initialvalue=old_name)
        
        if new_name and new_name != old_name:
            success, _, error = self.run_command(f'git branch -m {old_name} {new_name}')
            if success:
                messagebox.showinfo("Sucesso", f"✅ Fork renomeado para '{new_name}'!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    def delete_fork(self):
        """Exclui fork selecionado"""
        selection = self.forks_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um fork!")
            return
        
        item = self.forks_tree.item(selection[0])
        fork_name = item['tags'][0] if item['tags'] else None
        status = item['values'][0] if item['values'] else ""
        
        if fork_name in ['main', 'master'] or "🌟" in status:
            messagebox.showwarning("Aviso", "❌ Não é possível excluir branch principal ou atual!")
            return
        
        if messagebox.askyesno("Confirmar", f"Excluir fork '{fork_name}'?\n\n⚠️ Não pode ser desfeito!"):
            success, _, error = self.run_command(f'git branch -D {fork_name}')
            if success:
                messagebox.showinfo("Sucesso", "✅ Fork excluído!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    def exit_detached_head(self):
        """Sai do estado HEAD detached"""
        choice = messagebox.askyesnocancel(
            "Sair do Detached",
            "SIM: Criar fork da posição atual\nNÃO: Voltar para main/master"
        )
        
        if choice is None:
            return
        elif choice:
            fork_name = simpledialog.askstring("Nome do Fork", "Nome:", 
                                              initialvalue=f"detached_save_{datetime.datetime.now().strftime('%m%d_%H%M')}")
            if fork_name:
                success, _, error = self.run_command(f'git checkout -b {fork_name}')
                if success:
                    messagebox.showinfo("Sucesso", f"✅ Fork '{fork_name}' criado!")
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", error)
        else:
            success, branches_output, _ = self.run_command('git branch')
            main_branch = 'main'
            if success and 'master' in branches_output:
                main_branch = 'master'
            
            success, _, error = self.run_command(f'git checkout {main_branch}')
            if success:
                messagebox.showinfo("Sucesso", f"✅ Voltou para '{main_branch}'!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", error)
    
    # ==================== STASH ====================
    
    def manage_stash(self):
        """Gerenciar stash - versão simplificada"""
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
            for item in stash_tree.get_children():
                stash_tree.delete(item)
            
            success, output, _ = self.run_command('git stash list')
            if success and output.strip():
                for line in output.strip().split('\n'):
                    if line.strip():
                        parts = line.split(': ', 2)
                        if len(parts) >= 2:
                            index = parts[0]
                            message = parts[1] if len(parts) == 2 else parts[2]
                            stash_tree.insert('', tk.END, values=(index, message))
            else:
                stash_tree.insert('', tk.END, values=("", "Nenhum stash encontrado"))
        
        def apply_stash():
            selection = stash_tree.selection()
            if not selection:
                messagebox.showwarning("Aviso", "Selecione um stash!")
                return
            
            item = stash_tree.item(selection[0])
            stash_index = item['values'][0] if item['values'] else None
            
            if not stash_index or stash_index == "":
                return
            
            if messagebox.askyesno("Confirmar", f"Aplicar {stash_index}?"):
                success, _, error = self.run_command(f'git stash apply {stash_index}')
                if success:
                    messagebox.showinfo("Sucesso", "✅ Stash aplicado!")
                    load_stashes()
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", error)
        
        def create_stash():
            message = simpledialog.askstring("Criar Stash", "Mensagem:", initialvalue="Mudanças temporárias")
            if message:
                success, _, error = self.run_command(f'git stash push -m "{message}"')
                if success:
                    messagebox.showinfo("Sucesso", "✅ Stash criado!")
                    load_stashes()
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", error)
        
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill='x', pady=(10, 0))
        
        ttk.Button(buttons_frame, text="💾 Criar", command=create_stash).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="✅ Aplicar", command=apply_stash).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="🔄 Atualizar", command=load_stashes).pack(side=tk.LEFT, padx=5)
        ttk.Button(buttons_frame, text="❌ Fechar", command=stash_window.destroy).pack(side=tk.RIGHT)
        
        load_stashes()
    
    # ==================== MÉTODOS AUXILIARES ====================
    
    def start_project(self):
        """Inicia o projeto Next.js"""
        package_json = os.path.join(self.project_path, 'package.json')
        if not os.path.exists(package_json):
            messagebox.showerror("Erro", "Arquivo package.json não encontrado!")
            return

        def kill_node_processes():
            """Termina todos os processos Node.js em execução"""
            try:
                result = subprocess.run(
                    ['taskkill', '/F', '/IM', 'node.exe'],
                    capture_output=True,
                    text=True
                )
                return True, f"Processos Node.js terminados: {result.stdout}"
            except Exception as e:
                return False, f"Erro ao terminar processos Node.js: {str(e)}"

        def start_in_background():
            kill_success, kill_message = kill_node_processes()
            if kill_success:
                print(f"✅ {kill_message}")
            else:
                print(f"⚠️ {kill_message}")
            
            import time
            time.sleep(2)
            
            commands = ['npm run dev', 'yarn dev', 'pnpm dev']
            for cmd in commands:
                try:
                    manager = cmd.split()[0]
                    check_result = subprocess.run(f'{manager} --version', shell=True, capture_output=True)
                    if check_result.returncode == 0:
                        subprocess.Popen(
                            cmd,
                            shell=True,
                            cwd=self.project_path,
                            creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
                        )
                        return True, cmd
                except:
                    continue
            return False, "Nenhum gerenciador de pacotes encontrado"

        def run_start():
            success, result = start_in_background()
            if success:
                self.root.after(0, lambda: messagebox.showinfo("Sucesso", f"Sistemas Node.js anteriores terminados.\nProjeto iniciado com: {result}"))
                self.root.after(3000, self.open_browser)
            else:
                self.root.after(0, lambda: messagebox.showerror("Erro", result))

        threading.Thread(target=run_start, daemon=True).start()
    
    def open_browser(self):
        """Abre o projeto no navegador"""
        try:
            webbrowser.open("http://localhost:3000")
            self.log_deploy_message("Abrindo navegador...", "INFO")
        except Exception as e:
            self.log_deploy_message(f"Erro ao abrir navegador: {e}", "ERROR")
    
    def sync_repository(self):
        """Sincroniza repositório (git pull/push)"""
        if messagebox.askyesno("Sync", "Sincronizar com repositório remoto?"):
            self.log_deploy_message("Sincronizando...", "INFO")
            
            # Verificar se existe remote
            success, output, _ = self.run_command("git remote")
            if not success or not output.strip():
                self.log_deploy_message("Nenhum remote configurado", "WARNING")
                return
            
            # Pull primeiro
            success, _, error = self.run_command("git pull")
            if success:
                self.log_deploy_message("Pull realizado!", "SUCCESS")
                
                # Push depois
                success, _, error = self.run_command("git push")
                if success:
                    self.log_deploy_message("Push realizado!", "SUCCESS")
                else:
                    self.log_deploy_message(f"Erro no push: {error}", "ERROR")
            else:
                self.log_deploy_message(f"Erro no pull: {error}", "ERROR")
            
            self.refresh_all()
    
    def run_vercel_command(self, command, show_output=True):
        """Executa comando do Vercel"""
        try:
            os.chdir(self.project_path)
            result = subprocess.run(command, shell=True, capture_output=True, text=True, encoding='utf-8')
            
            if show_output:
                if result.stdout.strip():
                    self.log_deploy_message(result.stdout.strip(), "INFO")
                if result.stderr.strip():
                    self.log_deploy_message(result.stderr.strip(), "WARNING")
            
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            if show_output:
                self.log_deploy_message(f"Erro na execução: {e}", "ERROR")
            return False, "", str(e)
    
    def log_deploy_message(self, message, level="INFO"):
        """Adiciona mensagem ao log de deploy"""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        
        color_map = {
            "INFO": "",
            "SUCCESS": "green",
            "WARNING": "orange", 
            "ERROR": "red"
        }
        
        icon_map = {
            "INFO": "ℹ️",
            "SUCCESS": "✅", 
            "WARNING": "⚠️",
            "ERROR": "❌"
        }
        
        formatted_message = f"[{timestamp}] {icon_map.get(level, 'ℹ️')} {message}\n"
        
        self.deploy_log.insert(tk.END, formatted_message)
        
        if level in color_map and color_map[level]:
            start_line = self.deploy_log.index(tk.END + "-1l linestart")
            end_line = self.deploy_log.index(tk.END + "-1l lineend")
            self.deploy_log.tag_add(level, start_line, end_line)
            self.deploy_log.tag_config(level, foreground=color_map[level])
        
        self.deploy_log.see(tk.END)
        self.deploy_log.update_idletasks()
    
    # ==================== VERCEL METHODS ====================
    
    def check_vercel_cli_installed(self):
        """Verifica se Vercel CLI está instalado"""
        success, _, _ = self.run_vercel_command("vercel --version", show_output=False)
        return success
    
    def vercel_login(self):
        """Login no Vercel"""
        if not self.check_vercel_cli_installed():
            if messagebox.askyesno("Instalar Vercel CLI", "Vercel CLI não encontrado. Instalar?"):
                self.log_deploy_message("Instalando Vercel CLI...", "INFO")
                success, _, _ = self.run_vercel_command("npm install -g vercel")
                if not success:
                    self.log_deploy_message("Falha na instalação", "ERROR")
                    return
            else:
                return
        
        choice = messagebox.askyesno("Login", "GitHub OAuth (Sim) ou Email (Não)?")
        command = "vercel login --github" if choice else "vercel login"
        
        self.log_deploy_message("Iniciando login...", "INFO")
        
        def login_thread():
            success, output, error = self.run_vercel_command(command)
            if success:
                self.root.after(0, lambda: self.log_deploy_message("Login realizado!", "SUCCESS"))
                self.root.after(0, self.check_vercel_status)
            else:
                self.root.after(0, lambda: self.log_deploy_message(f"Erro: {error}", "ERROR"))
        
        threading.Thread(target=login_thread, daemon=True).start()
    
    def vercel_logout(self):
        """Logout do Vercel"""
        if messagebox.askyesno("Logout", "Fazer logout do Vercel?"):
            success, _, _ = self.run_vercel_command("vercel logout")
            if success:
                self.log_deploy_message("Logout realizado!", "SUCCESS")
                self.login_status_label.config(text="❌ Não logado")
                self.preview_url_var.set("")
                self.production_url_var.set("")
            else:
                self.log_deploy_message("Erro ao fazer logout", "ERROR")
    
    def check_vercel_status(self):
        """Verifica status Vercel"""
        if not self.check_vercel_cli_installed():
            self.login_status_label.config(text="❌ CLI não instalado")
            return
        
        success, output, _ = self.run_vercel_command("vercel whoami", show_output=False)
        if success and output.strip():
            username = output.strip()
            self.login_status_label.config(text=f"✅ {username}")
        else:
            self.login_status_label.config(text="❌ Não logado")
    
    def check_project_setup(self):
        """Verifica configuração do projeto"""
        self.log_deploy_message("Verificando projeto...", "INFO")
        
        package_json = os.path.join(self.project_path, 'package.json')
        if not os.path.exists(package_json):
            self.log_deploy_message("❌ package.json não encontrado!", "ERROR")
            return False
        
        try:
            with open(package_json, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
                dependencies = package_data.get('dependencies', {})
                dev_dependencies = package_data.get('devDependencies', {})
                
                if 'next' in dependencies or 'next' in dev_dependencies:
                    self.log_deploy_message("✅ Projeto Next.js detectado", "SUCCESS")
                else:
                    self.log_deploy_message("⚠️ Next.js não detectado", "WARNING")
                
                scripts = package_data.get('scripts', {})
                if 'build' in scripts:
                    self.log_deploy_message(f"✅ Script build: {scripts['build']}", "SUCCESS")
                else:
                    self.log_deploy_message("⚠️ Script build não encontrado", "WARNING")
        except Exception as e:
            self.log_deploy_message(f"Erro ao ler package.json: {e}", "ERROR")
            return False
        
        self.log_deploy_message("Verificação concluída!", "SUCCESS")
        return True
    
    def deploy_preview(self):
        """Deploy de preview"""
        if not self.check_project_setup():
            return
        
        self.log_deploy_message("Iniciando deploy preview...", "INFO")
        
        def deploy_thread():
            command = "vercel"
            if self.project_name_var.get().strip():
                command += f" --name {self.project_name_var.get().strip()}"
            
            success, output, error = self.run_vercel_command(command)
            
            if success:
                lines = output.split('\n')
                for line in lines:
                    if 'https://' in line and 'vercel.app' in line:
                        url = line.strip()
                        self.root.after(0, lambda: self.preview_url_var.set(url))
                        self.root.after(0, lambda: self.log_deploy_message(f"Preview: {url}", "SUCCESS"))
                        break
                else:
                    self.root.after(0, lambda: self.log_deploy_message("Deploy concluído", "SUCCESS"))
            else:
                self.root.after(0, lambda: self.log_deploy_message(f"Erro: {error}", "ERROR"))
        
        threading.Thread(target=deploy_thread, daemon=True).start()
    
    def deploy_production(self):
        """Deploy de produção"""
        if not messagebox.askyesno("Deploy Produção", "Confirmar deploy para produção?"):
            return
        
        if not self.check_project_setup():
            return
        
        self.log_deploy_message("Iniciando deploy produção...", "INFO")
        
        def deploy_thread():
            command = "vercel --prod"
            if self.project_name_var.get().strip():
                command += f" --name {self.project_name_var.get().strip()}"
            
            success, output, error = self.run_vercel_command(command)
            
            if success:
                lines = output.split('\n')
                for line in lines:
                    if 'https://' in line and ('vercel.app' in line or self.project_name_var.get() in line):
                        url = line.strip()
                        self.root.after(0, lambda: self.production_url_var.set(url))
                        self.root.after(0, lambda: self.log_deploy_message(f"Produção: {url}", "SUCCESS"))
                        break
                else:
                    self.root.after(0, lambda: self.log_deploy_message("Deploy produção concluído", "SUCCESS"))
            else:
                self.root.after(0, lambda: self.log_deploy_message(f"Erro: {error}", "ERROR"))
        
        threading.Thread(target=deploy_thread, daemon=True).start()
    
    def list_deployments(self):
        """Lista deployments"""
        self.log_deploy_message("Listando deployments...", "INFO")
        
        success, output, error = self.run_vercel_command("vercel ls")
        if success:
            self.log_deploy_message("Deployments:", "SUCCESS")
            lines = output.split('\n')[:8]
            for line in lines:
                if line.strip():
                    self.log_deploy_message(line.strip(), "INFO")
        else:
            self.log_deploy_message(f"Erro: {error}", "ERROR")
    
    def open_url(self, url):
        """Abre URL no navegador"""
        if url and url.strip():
            try:
                webbrowser.open(url.strip())
                self.log_deploy_message(f"Abrindo: {url}", "INFO")
            except Exception as e:
                self.log_deploy_message(f"Erro ao abrir: {e}", "ERROR")
        else:
            messagebox.showwarning("Aviso", "URL não disponível!")
    
    # ==================== INICIALIZAÇÃO ====================
    
    def run(self):
        """Inicia aplicação"""
        if not os.path.exists(os.path.join(self.project_path, '.git')):
            if messagebox.askyesno("Git", "Inicializar repositório Git?"):
                success, _, error = self.run_command('git init')
                if success:
                    self.run_command('git config user.name "Usuario"')
                    self.run_command('git config user.email "usuario@local"')
                    messagebox.showinfo("Sucesso", "✅ Git inicializado!")
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", f"Erro: {error}")
        
        self.root.mainloop()

def main():
    """Função principal"""
    try:
        app = VersionControlUnified()
        app.run()
    except Exception as e:
        import tkinter.messagebox as mb
        mb.showerror("Erro Fatal", f"❌ Erro ao iniciar aplicação:\n\n{e}")

if __name__ == "__main__":
    main()

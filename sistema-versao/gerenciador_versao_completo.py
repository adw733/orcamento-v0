#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Controle de Versões - Orçamento v0
Baseado no sistema original do orcamento_v0
Com funcionalidades para salvar versões e criar/editar forks
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, scrolledtext, filedialog
import subprocess
import os
import json
import datetime
import threading
import webbrowser

class VersionControlGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🚀 Controle de Versões - Orçamento v0")
        self.root.geometry("1200x800")
        
        # Detectar caminho do projeto
        self.project_path = os.path.dirname(os.path.dirname(__file__))
        
        self.setup_interface()
        
    def setup_interface(self):
        """Cria a interface principal"""
        # Configurar grid da janela principal
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configurar grid do frame principal
        main_frame.columnconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # Título
        title_label = ttk.Label(main_frame, text="🚀 Controle de Versões - Orçamento v0", font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # Criar notebook para abas
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        
        # Aba de Controle de Versões
        version_tab = ttk.Frame(self.notebook)
        self.notebook.add(version_tab, text="📦 Controle de Versões")
        self.setup_version_tab(version_tab)
        
        # Aba de Deploy Vercel
        deploy_tab = ttk.Frame(self.notebook)
        self.notebook.add(deploy_tab, text="🚀 Deploy Vercel")
        self.setup_deploy_tab(deploy_tab)
        
        # Carregar dados iniciais após a interface estar pronta
        self.root.after(100, self.refresh_all)
        
    def setup_version_tab(self, parent):
        """Configura a aba de controle de versões"""
        # Frame esquerdo - Versões Salvas
        versions_frame = ttk.LabelFrame(parent, text="📦 Versões Salvas", padding="10")
        versions_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Lista de versões
        self.versions_tree = ttk.Treeview(versions_frame, columns=('date', 'message'), show='headings', height=15)
        self.versions_tree.heading('#1', text='Data/Hora')
        self.versions_tree.heading('#2', text='Descrição')
        self.versions_tree.column('#1', width=120)
        self.versions_tree.column('#2', width=300)
        self.versions_tree.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Botões para versões
        version_buttons = ttk.Frame(versions_frame)
        version_buttons.pack(fill=tk.X)
        
        ttk.Button(version_buttons, text="⏪ Voltar para esta versão", 
                  command=self.restore_version).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(version_buttons, text="🔀 Criar Fork desta versão", 
                  command=self.create_fork_from_version).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(version_buttons, text="✏️ Renomear Versão", 
                  command=self.rename_version).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(version_buttons, text="📦 Gerenciar Stash", 
                  command=self.manage_stash).pack(side=tk.LEFT)
        
        # Frame direito superior - Salvar Versão
        right_frame = ttk.Frame(parent)
        right_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        save_frame = ttk.LabelFrame(right_frame, text="💾 Salvar Nova Versão", padding="10")
        save_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Status de arquivos
        ttk.Label(save_frame, text="📄 Arquivos Modificados:").pack(anchor=tk.W)
        self.status_text = scrolledtext.ScrolledText(save_frame, height=6)
        self.status_text.pack(fill=tk.X, pady=(5, 10))
        
        # Campo de mensagem
        ttk.Label(save_frame, text="📝 Descrição das mudanças:").pack(anchor=tk.W)
        self.message_entry = ttk.Entry(save_frame, width=50)
        self.message_entry.pack(fill=tk.X, pady=(5, 5))
        
        # Hint para versões vazias
        hint_label = ttk.Label(save_frame, text="💡 Dica: Você pode criar versões mesmo sem alterações", 
                              font=('Arial', 8), foreground='gray')
        hint_label.pack(anchor=tk.W, pady=(0, 10))
        
        # Botão salvar
        ttk.Button(save_frame, text="💾 Salvar Versão", 
                  command=self.save_version).pack()
        
        # Frame direito inferior - Forks
        forks_frame = ttk.LabelFrame(right_frame, text="🔀 Criar e Editar Forks", padding="10")
        forks_frame.pack(fill=tk.BOTH, expand=True)
        
        # Lista de forks
        self.forks_tree = ttk.Treeview(forks_frame, columns=('status', 'name', 'date'), show='headings', height=8)
        self.forks_tree.heading('#1', text='Status')
        self.forks_tree.heading('#2', text='Nome do Fork')
        self.forks_tree.heading('#3', text='Criado em')
        self.forks_tree.column('#1', width=80)
        self.forks_tree.column('#2', width=150)
        self.forks_tree.column('#3', width=120)
        self.forks_tree.pack(fill=tk.X, pady=(0, 10))
        
        # Botões para forks
        fork_buttons = ttk.Frame(forks_frame)
        fork_buttons.pack(fill=tk.X)
        
        ttk.Button(fork_buttons, text="🔀 Criar Novo Fork", 
                  command=self.create_new_fork).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(fork_buttons, text="↩️ Mudar para Fork", 
                  command=self.switch_fork).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(fork_buttons, text="✏️ Renomear Fork", 
                  command=self.rename_fork).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(fork_buttons, text="🗑️ Excluir Fork", 
                  command=self.delete_fork).pack(side=tk.LEFT, padx=(0, 5))
        
        # Botão especial para sair do HEAD detached
        self.detached_button = ttk.Button(fork_buttons, text="🆘 Sair do Detached", 
                  command=self.exit_detached_head)
        # O botão será mostrado apenas quando necessário
        
        # Configurações na parte inferior
        config_frame = ttk.Frame(forks_frame)
        config_frame.pack(fill=tk.X, pady=(20, 0))
        
        ttk.Button(config_frame, text="🔄 Atualizar", 
                  command=self.refresh_all).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(config_frame, text="📥 Sincronizar", 
                  command=self.sync_repository).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(config_frame, text="🚀 Iniciar Projeto", 
                  command=self.start_project).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(config_frame, text="🌐 Abrir Navegador", 
                  command=self.open_browser).pack(side=tk.LEFT)
        
        # Configurar grid da aba
        parent.columnconfigure(0, weight=2)  # Versões salvas (mais espaço)
        parent.columnconfigure(1, weight=1)  # Ações e forks
        parent.rowconfigure(0, weight=1)
    
    def setup_deploy_tab(self, parent):
        """Configura a aba de deploy no Vercel"""
        # Frame principal com padding
        main_deploy_frame = ttk.Frame(parent, padding="10")
        main_deploy_frame.pack(fill=tk.BOTH, expand=True)
        
        # Frame superior - Status e Login
        status_frame = ttk.LabelFrame(main_deploy_frame, text="🔐 Status de Autenticação", padding="10")
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Status do login
        self.login_status_label = ttk.Label(status_frame, text="❌ Não logado no Vercel", font=('Arial', 10, 'bold'))
        self.login_status_label.pack(anchor=tk.W, pady=(0, 10))
        
        # Botões de autenticação
        auth_buttons = ttk.Frame(status_frame)
        auth_buttons.pack(fill=tk.X)
        
        ttk.Button(auth_buttons, text="🔑 Login no Vercel", 
                  command=self.vercel_login).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(auth_buttons, text="🔍 Verificar Status", 
                  command=self.check_vercel_status).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(auth_buttons, text="🚪 Logout", 
                  command=self.vercel_logout).pack(side=tk.LEFT)
        
        # Frame do meio - Configurações do Projeto
        config_frame = ttk.LabelFrame(main_deploy_frame, text="⚙️ Configurações do Projeto", padding="10")
        config_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Nome do projeto
        ttk.Label(config_frame, text="📝 Nome do Projeto:").pack(anchor=tk.W)
        self.project_name_var = tk.StringVar(value="orcamento-sistema")
        self.project_name_entry = ttk.Entry(config_frame, textvariable=self.project_name_var, width=50)
        self.project_name_entry.pack(fill=tk.X, pady=(5, 10))
        
        # Configurações de build
        build_frame = ttk.Frame(config_frame)
        build_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(build_frame, text="🔧 Comando de Build:").pack(anchor=tk.W)
        self.build_command_var = tk.StringVar(value="npm run build")
        build_entry = ttk.Entry(build_frame, textvariable=self.build_command_var, width=30)
        build_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        
        ttk.Label(build_frame, text="📁 Diretório de Output:").pack(side=tk.LEFT, padx=(10, 5))
        self.output_dir_var = tk.StringVar(value=".next")
        output_entry = ttk.Entry(build_frame, textvariable=self.output_dir_var, width=15)
        output_entry.pack(side=tk.LEFT)
        
        # Ambiente de deploy
        env_frame = ttk.Frame(config_frame)
        env_frame.pack(fill=tk.X)
        
        ttk.Label(env_frame, text="🌍 Ambiente:").pack(side=tk.LEFT, padx=(0, 5))
        self.deploy_env_var = tk.StringVar(value="preview")
        env_combo = ttk.Combobox(env_frame, textvariable=self.deploy_env_var, 
                                values=["preview", "production"], state="readonly", width=15)
        env_combo.pack(side=tk.LEFT, padx=(0, 10))
        
        # Checkbox para auto-assign domain
        self.auto_domain_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(env_frame, text="🌐 Auto-assign domain", 
                       variable=self.auto_domain_var).pack(side=tk.LEFT)
        
        # Frame de Deploy
        deploy_frame = ttk.LabelFrame(main_deploy_frame, text="🚀 Deploy", padding="10")
        deploy_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Botões de deploy
        deploy_buttons = ttk.Frame(deploy_frame)
        deploy_buttons.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Button(deploy_buttons, text="🔍 Verificar Projeto", 
                  command=self.check_project_setup).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(deploy_buttons, text="🚀 Deploy Preview", 
                  command=self.deploy_preview).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(deploy_buttons, text="🌟 Deploy Production", 
                  command=self.deploy_production).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(deploy_buttons, text="📋 Listar Deployments", 
                  command=self.list_deployments).pack(side=tk.LEFT)
        
        # Log de deploy
        ttk.Label(deploy_frame, text="📄 Log de Deploy:").pack(anchor=tk.W)
        self.deploy_log = scrolledtext.ScrolledText(deploy_frame, height=12, wrap=tk.WORD)
        self.deploy_log.pack(fill=tk.BOTH, expand=True, pady=(5, 10))
        
        # Frame inferior - URLs e Links
        links_frame = ttk.LabelFrame(main_deploy_frame, text="🔗 Links e URLs", padding="10")
        links_frame.pack(fill=tk.X)
        
        # URLs dos deployments
        self.preview_url_var = tk.StringVar()
        self.production_url_var = tk.StringVar()
        
        url_frame = ttk.Frame(links_frame)
        url_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Preview URL
        ttk.Label(url_frame, text="🔍 Preview URL:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
        preview_entry = ttk.Entry(url_frame, textvariable=self.preview_url_var, state="readonly", width=50)
        preview_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(0, 5))
        ttk.Button(url_frame, text="🌐 Abrir", 
                  command=lambda: self.open_url(self.preview_url_var.get())).grid(row=0, column=2)
        
        # Production URL
        ttk.Label(url_frame, text="🌟 Production URL:").grid(row=1, column=0, sticky=tk.W, padx=(0, 5), pady=(5, 0))
        production_entry = ttk.Entry(url_frame, textvariable=self.production_url_var, state="readonly", width=50)
        production_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=(0, 5), pady=(5, 0))
        ttk.Button(url_frame, text="🌐 Abrir", 
                  command=lambda: self.open_url(self.production_url_var.get())).grid(row=1, column=2, pady=(5, 0))
        
        url_frame.columnconfigure(1, weight=1)
        
        # Botões de utilidades
        utils_frame = ttk.Frame(links_frame)
        utils_frame.pack(fill=tk.X)
        
        ttk.Button(utils_frame, text="📊 Dashboard Vercel", 
                  command=lambda: self.open_url("https://vercel.com/dashboard")).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(utils_frame, text="📚 Documentação", 
                  command=lambda: self.open_url("https://vercel.com/docs")).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(utils_frame, text="🔄 Atualizar Status", 
                  command=self.refresh_deploy_status).pack(side=tk.LEFT)
        
        # Verificar status inicial
        self.root.after(1000, self.check_vercel_status)
    
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
            if hasattr(self, 'versions_tree'):
                self.load_versions()
            if hasattr(self, 'status_text'):
                self.load_status()
            if hasattr(self, 'forks_tree'):
                self.load_forks()
        except Exception as e:
            print(f"Erro ao atualizar interface: {e}")
    
    def load_versions(self):
        """Carrega lista de versões (commits)"""
        try:
            # Limpar lista
            for item in self.versions_tree.get_children():
                self.versions_tree.delete(item)
            
            # Buscar commits com formato de data/hora mais limpo
            success, output, _ = self.run_command('git log --oneline --date=format:"%d/%m/%Y %H:%M" --pretty=format:"%h|%ad|%s" -20')
            if success and output:
                for line in output.strip().split('\n'):
                    if '|' in line:
                        parts = line.split('|')
                        if len(parts) >= 3:
                            hash_short = parts[0]
                            date_time = parts[1]
                            message = parts[2]
                            
                            # Verificar se há tag (nome personalizado) para este commit
                            tag_success, tag_output, _ = self.run_command(f'git tag --points-at {hash_short}')
                            if tag_success and tag_output.strip():
                                # Usar o nome da tag se existir
                                tag_name = tag_output.strip().split('\n')[0]
                                display_message = f"🏷️ {tag_name}"
                            else:
                                display_message = message
                            
                            self.versions_tree.insert('', tk.END, values=(date_time, display_message), tags=(hash_short,))
            else:
                # Se não há commits, adicionar uma mensagem informativa
                self.versions_tree.insert('', tk.END, values=("", "Nenhuma versão salva ainda"), tags=("",))
        except Exception as e:
            print(f"Erro ao carregar versões: {e}")
    
    def load_status(self):
        """Carrega status dos arquivos modificados"""
        try:
            self.status_text.delete('1.0', tk.END)
            
            success, output, _ = self.run_command('git status --porcelain')
            if success and output:
                for line in output.strip().split('\n'):
                    if line.strip():
                        status = line[:2]
                        file_path = line[3:]
                        icon = {'M ': '📝', '??': '🆕', 'A ': '➕', 'D ': '🗑️'}.get(status, '📄')
                        self.status_text.insert(tk.END, f"{icon} {file_path}\n")
            else:
                self.status_text.insert(tk.END, "✅ Nenhuma mudança pendente")
        except Exception as e:
            print(f"Erro ao carregar status: {e}")
            self.status_text.insert(tk.END, "Erro ao carregar status dos arquivos")
    
    def load_forks(self):
        """Carrega lista de forks (branches)"""
        try:
            # Limpar lista
            for item in self.forks_tree.get_children():
                self.forks_tree.delete(item)
            
            # Buscar branch atual
            current_success, current_output, _ = self.run_command('git branch --show-current')
            current_branch = current_output.strip() if current_success else None
            
            # Verificar se está em HEAD detached
            is_detached = not current_branch
            
            # Carregar branches com informações detalhadas
            success, output, _ = self.run_command('git for-each-ref --format="%(refname:short)|%(committerdate:format:%d/%m/%Y %H:%M)|%(committerdate:unix)" refs/heads/')
            
            if success and output:
                branch_list = []
                for line in output.strip().split('\n'):
                    if line and '|' in line:
                        parts = line.split('|')
                        if len(parts) >= 3:
                            branch_name = parts[0]
                            date_formatted = parts[1]
                            date_unix = int(parts[2]) if parts[2].isdigit() else 0
                            
                            # Determinar status
                            if current_branch == branch_name:
                                status = "🌟 Atual"
                            else:
                                status = "🔀 Fork"
                            
                            branch_list.append((date_unix, status, branch_name, date_formatted))
                
                # Ordenar por data de criação (mais recente primeiro)
                branch_list.sort(key=lambda x: x[0], reverse=True)
                
                # Adicionar à lista
                for _, status, branch_name, date_formatted in branch_list:
                    self.forks_tree.insert('', tk.END, values=(status, branch_name, date_formatted), tags=(branch_name,))
            
            # Se está em HEAD detached, adicionar entrada especial
            if is_detached:
                # Buscar informações do commit atual
                commit_success, commit_output, _ = self.run_command('git log -1 --format="%h|%ad" --date=format:"%d/%m/%Y %H:%M"')
                if commit_success and commit_output.strip():
                    parts = commit_output.strip().split('|')
                    if len(parts) >= 2:
                        hash_short = parts[0]
                        commit_date = parts[1]
                        detached_name = f"(HEAD detached at {hash_short})"
                        # Inserir no topo da lista
                        self.forks_tree.insert('', 0, values=("🔴 Detached", detached_name, commit_date), tags=(detached_name,))
            
            # Se não há branches, criar entrada padrão
            if not success or not output:
                import datetime
                now = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
                self.forks_tree.insert('', tk.END, values=("🌟 Atual", "main", now), tags=("main",))
            
            # Mostrar/ocultar botão de sair do detached
            if hasattr(self, 'detached_button'):
                if is_detached:
                    self.detached_button.pack(side=tk.LEFT, padx=(5, 0))
                else:
                    self.detached_button.pack_forget()
                    
        except Exception as e:
            print(f"Erro ao carregar forks: {e}")
            # Fallback em caso de erro
            import datetime
            now = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
            self.forks_tree.insert('', tk.END, values=("❌ Erro", "Erro ao carregar", now), tags=("",))
    
    def save_version(self):
        """Salva uma nova versão"""
        message = self.message_entry.get().strip()
        if not message:
            messagebox.showwarning("Aviso", "Digite uma descrição para a versão!")
            return
        
        # Verificar se há mudanças
        success, status_output, _ = self.run_command('git status --porcelain')
        has_changes = success and status_output.strip()
        
        # Mensagem de confirmação diferente baseada se há mudanças
        if has_changes:
            confirm_msg = f"Salvar versão com as mudanças atuais?\n\nDescrição: {message}"
        else:
            confirm_msg = f"Salvar nova versão sem mudanças?\n\nDescrição: {message}\n\n⚠️ Não há alterações nos arquivos, mas a versão será criada mesmo assim."
        
        if not messagebox.askyesno("Confirmar", confirm_msg):
            return
        
        # Executar git add (sempre, mesmo sem mudanças)
        success1, _, add_error = self.run_command('git add .')
        
        # Executar commit com --allow-empty para permitir commits sem mudanças
        success2, commit_output, commit_error = self.run_command(f'git commit -m "{message}" --allow-empty')
        
        if success2:
            if has_changes:
                messagebox.showinfo("Sucesso", f"Versão '{message}' salva com sucesso!\n\n✅ Alterações commitadas")
            else:
                messagebox.showinfo("Sucesso", f"Versão '{message}' criada com sucesso!\n\n📋 Versão vazia (sem alterações)")
            
            self.message_entry.delete(0, tk.END)
            self.refresh_all()
        else:
            # Tratar diferentes tipos de erro
            if "nothing to commit" in commit_error:
                # Tentar novamente com --allow-empty explícito
                success3, _, error3 = self.run_command(f'git commit -m "{message}" --allow-empty --no-verify')
                if success3:
                    messagebox.showinfo("Sucesso", f"Versão '{message}' criada com sucesso!\n\n📋 Versão vazia (sem alterações)")
                    self.message_entry.delete(0, tk.END)
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", f"Erro ao criar versão: {error3}")
            else:
                messagebox.showerror("Erro", f"Erro ao salvar versão: {commit_error}")
    
    def restore_version(self):
        """Restaura uma versão selecionada"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão para restaurar!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        commit_message = item['values'][1] if len(item['values']) > 1 else "Versão selecionada"
        
        if not commit_hash:
            messagebox.showerror("Erro", "Erro ao obter hash do commit")
            return
        
        # Dar opções ao usuário
        choice = messagebox.askyesnocancel(
            "Restaurar Versão",
            f"Como deseja restaurar a versão: {commit_message}?\n\n"
            "• SIM: Criar novo fork a partir desta versão\n"
            "• NÃO: Apenas visualizar (HEAD detached)\n"
            "• CANCELAR: Cancelar operação"
        )
        
        if choice is None:  # Cancelar
            return
        elif choice:  # SIM - Criar novo fork
            # Pedir nome do fork
            fork_name = simpledialog.askstring(
                "Nome do Novo Fork",
                "Digite um nome para o novo fork:",
                initialvalue=f"restore_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}"
            )
            
            if not fork_name:
                return
            
            # Verificar se o nome já existe
            check_success, check_output, _ = self.run_command('git branch')
            if check_success and fork_name in check_output:
                if not messagebox.askyesno("Fork Existe", f"O fork '{fork_name}' já existe. Deseja substituí-lo?"):
                    return
                # Deletar branch existente
                self.run_command(f'git branch -D {fork_name}')
            
            # Criar novo branch a partir do commit
            success, _, error = self.run_command(f'git checkout -b {fork_name} {commit_hash}')
            if success:
                messagebox.showinfo("Sucesso", f"Novo fork '{fork_name}' criado e ativado a partir da versão selecionada!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", f"Erro ao criar fork: {error}")
        
        else:  # NÃO - Apenas visualizar
            # Verificar se há mudanças não commitadas
            success, status_output, _ = self.run_command('git status --porcelain')
            if success and status_output.strip():
                if not messagebox.askyesno(
                    "Mudanças Pendentes",
                    "Há mudanças não commitadas que serão perdidas.\n\nContinuar mesmo assim?"
                ):
                    return
            
            # Aviso sobre HEAD detached
            messagebox.showinfo(
                "Atenção", 
                "Você estará em modo 'HEAD detached'.\n\n"
                "Isso significa que você pode visualizar os arquivos desta versão, "
                "mas qualquer mudança feita poderá ser perdida.\n\n"
                "Para fazer alterações, é recomendado criar um novo fork."
            )
            
            # Fazer checkout direto
            success, _, error = self.run_command(f'git checkout {commit_hash}')
            if success:
                messagebox.showinfo("Sucesso", f"Versão restaurada!\n\n⚠️ Você está em modo visualização (HEAD detached)")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", f"Erro ao restaurar versão: {error}")
    
    def rename_version(self):
        """Renomeia uma versão selecionada usando tags"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão para renomear!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        current_message = item['values'][1] if len(item['values']) > 1 else ""
        
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
        
        # Pedir novo nome
        new_name = simpledialog.askstring(
            "Renomear Versão",
            f"Novo nome para a versão:\n\nNome atual: {current_display}",
            initialvalue=current_display
        )
        
        if not new_name or new_name.strip() == current_display:
            return
        
        new_name = new_name.strip()
        
        # Validar nome da tag (sem espaços e caracteres especiais)
        import re
        if not re.match(r'^[a-zA-Z0-9._-]+$', new_name):
            if messagebox.askyesno(
                "Nome Inválido", 
                f"O nome '{new_name}' contém caracteres especiais.\n\n"
                "Deseja usar uma versão limpa? (espaços viram underscores)"
            ):
                # Limpar nome
                clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', new_name)
                clean_name = re.sub(r'_+', '_', clean_name)  # Remove underscores duplos
                new_name = clean_name
            else:
                return
        
        try:
            # Remover tag antiga se existir
            if current_tag:
                self.run_command(f'git tag -d {current_tag}')
            
            # Criar nova tag
            success, output, error = self.run_command(f'git tag {new_name} {commit_hash}')
            
            if success:
                messagebox.showinfo("Sucesso", f"Versão renomeada para '{new_name}' com sucesso!")
                self.refresh_all()
            else:
                if "already exists" in error:
                    if messagebox.askyesno(
                        "Tag Existe", 
                        f"Já existe uma tag com o nome '{new_name}'.\n\nDeseja substituí-la?"
                    ):
                        # Forçar substituição
                        self.run_command(f'git tag -d {new_name}')  # Remove a existente
                        success2, _, error2 = self.run_command(f'git tag {new_name} {commit_hash}')
                        if success2:
                            messagebox.showinfo("Sucesso", f"Versão renomeada para '{new_name}' com sucesso!")
                            self.refresh_all()
                        else:
                            messagebox.showerror("Erro", f"Erro ao renomear: {error2}")
                else:
                    messagebox.showerror("Erro", f"Erro ao criar tag: {error}")
        
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao renomear versão: {e}")
    
    def create_fork_from_version(self):
        """Cria fork a partir da versão selecionada"""
        selection = self.versions_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione uma versão para criar o fork!")
            return
        
        item = self.versions_tree.item(selection[0])
        commit_hash = item['tags'][0] if item['tags'] else None
        
        # Pedir nome do fork
        fork_name = simpledialog.askstring(
            "Nome do Fork",
            "Digite um nome para o novo fork:",
            initialvalue=f"fork_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}"
        )
        
        if fork_name and commit_hash:
            success, _, error = self.run_command(f'git checkout -b {fork_name} {commit_hash}')
            if success:
                messagebox.showinfo("Sucesso", f"Fork '{fork_name}' criado com sucesso!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", f"Erro ao criar fork: {error}")
    
    def create_new_fork(self):
        """Cria um novo fork da versão atual"""
        fork_name = simpledialog.askstring(
            "Nome do Fork",
            "Digite um nome para o novo fork:",
            initialvalue=f"fork_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}"
        )
        
        if fork_name:
            success, _, error = self.run_command(f'git checkout -b {fork_name}')
            if success:
                messagebox.showinfo("Sucesso", f"Fork '{fork_name}' criado com sucesso!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", f"Erro ao criar fork: {error}")
    
    def switch_fork(self):
        """Muda para o fork selecionado"""
        selection = self.forks_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um fork para mudar!")
            return
        
        item = self.forks_tree.item(selection[0])
        fork_name = item['tags'][0] if item['tags'] else None
        
        if not fork_name:
            messagebox.showerror("Erro", "Erro ao obter nome do fork")
            return
        
        # Verificar se já está no fork selecionado
        current_success, current_output, _ = self.run_command('git branch --show-current')
        if current_success and current_output.strip() == fork_name:
            messagebox.showinfo("Informação", f"Você já está no fork '{fork_name}'!")
            return
        
        # Verificar se há mudanças não commitadas
        success, status_output, _ = self.run_command('git status --porcelain')
        if success and status_output.strip():
            # Há mudanças pendentes - dar opções ao usuário
            result = messagebox.askyesnocancel(
                "Mudanças Pendentes",
                f"Há mudanças não commitadas que podem ser perdidas ao mudar para '{fork_name}'.\n\n"
                "Escolha uma opção:\n\n"
                "• SIM: Salvar mudanças temporariamente (stash)\n"
                "• NÃO: Forçar mudança (perder mudanças)\n"
                "• CANCELAR: Cancelar operação"
            )
            
            if result is None:  # Cancelar
                return
            elif result:  # SIM - Fazer stash
                stash_success, stash_output, stash_error = self.run_command('git stash push -m "Auto-stash antes de mudar fork"')
                if not stash_success:
                    messagebox.showerror("Erro", f"Erro ao fazer stash: {stash_error}")
                    return
                messagebox.showinfo("Stash", "Mudanças salvas temporariamente (stash).\nUse 'git stash pop' para recuperá-las depois.")
            else:  # NÃO - Forçar checkout
                # Resetar mudanças locais
                reset_success, _, reset_error = self.run_command('git reset --hard')
                if not reset_success:
                    messagebox.showerror("Erro", f"Erro ao resetar mudanças: {reset_error}")
                    return
                # Limpar arquivos não rastreados
                self.run_command('git clean -fd')
        
        # Tentar fazer checkout
        success, output, error = self.run_command(f'git checkout {fork_name}')
        
        if success:
            messagebox.showinfo("Sucesso", f"Mudou para o fork '{fork_name}'!")
            self.refresh_all()
        else:
            # Se ainda há erro, tentar checkout forçado
            if "would be overwritten" in error or "untracked working tree files" in error:
                force_result = messagebox.askyesno(
                    "Forçar Mudança?",
                    f"Erro ao mudar fork: {error}\n\n"
                    "Deseja forçar a mudança? Isso pode sobrescrever arquivos locais."
                )
                
                if force_result:
                    # Limpar tudo e forçar checkout
                    self.run_command('git clean -fd')
                    self.run_command('git reset --hard')
                    force_success, _, force_error = self.run_command(f'git checkout -f {fork_name}')
                    
                    if force_success:
                        messagebox.showinfo("Sucesso", f"Fork '{fork_name}' ativado com sucesso!")
                        self.refresh_all()
                    else:
                        messagebox.showerror("Erro", f"Erro ao forçar mudança: {force_error}")
            else:
                messagebox.showerror("Erro", f"Erro ao mudar fork: {error}")
    
    def rename_fork(self):
        """Renomeia o fork selecionado"""
        selection = self.forks_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um fork para renomear!")
            return
        
        item = self.forks_tree.item(selection[0])
        old_name = item['tags'][0] if item['tags'] else None
        
        if old_name in ['main', 'master']:
            messagebox.showwarning("Aviso", "Não é possível renomear a branch principal!")
            return
        
        # Criar janela de diálogo personalizada
        rename_window = tk.Toplevel(self.root)
        rename_window.title("✏️ Renomear Fork")
        rename_window.geometry("450x200")
        rename_window.transient(self.root)
        rename_window.grab_set()
        
        # Frame principal
        main_frame = ttk.Frame(rename_window, padding="15")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        ttk.Label(main_frame, text=f"Renomear fork: {old_name}", 
                 font=('Arial', 12, 'bold')).pack(pady=(0, 15))
        
        # Campo de entrada
        ttk.Label(main_frame, text="Novo nome:").pack(anchor=tk.W)
        entry_var = tk.StringVar(value=old_name)
        name_entry = ttk.Entry(main_frame, textvariable=entry_var, width=40)
        name_entry.pack(fill=tk.X, pady=(5, 15))
        name_entry.focus()
        name_entry.select_range(0, tk.END)
        
        # Frame para botões
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=(10, 0))
        
        # Variável para controlar o resultado
        result = {'confirmed': False, 'new_name': None}
        
        def apply_default_name():
            """Aplica nome padrão com data e hora"""
            default_name = f"fork_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}"
            entry_var.set(default_name)
            name_entry.focus()
            name_entry.select_range(0, tk.END)
        
        def confirm_rename():
            """Confirma a renomeação"""
            new_name = entry_var.get().strip()
            if not new_name:
                messagebox.showwarning("Aviso", "Digite um nome para o fork!")
                return
            
            if new_name == old_name:
                rename_window.destroy()
                return
            
            # Validar nome (básico)
            import re
            if not re.match(r'^[a-zA-Z0-9._-]+$', new_name):
                messagebox.showwarning(
                    "Nome Inválido", 
                    "O nome do fork deve conter apenas letras, números, pontos, hífens e underscores."
                )
                return
            
            result['confirmed'] = True
            result['new_name'] = new_name
            rename_window.destroy()
        
        def cancel_rename():
            """Cancela a renomeação"""
            rename_window.destroy()
        
        # Botões
        ttk.Button(buttons_frame, text="📅 Nome Padrão (Data/Hora)", 
                  command=apply_default_name).pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(buttons_frame, text="✅ Confirmar", 
                  command=confirm_rename).pack(side=tk.RIGHT, padx=(5, 0))
        
        ttk.Button(buttons_frame, text="❌ Cancelar", 
                  command=cancel_rename).pack(side=tk.RIGHT)
        
        # Bind Enter para confirmar
        def on_enter(event):
            confirm_rename()
        
        name_entry.bind('<Return>', on_enter)
        rename_window.bind('<Return>', on_enter)
        
        # Bind Escape para cancelar
        def on_escape(event):
            cancel_rename()
        
        rename_window.bind('<Escape>', on_escape)
        
        # Centralizar janela
        rename_window.update_idletasks()
        x = (rename_window.winfo_screenwidth() // 2) - (rename_window.winfo_width() // 2)
        y = (rename_window.winfo_screenheight() // 2) - (rename_window.winfo_height() // 2)
        rename_window.geometry(f"+{x}+{y}")
        
        # Aguardar fechamento da janela
        rename_window.wait_window()
        
        # Processar resultado
        if result['confirmed'] and result['new_name']:
            new_name = result['new_name']
            success, _, error = self.run_command(f'git branch -m {old_name} {new_name}')
            if success:
                messagebox.showinfo("Sucesso", f"Fork renomeado para '{new_name}'!")
                self.refresh_all()
            else:
                if "already exists" in error:
                    messagebox.showerror("Erro", f"Já existe um fork com o nome '{new_name}'!")
                else:
                    messagebox.showerror("Erro", f"Erro ao renomear fork: {error}")
    
    def delete_fork(self):
        """Exclui o fork selecionado"""
        selection = self.forks_tree.selection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um fork para excluir!")
            return
        
        item = self.forks_tree.item(selection[0])
        fork_name = item['tags'][0] if item['tags'] else None
        status = item['values'][0] if item['values'] else ""
        
        if fork_name in ['main', 'master'] or "🌟" in status:
            messagebox.showwarning("Aviso", "Não é possível excluir a branch principal ou atual!")
            return
        
        # Confirmar exclusão
        if not messagebox.askyesno("Confirmar", f"Excluir o fork '{fork_name}'?\n\n⚠️ Esta ação não pode ser desfeita!"):
            return
        
        success, _, error = self.run_command(f'git branch -D {fork_name}')
        if success:
            messagebox.showinfo("Sucesso", f"Fork '{fork_name}' excluído!")
            self.refresh_all()
        else:
            messagebox.showerror("Erro", f"Erro ao excluir fork: {error}")
    
    def start_project(self):
        """Inicia o projeto Next.js"""
        # Verificar se package.json existe
        package_json = os.path.join(self.project_path, 'package.json')
        if not os.path.exists(package_json):
            messagebox.showerror("Erro", "Arquivo package.json não encontrado!")
            return

        def kill_node_processes():
            """Termina todos os processos Node.js em execução"""
            try:
                # Comando para terminar todos os processos node.exe
                result = subprocess.run(
                    ['taskkill', '/F', '/IM', 'node.exe'],
                    capture_output=True,
                    text=True
                )
                return True, f"Processos Node.js terminados: {result.stdout}"
            except Exception as e:
                return False, f"Erro ao terminar processos Node.js: {str(e)}"

        def start_in_background():
            # Primeiro, terminar todos os processos Node.js
            kill_success, kill_message = kill_node_processes()
            if kill_success:
                print(f"✅ {kill_message}")
            else:
                print(f"⚠️ {kill_message}")
            
            # Aguardar um momento para garantir que os processos foram terminados
            import time
            time.sleep(2)
            
            # Tentar diferentes comandos
            commands = ['npm run dev', 'yarn dev', 'pnpm dev']
            for cmd in commands:
                try:
                    # Verificar se o gerenciador existe
                    manager = cmd.split()[0]
                    check_result = subprocess.run(f'{manager} --version', shell=True, capture_output=True)
                    if check_result.returncode == 0:
                        # Iniciar o projeto
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

        # Executar em thread separada
        def run_start():
            success, result = start_in_background()
            if success:
                self.root.after(0, lambda: messagebox.showinfo("Sucesso", f"Sistemas Node.js anteriores terminados.\nProjeto iniciado com: {result}"))
                # Abrir navegador após 3 segundos
                self.root.after(3000, self.open_browser)
            else:
                self.root.after(0, lambda: messagebox.showerror("Erro", result))

        threading.Thread(target=run_start, daemon=True).start()
    
    def sync_repository(self):
        """Sincroniza com repositório remoto (git pull)"""
        # Verificar se há remote configurado
        success, output, _ = self.run_command('git remote -v')
        if not success or not output.strip():
            messagebox.showinfo("Informação", "Nenhum repositório remoto configurado.\nApenas atualizando status local...")
            self.refresh_all()
            return
        
        # Confirmar sincronização
        if not messagebox.askyesno("Confirmar", "Sincronizar com repositório remoto?\n\nIsto irá executar 'git pull' para buscar atualizações."):
            return
        
        try:
            # Primeiro fazer fetch para ver o que há de novo
            self.run_command('git fetch')
            
            # Verificar se há mudanças para baixar
            success, output, _ = self.run_command('git status -uno')
            if "Your branch is up to date" in output:
                messagebox.showinfo("Atualizado", "Repositório já está atualizado!")
                self.refresh_all()
                return
            
            # Fazer pull
            success, output, error = self.run_command('git pull')
            
            if success:
                if "Already up to date" in output:
                    messagebox.showinfo("Sucesso", "Repositório já estava atualizado!")
                else:
                    messagebox.showinfo("Sucesso", f"Repositório sincronizado com sucesso!\n\n{output[:200]}...")
                self.refresh_all()
            else:
                if "Please commit your changes" in error:
                    messagebox.showwarning("Atenção", "Há mudanças locais não commitadas.\nCommite suas mudanças antes de sincronizar.")
                else:
                    messagebox.showerror("Erro", f"Erro ao sincronizar: {error}")
                    
        except Exception as e:
            messagebox.showerror("Erro", f"Erro na sincronização: {e}")
    
    def manage_stash(self):
        """Gerencia stashes (mudanças temporárias salvas)"""
        # Criar janela de gerenciamento de stash
        stash_window = tk.Toplevel(self.root)
        stash_window.title("📦 Gerenciar Stash")
        stash_window.geometry("600x400")
        stash_window.transient(self.root)
        
        # Frame principal
        main_frame = ttk.Frame(stash_window, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Lista de stashes
        ttk.Label(main_frame, text="📦 Stashes Disponíveis:", font=('Arial', 12, 'bold')).pack(anchor=tk.W, pady=(0, 10))
        
        # Treeview para stashes
        stash_tree = ttk.Treeview(main_frame, columns=('index', 'message'), show='headings', height=10)
        stash_tree.heading('#1', text='Index')
        stash_tree.heading('#2', text='Mensagem')
        stash_tree.column('#1', width=80)
        stash_tree.column('#2', width=400)
        stash_tree.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Carregar lista de stashes
        def load_stashes():
            # Limpar lista
            for item in stash_tree.get_children():
                stash_tree.delete(item)
            
            success, output, _ = self.run_command('git stash list')
            if success and output.strip():
                for line in output.strip().split('\n'):
                    if line.strip():
                        # Formato: stash@{0}: WIP on main: abc1234 message
                        parts = line.split(': ', 2)
                        if len(parts) >= 2:
                            index = parts[0]  # stash@{0}
                            message = parts[1] if len(parts) == 2 else parts[2]
                            stash_tree.insert('', tk.END, values=(index, message))
            else:
                stash_tree.insert('', tk.END, values=("", "Nenhum stash encontrado"))
        
        # Botões de ação
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=(10, 0))
        
        def apply_stash():
            selection = stash_tree.selection()
            if not selection:
                messagebox.showwarning("Aviso", "Selecione um stash para aplicar!")
                return
            
            item = stash_tree.item(selection[0])
            stash_index = item['values'][0] if item['values'] else None
            
            if not stash_index or stash_index == "":
                messagebox.showerror("Erro", "Stash inválido selecionado")
                return
            
            # Confirmar aplicação
            if messagebox.askyesno("Confirmar", f"Aplicar {stash_index}?\n\nIsso irá restaurar as mudanças salvas."):
                success, output, error = self.run_command(f'git stash apply {stash_index}')
                if success:
                    messagebox.showinfo("Sucesso", f"Stash {stash_index} aplicado com sucesso!")
                    load_stashes()
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", f"Erro ao aplicar stash: {error}")
        
        def pop_stash():
            selection = stash_tree.selection()
            if not selection:
                messagebox.showwarning("Aviso", "Selecione um stash para aplicar e remover!")
                return
            
            item = stash_tree.item(selection[0])
            stash_index = item['values'][0] if item['values'] else None
            
            if not stash_index or stash_index == "":
                messagebox.showerror("Erro", "Stash inválido selecionado")
                return
            
            # Confirmar pop
            if messagebox.askyesno("Confirmar", f"Aplicar e remover {stash_index}?\n\nIsso irá restaurar as mudanças e remover o stash."):
                success, output, error = self.run_command(f'git stash pop {stash_index}')
                if success:
                    messagebox.showinfo("Sucesso", f"Stash {stash_index} aplicado e removido!")
                    load_stashes()
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", f"Erro ao aplicar stash: {error}")
        
        def drop_stash():
            selection = stash_tree.selection()
            if not selection:
                messagebox.showwarning("Aviso", "Selecione um stash para remover!")
                return
            
            item = stash_tree.item(selection[0])
            stash_index = item['values'][0] if item['values'] else None
            
            if not stash_index or stash_index == "":
                messagebox.showerror("Erro", "Stash inválido selecionado")
                return
            
            # Confirmar remoção
            if messagebox.askyesno("Confirmar", f"Remover {stash_index}?\n\n⚠️ Esta ação não pode ser desfeita!"):
                success, output, error = self.run_command(f'git stash drop {stash_index}')
                if success:
                    messagebox.showinfo("Sucesso", f"Stash {stash_index} removido!")
                    load_stashes()
                else:
                    messagebox.showerror("Erro", f"Erro ao remover stash: {error}")
        
        def clear_all_stashes():
            if messagebox.askyesno("Confirmar", "Remover TODOS os stashes?\n\n⚠️ Esta ação não pode ser desfeita!"):
                success, output, error = self.run_command('git stash clear')
                if success:
                    messagebox.showinfo("Sucesso", "Todos os stashes foram removidos!")
                    load_stashes()
                else:
                    messagebox.showerror("Erro", f"Erro ao limpar stashes: {error}")
        
        # Botões
        ttk.Button(buttons_frame, text="✅ Aplicar Stash", command=apply_stash).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="📤 Aplicar e Remover", command=pop_stash).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="🗑️ Remover Stash", command=drop_stash).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="🧹 Limpar Todos", command=clear_all_stashes).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(buttons_frame, text="🔄 Atualizar", command=load_stashes).pack(side=tk.LEFT, padx=(0, 5))
        
        # Carregar stashes inicialmente
        load_stashes()
        
        # Centralizar janela
        stash_window.update_idletasks()
        x = (stash_window.winfo_screenwidth() // 2) - (stash_window.winfo_width() // 2)
        y = (stash_window.winfo_screenheight() // 2) - (stash_window.winfo_height() // 2)
        stash_window.geometry(f"+{x}+{y}")
    
    def exit_detached_head(self):
        """Sai do estado HEAD detached"""
        # Verificar se realmente está em HEAD detached
        success, output, _ = self.run_command('git branch --show-current')
        if success and output.strip():
            messagebox.showinfo("Informação", "Você não está em estado HEAD detached.")
            return
        
        # Dar opções ao usuário
        choice = messagebox.askyesnocancel(
            "Sair do HEAD Detached",
            "Como deseja sair do estado HEAD detached?\n\n"
            "• SIM: Criar novo fork a partir da posição atual\n"
            "• NÃO: Voltar para o último fork (main/master)\n"
            "• CANCELAR: Cancelar operação"
        )
        
        if choice is None:  # Cancelar
            return
        elif choice:  # SIM - Criar novo fork
            # Pedir nome do fork
            fork_name = simpledialog.askstring(
                "Nome do Novo Fork",
                "Digite um nome para o novo fork:",
                initialvalue=f"detached_save_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}"
            )
            
            if not fork_name:
                return
            
            # Criar branch a partir da posição atual
            success, _, error = self.run_command(f'git checkout -b {fork_name}')
            if success:
                messagebox.showinfo("Sucesso", f"Novo fork '{fork_name}' criado e ativado!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", f"Erro ao criar fork: {error}")
        
        else:  # NÃO - Voltar para main/master
            # Tentar encontrar branch principal
            success, branches_output, _ = self.run_command('git branch')
            main_branch = 'main'
            
            if success and branches_output:
                if 'master' in branches_output:
                    main_branch = 'master'
                elif 'main' in branches_output:
                    main_branch = 'main'
                else:
                    # Pegar o primeiro branch disponível
                    for line in branches_output.split('\n'):
                        line = line.strip()
                        if line and not line.startswith('*') and 'HEAD detached' not in line:
                            main_branch = line
                            break
            
            # Confirmar se pode perder mudanças
            if not messagebox.askyesno(
                "Confirmar",
                f"Voltar para o fork '{main_branch}'?\n\n"
                "⚠️ Qualquer mudança não commitada será perdida."
            ):
                return
            
            success, _, error = self.run_command(f'git checkout {main_branch}')
            if success:
                messagebox.showinfo("Sucesso", f"Voltou para o fork '{main_branch}'!")
                self.refresh_all()
            else:
                messagebox.showerror("Erro", f"Erro ao voltar para {main_branch}: {error}")
    
    def open_browser(self):
        """Abre o navegador no localhost:3000"""
        try:
            webbrowser.open('http://localhost:3000')
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao abrir navegador: {e}")
    
    # ==================== MÉTODOS VERCEL ====================
    
    def log_deploy_message(self, message, level="INFO"):
        """Adiciona mensagem ao log de deploy"""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        icon = {"INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️"}.get(level, "📝")
        log_message = f"[{timestamp}] {icon} {message}\n"
        
        self.deploy_log.insert(tk.END, log_message)
        self.deploy_log.see(tk.END)
        self.root.update_idletasks()
    
    def run_vercel_command(self, command, show_output=True):
        """Executa comando do Vercel CLI"""
        try:
            os.chdir(self.project_path)
            if show_output:
                self.log_deploy_message(f"Executando: {command}")
            
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                encoding='utf-8',
                timeout=300  # 5 minutos timeout
            )
            
            if result.returncode == 0:
                if show_output and result.stdout:
                    self.log_deploy_message(result.stdout.strip())
                return True, result.stdout, result.stderr
            else:
                if show_output:
                    self.log_deploy_message(f"Erro: {result.stderr}", "ERROR")
                return False, result.stdout, result.stderr
                
        except subprocess.TimeoutExpired:
            self.log_deploy_message("Comando expirou (timeout)", "ERROR")
            return False, "", "Timeout"
        except Exception as e:
            if show_output:
                self.log_deploy_message(f"Erro na execução: {str(e)}", "ERROR")
            return False, "", str(e)
    
    def check_vercel_cli_installed(self):
        """Verifica se o Vercel CLI está instalado"""
        success, output, _ = self.run_vercel_command("vercel --version", show_output=False)
        return success
    
    def install_vercel_cli(self):
        """Instala o Vercel CLI"""
        if messagebox.askyesno("Instalar Vercel CLI", 
                              "Vercel CLI não encontrado. Deseja instalar?\n\n" +
                              "Isso executará: npm install -g vercel"):
            self.log_deploy_message("Instalando Vercel CLI...", "INFO")
            success, _, _ = self.run_vercel_command("npm install -g vercel")
            if success:
                self.log_deploy_message("Vercel CLI instalado com sucesso!", "SUCCESS")
                return True
            else:
                self.log_deploy_message("Falha na instalação do Vercel CLI", "ERROR")
                return False
        return False
    
    def vercel_login(self):
        """Faz login no Vercel"""
        if not self.check_vercel_cli_installed():
            if not self.install_vercel_cli():
                return
        
        # Dialog para escolher método de login
        choice = messagebox.askyesno(
            "Login no Vercel",
            "Escolha o método de login:\n\n" +
            "Sim = GitHub OAuth\n" +
            "Não = Email"
        )
        
        if choice:
            command = "vercel login --github"
        else:
            command = "vercel login"
        
        self.log_deploy_message("Iniciando login no Vercel...", "INFO")
        self.log_deploy_message("Uma janela do navegador será aberta para autenticação", "INFO")
        
        def login_thread():
            success, output, error = self.run_vercel_command(command)
            if success:
                self.root.after(0, lambda: self.log_deploy_message("Login realizado com sucesso!", "SUCCESS"))
                self.root.after(0, self.check_vercel_status)
            else:
                self.root.after(0, lambda: self.log_deploy_message(f"Erro no login: {error}", "ERROR"))
        
        threading.Thread(target=login_thread, daemon=True).start()
    
    def vercel_logout(self):
        """Faz logout do Vercel"""
        if messagebox.askyesno("Logout", "Deseja fazer logout do Vercel?"):
            success, _, _ = self.run_vercel_command("vercel logout")
            if success:
                self.log_deploy_message("Logout realizado com sucesso!", "SUCCESS")
                self.login_status_label.config(text="❌ Não logado no Vercel")
                self.preview_url_var.set("")
                self.production_url_var.set("")
            else:
                self.log_deploy_message("Erro ao fazer logout", "ERROR")
    
    def check_vercel_status(self):
        """Verifica status de autenticação no Vercel"""
        if not self.check_vercel_cli_installed():
            self.login_status_label.config(text="❌ Vercel CLI não instalado")
            return
        
        # Verificar se está logado
        success, output, _ = self.run_vercel_command("vercel whoami", show_output=False)
        if success and output.strip():
            username = output.strip()
            self.login_status_label.config(text=f"✅ Logado como: {username}")
            self.log_deploy_message(f"Autenticado como: {username}", "SUCCESS")
        else:
            self.login_status_label.config(text="❌ Não logado no Vercel")
    
    def check_project_setup(self):
        """Verifica se o projeto está configurado corretamente"""
        self.log_deploy_message("Verificando configuração do projeto...", "INFO")
        
        # Verificar package.json
        package_json = os.path.join(self.project_path, 'package.json')
        if not os.path.exists(package_json):
            self.log_deploy_message("❌ package.json não encontrado!", "ERROR")
            return False
        
        # Verificar se é projeto Next.js
        try:
            with open(package_json, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
                dependencies = package_data.get('dependencies', {})
                dev_dependencies = package_data.get('devDependencies', {})
                
                if 'next' in dependencies or 'next' in dev_dependencies:
                    self.log_deploy_message("✅ Projeto Next.js detectado", "SUCCESS")
                else:
                    self.log_deploy_message("⚠️ Next.js não detectado nas dependências", "WARNING")
                
                # Verificar scripts
                scripts = package_data.get('scripts', {})
                if 'build' in scripts:
                    self.log_deploy_message(f"✅ Script de build encontrado: {scripts['build']}", "SUCCESS")
                else:
                    self.log_deploy_message("⚠️ Script de build não encontrado", "WARNING")
                    
        except Exception as e:
            self.log_deploy_message(f"Erro ao ler package.json: {e}", "ERROR")
            return False
        
        # Verificar node_modules
        node_modules = os.path.join(self.project_path, 'node_modules')
        if os.path.exists(node_modules):
            self.log_deploy_message("✅ node_modules encontrado", "SUCCESS")
        else:
            self.log_deploy_message("⚠️ node_modules não encontrado. Execute 'npm install'", "WARNING")
        
        # Verificar .vercel
        vercel_dir = os.path.join(self.project_path, '.vercel')
        if os.path.exists(vercel_dir):
            self.log_deploy_message("✅ Projeto já configurado no Vercel", "SUCCESS")
        else:
            self.log_deploy_message("ℹ️ Projeto não configurado no Vercel (será configurado no primeiro deploy)", "INFO")
        
        self.log_deploy_message("Verificação concluída!", "SUCCESS")
        return True
    
    def deploy_preview(self):
        """Faz deploy de preview"""
        if not self.check_project_setup():
            return
        
        self.log_deploy_message("Iniciando deploy de preview...", "INFO")
        
        def deploy_thread():
            # Comando de deploy
            command = "vercel"
            if self.project_name_var.get().strip():
                command += f" --name {self.project_name_var.get().strip()}"
            
            success, output, error = self.run_vercel_command(command)
            
            if success:
                # Extrair URL do output
                lines = output.split('\n')
                for line in lines:
                    if 'https://' in line and 'vercel.app' in line:
                        url = line.strip()
                        self.root.after(0, lambda: self.preview_url_var.set(url))
                        self.root.after(0, lambda: self.log_deploy_message(f"Deploy de preview concluído: {url}", "SUCCESS"))
                        break
                else:
                    self.root.after(0, lambda: self.log_deploy_message("Deploy concluído, mas URL não encontrada", "WARNING"))
            else:
                self.root.after(0, lambda: self.log_deploy_message(f"Erro no deploy: {error}", "ERROR"))
        
        threading.Thread(target=deploy_thread, daemon=True).start()
    
    def deploy_production(self):
        """Faz deploy de produção"""
        if not messagebox.askyesno("Deploy de Produção", 
                                  "Tem certeza que deseja fazer deploy para produção?"):
            return
        
        if not self.check_project_setup():
            return
        
        self.log_deploy_message("Iniciando deploy de produção...", "INFO")
        
        def deploy_thread():
            # Comando de deploy para produção
            command = "vercel --prod"
            if self.project_name_var.get().strip():
                command += f" --name {self.project_name_var.get().strip()}"
            
            success, output, error = self.run_vercel_command(command)
            
            if success:
                # Extrair URL do output
                lines = output.split('\n')
                for line in lines:
                    if 'https://' in line and ('vercel.app' in line or self.project_name_var.get() in line):
                        url = line.strip()
                        self.root.after(0, lambda: self.production_url_var.set(url))
                        self.root.after(0, lambda: self.log_deploy_message(f"Deploy de produção concluído: {url}", "SUCCESS"))
                        break
                else:
                    self.root.after(0, lambda: self.log_deploy_message("Deploy concluído, mas URL não encontrada", "WARNING"))
            else:
                self.root.after(0, lambda: self.log_deploy_message(f"Erro no deploy: {error}", "ERROR"))
        
        threading.Thread(target=deploy_thread, daemon=True).start()
    
    def list_deployments(self):
        """Lista deployments do projeto"""
        self.log_deploy_message("Listando deployments...", "INFO")
        
        success, output, error = self.run_vercel_command("vercel ls")
        if success:
            self.log_deploy_message("Deployments encontrados:", "SUCCESS")
            self.log_deploy_message(output, "INFO")
        else:
            self.log_deploy_message(f"Erro ao listar deployments: {error}", "ERROR")
    
    def refresh_deploy_status(self):
        """Atualiza status de deploy"""
        self.check_vercel_status()
        self.list_deployments()
    
    def open_url(self, url):
        """Abre URL no navegador"""
        if url and url.strip():
            try:
                webbrowser.open(url.strip())
                self.log_deploy_message(f"Abrindo: {url}", "INFO")
            except Exception as e:
                self.log_deploy_message(f"Erro ao abrir URL: {e}", "ERROR")
        else:
            messagebox.showwarning("Aviso", "URL não disponível!")
    
    def run(self):
        """Inicia a aplicação"""
        # Inicializar Git se necessário
        if not os.path.exists(os.path.join(self.project_path, '.git')):
            if messagebox.askyesno("Git", "Repositório Git não encontrado. Deseja inicializar?"):
                success, _, error = self.run_command('git init')
                if success:
                    self.run_command('git config user.name "Usuario"')
                    self.run_command('git config user.email "usuario@local"')
                    messagebox.showinfo("Sucesso", "Repositório Git inicializado!")
                    self.refresh_all()
                else:
                    messagebox.showerror("Erro", f"Erro ao inicializar Git: {error}")
        
        self.root.mainloop()

def main():
    """Função principal"""
    app = VersionControlGUI()
    app.run()

if __name__ == "__main__":
    main()

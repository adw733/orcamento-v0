#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de componentes GUI - Sistema de Controle de Versões
Componentes reutilizáveis da interface gráfica
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, scrolledtext
import threading


class StatusBar:
    """Barra de status com indicadores visuais"""
    
    def __init__(self, parent):
        self.frame = ttk.Frame(parent)
        self.status_label = ttk.Label(self.frame, text="✅ Sistema pronto", foreground='green')
        self.refresh_btn = ttk.Button(self.frame, text="🔄", width=3)
        
        self.status_label.pack(side=tk.LEFT, padx=(0, 10))
        self.refresh_btn.pack(side=tk.RIGHT)
    
    def update_status(self, text, color='black'):
        """Atualiza status com cor"""
        self.status_label.config(text=text, foreground=color)
    
    def pack(self, **kwargs):
        self.frame.pack(**kwargs)


class CommitsList:
    """Lista de commits com menu de contexto"""
    
    def __init__(self, parent):
        self.frame = ttk.LabelFrame(parent, text="📦 Versões Salvas", padding="10")
        
        # TreeView
        self.tree = ttk.Treeview(self.frame, columns=('date', 'author', 'message'), 
                                show='headings', height=12)
        self.tree.heading('#1', text='Data/Hora')
        self.tree.heading('#2', text='Autor')  
        self.tree.heading('#3', text='Descrição')
        
        self.tree.column('#1', width=150)
        self.tree.column('#2', width=100)
        self.tree.column('#3', width=300)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(self.frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # Botões
        self.create_buttons()
        
        # Menu de contexto
        self.create_context_menu()
        
        # Configure grid
        self.frame.columnconfigure(0, weight=1)
        self.frame.rowconfigure(0, weight=1)
    
    def create_buttons(self):
        """Cria botões de ação"""
        btn_frame = ttk.Frame(self.frame)
        btn_frame.grid(row=1, column=0, columnspan=2, pady=(10, 0), sticky=(tk.W, tk.E))
        
        # Primeira linha
        row1 = ttk.Frame(btn_frame)
        row1.pack(fill=tk.X, pady=(0, 5))
        
        self.restore_btn = ttk.Button(row1, text="⏪ Restaurar", width=12)
        self.fork_btn = ttk.Button(row1, text="🔀 Fork", width=8)
        
        self.restore_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.fork_btn.pack(side=tk.LEFT)
        
        # Segunda linha  
        row2 = ttk.Frame(btn_frame)
        row2.pack(fill=tk.X)
        
        self.rename_btn = ttk.Button(row2, text="✏️ Renomear", width=12)
        self.details_btn = ttk.Button(row2, text="ℹ️ Detalhes", width=8)
        
        self.rename_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.details_btn.pack(side=tk.LEFT)
    
    def create_context_menu(self):
        """Cria menu de contexto"""
        self.context_menu = tk.Menu(self.frame, tearoff=0)
        self.context_menu.add_command(label="⏪ Restaurar versão")
        self.context_menu.add_command(label="🔀 Criar Fork")
        self.context_menu.add_separator()
        self.context_menu.add_command(label="✏️ Renomear")
        self.context_menu.add_command(label="ℹ️ Detalhes")
        
        self.tree.bind("<Button-3>", self.show_context_menu)
        self.tree.bind("<Double-1>", lambda e: self.on_double_click())
    
    def show_context_menu(self, event):
        """Mostra menu de contexto"""
        item = self.tree.identify_row(event.y)
        if item:
            self.tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)
    
    def on_double_click(self):
        """Handler para duplo clique"""
        pass  # Será definido pela classe pai
    
    def get_selected_commit(self):
        """Obtém commit selecionado"""
        selection = self.tree.selection()
        if not selection:
            return None
        
        item = self.tree.item(selection[0])
        if item['tags']:
            return {
                'hash': item['tags'][0],
                'full_hash': item['tags'][1] if len(item['tags']) > 1 else item['tags'][0],
                'message': item['values'][2] if len(item['values']) > 2 else "Versão"
            }
        return None
    
    def load_commits(self, commits):
        """Carrega lista de commits"""
        # Limpar
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Adicionar commits
        for commit in commits:
            self.tree.insert('', tk.END,
                           values=(commit['date'], commit['author'], commit['message']),
                           tags=(commit['hash'], commit.get('full_hash', commit['hash'])))
    
    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class SaveVersionPanel:
    """Painel para salvar nova versão"""
    
    def __init__(self, parent, templates=None):
        self.frame = ttk.LabelFrame(parent, text="💾 Salvar Nova Versão", padding="10")
        self.templates = templates or []
        
        # Status de arquivos
        ttk.Label(self.frame, text="📄 Arquivos Modificados:").grid(row=0, column=0, sticky=tk.W, pady=(0, 5))
        
        self.status_text = scrolledtext.ScrolledText(self.frame, height=6, width=50)
        self.status_text.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Campo de mensagem
        ttk.Label(self.frame, text="📝 Descrição:").grid(row=2, column=0, sticky=tk.W)
        
        self.message_var = tk.StringVar()
        self.message_entry = ttk.Entry(self.frame, textvariable=self.message_var, width=50)
        self.message_entry.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=(5, 10))
        
        # Templates
        self.create_template_buttons()
        
        # Botão salvar
        self.save_btn = ttk.Button(self.frame, text="💾 Salvar Versão")
        self.save_btn.grid(row=5, column=0, pady=5)
        
        # Configure grid
        self.frame.columnconfigure(0, weight=1)
    
    def create_template_buttons(self):
        """Cria botões de template"""
        if not self.templates:
            return
        
        template_frame = ttk.Frame(self.frame)
        template_frame.grid(row=4, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        ttk.Label(template_frame, text="🎯 Templates:").pack(side=tk.LEFT)
        
        for template in self.templates[:5]:  # Máximo 5 templates
            btn_text = template.split(':')[0]
            btn = ttk.Button(template_frame, text=btn_text, width=8,
                           command=lambda t=template: self.message_var.set(t))
            btn.pack(side=tk.LEFT, padx=2)
    
    def update_status(self, status_files):
        """Atualiza status dos arquivos"""
        self.status_text.delete('1.0', tk.END)
        
        if status_files:
            for file_info in status_files:
                status_icon = {
                    'M ': '📝', '??': '🆕', 'A ': '➕', 
                    'D ': '🗑️', 'R ': '📁'
                }.get(file_info['status'], '📄')
                
                self.status_text.insert(tk.END, f"{status_icon} {file_info['file']}\n")
        else:
            self.status_text.insert(tk.END, "✅ Nenhuma mudança pendente")
    
    def get_message(self):
        """Obtém mensagem do commit"""
        return self.message_var.get().strip()
    
    def clear_message(self):
        """Limpa campo de mensagem"""
        self.message_var.set("")
    
    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class BranchesList:
    """Lista de branches/forks"""
    
    def __init__(self, parent):
        self.frame = ttk.LabelFrame(parent, text="🔀 Forks", padding="10")
        
        # TreeView
        self.tree = ttk.Treeview(self.frame, columns=('status', 'name'), 
                                show='headings', height=8)
        self.tree.heading('#1', text='Status')
        self.tree.heading('#2', text='Nome')
        
        self.tree.column('#1', width=80)
        self.tree.column('#2', width=200)
        
        self.tree.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Botões
        self.create_buttons()
        
        # Menu de contexto
        self.create_context_menu()
        
        # Configure grid
        self.frame.columnconfigure(0, weight=1)
    
    def create_buttons(self):
        """Cria botões de ação"""
        btn_frame = ttk.Frame(self.frame)
        btn_frame.grid(row=1, column=0, sticky=(tk.W, tk.E))
        
        # Primeira linha
        row1 = ttk.Frame(btn_frame)
        row1.pack(fill=tk.X, pady=(0, 5))
        
        self.new_btn = ttk.Button(row1, text="🔀 Novo Fork", width=12)
        self.switch_btn = ttk.Button(row1, text="↩️ Mudar", width=8)
        
        self.new_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.switch_btn.pack(side=tk.LEFT)
        
        # Segunda linha
        row2 = ttk.Frame(btn_frame)
        row2.pack(fill=tk.X)
        
        self.rename_btn = ttk.Button(row2, text="✏️ Renomear", width=12)
        self.delete_btn = ttk.Button(row2, text="🗑️ Excluir", width=8)
        
        self.rename_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.delete_btn.pack(side=tk.LEFT)
    
    def create_context_menu(self):
        """Cria menu de contexto"""
        self.context_menu = tk.Menu(self.frame, tearoff=0)
        self.context_menu.add_command(label="↩️ Mudar para este Fork")
        self.context_menu.add_command(label="✏️ Renomear Fork")
        self.context_menu.add_separator()
        self.context_menu.add_command(label="🗑️ Excluir Fork")
        
        self.tree.bind("<Button-3>", self.show_context_menu)
    
    def show_context_menu(self, event):
        """Mostra menu de contexto"""
        item = self.tree.identify_row(event.y)
        if item:
            self.tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)
    
    def get_selected_branch(self):
        """Obtém branch selecionada"""
        selection = self.tree.selection()
        if not selection:
            return None
        
        item = self.tree.item(selection[0])
        if item['tags']:
            return item['tags'][0]
        return None
    
    def load_branches(self, branches):
        """Carrega lista de branches"""
        # Limpar
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Adicionar branches
        for branch in branches:
            status = "🌟 Atual" if branch['current'] else "🔀 Fork"
            self.tree.insert('', tk.END,
                           values=(status, branch['name']),
                           tags=(branch['name'],))
    
    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class ProjectControlPanel:
    """Painel de controle do projeto"""
    
    def __init__(self, parent):
        self.frame = ttk.LabelFrame(parent, text="🚀 Controle do Projeto", padding="10")
        
        # Primeira linha - Projeto
        row1 = ttk.Frame(self.frame)
        row1.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        self.start_btn = ttk.Button(row1, text="🚀 Iniciar Dev", width=12)
        self.browser_btn = ttk.Button(row1, text="🌐 Navegador", width=12)
        
        self.start_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.browser_btn.pack(side=tk.LEFT)
        
        # Segunda linha - Sistema
        row2 = ttk.Frame(self.frame)
        row2.grid(row=1, column=0, sticky=(tk.W, tk.E))
        
        self.config_btn = ttk.Button(row2, text="⚙️ Config", width=12)
        self.stats_btn = ttk.Button(row2, text="📊 Stats", width=12)
        
        self.config_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.stats_btn.pack(side=tk.LEFT)
        
        # Configure grid
        self.frame.columnconfigure(0, weight=1)
    
    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class VercelControlPanel:
    """Painel de controle da Vercel"""
    
    def __init__(self, parent):
        self.frame = ttk.LabelFrame(parent, text="🚀 Deploy Vercel", padding="10")
        
        # Status da Vercel
        self.status_frame = ttk.Frame(self.frame)
        self.status_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.status_label = ttk.Label(self.status_frame, text="📡 Verificando Vercel CLI...")
        self.status_label.pack(side=tk.LEFT)
        
        # Primeira linha - Setup
        row1 = ttk.Frame(self.frame)
        row1.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        self.install_btn = ttk.Button(row1, text="📦 Instalar CLI", width=12)
        self.login_btn = ttk.Button(row1, text="🔑 Login", width=12)
        
        self.install_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.login_btn.pack(side=tk.LEFT)
        
        # Segunda linha - Deploy
        row2 = ttk.Frame(self.frame)
        row2.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        self.preview_btn = ttk.Button(row2, text="🔍 Preview", width=12)
        self.production_btn = ttk.Button(row2, text="🌐 Produção", width=12)
        
        self.preview_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.production_btn.pack(side=tk.LEFT)
        
        # Terceira linha - Utilitários
        row3 = ttk.Frame(self.frame)
        row3.grid(row=3, column=0, sticky=(tk.W, tk.E))
        
        self.dashboard_btn = ttk.Button(row3, text="📊 Dashboard", width=12)
        self.config_btn = ttk.Button(row3, text="⚙️ Config", width=12)
        
        self.dashboard_btn.pack(side=tk.LEFT, padx=(0, 5))
        self.config_btn.pack(side=tk.LEFT)
        
        # Configure grid
        self.frame.columnconfigure(0, weight=1)
    
    def update_status(self, vercel_cli_installed):
        """Atualiza status da Vercel CLI"""
        if vercel_cli_installed:
            self.status_label.config(text="✅ Vercel CLI instalado", foreground='green')
            self.install_btn.config(state='disabled')
            self.login_btn.config(state='normal')
            self.preview_btn.config(state='normal')
            self.production_btn.config(state='normal')
        else:
            self.status_label.config(text="❌ Vercel CLI não instalado", foreground='red')
            self.install_btn.config(state='normal')
            self.login_btn.config(state='disabled')
            self.preview_btn.config(state='disabled')
            self.production_btn.config(state='disabled')
    
    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class ModalDialog:
    """Classe base para diálogos modais"""
    
    def __init__(self, parent, title, size="400x300"):
        self.parent = parent
        self.result = None
        
        self.window = tk.Toplevel(parent)
        self.window.title(title)
        self.window.geometry(size)
        self.window.resizable(False, False)
        
        # Centralizar
        self.window.transient(parent)
        self.window.grab_set()
        
        # Configurar layout
        self.setup_ui()
        
        # Focar na janela
        self.window.focus_set()
    
    def setup_ui(self):
        """Override este método nas subclasses"""
        pass
    
    def close(self, result=None):
        """Fecha o diálogo com resultado"""
        self.result = result
        self.window.destroy()
    
    def show(self):
        """Mostra o diálogo e retorna o resultado"""
        self.window.wait_window()
        return self.result


class ConfigDialog(ModalDialog):
    """Diálogo de configuração"""
    
    def __init__(self, parent, config):
        self.config = config
        super().__init__(parent, "⚙️ Configurações", "450x350")
    
    def setup_ui(self):
        main_frame = ttk.Frame(self.window, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        ttk.Label(main_frame, text="⚙️ Configurações do Git", 
                 font=('Segoe UI', 12, 'bold')).pack(pady=(0, 15))
        
        # Nome
        ttk.Label(main_frame, text="Nome:").pack(anchor=tk.W)
        self.name_var = tk.StringVar(value=self.config.get('user_name', ''))
        ttk.Entry(main_frame, textvariable=self.name_var, width=40).pack(pady=(0, 10))
        
        # Email
        ttk.Label(main_frame, text="Email:").pack(anchor=tk.W)
        self.email_var = tk.StringVar(value=self.config.get('user_email', ''))
        ttk.Entry(main_frame, textvariable=self.email_var, width=40).pack(pady=(0, 10))
        
        # Auto-backup
        self.auto_backup_var = tk.BooleanVar(value=self.config.get('auto_backup', True))
        ttk.Checkbutton(main_frame, text="🔄 Auto-backup a cada 30 segundos", 
                       variable=self.auto_backup_var).pack(anchor=tk.W, pady=(0, 20))
        
        # Botões
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(pady=10)
        
        ttk.Button(btn_frame, text="💾 Salvar", 
                  command=self.save_config).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(btn_frame, text="✖ Cancelar", 
                  command=lambda: self.close(None)).pack(side=tk.LEFT)
    
    def save_config(self):
        """Salva configurações"""
        result = {
            'user_name': self.name_var.get(),
            'user_email': self.email_var.get(),
            'auto_backup': self.auto_backup_var.get()
        }
        self.close(result)


class StatsDialog(ModalDialog):
    """Diálogo de estatísticas"""
    
    def __init__(self, parent, stats_data):
        self.stats_data = stats_data
        super().__init__(parent, "📊 Estatísticas", "500x400")
    
    def setup_ui(self):
        main_frame = ttk.Frame(self.window, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        ttk.Label(main_frame, text="📊 Estatísticas do Projeto", 
                 font=('Segoe UI', 12, 'bold')).pack(pady=(0, 10))
        
        # Texto de estatísticas
        stats_text = scrolledtext.ScrolledText(main_frame, height=18, width=60)
        stats_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Inserir dados
        stats_info = f"""
📦 Total de versões: {len(self.stats_data.get('commits', []))}
🔀 Total de forks: {len(self.stats_data.get('branches', []))}
🌟 Fork atual: {self.stats_data.get('current_branch', 'main')}
📄 Arquivos modificados: {len(self.stats_data.get('status', []))}

📅 Versões recentes:
"""
        
        for i, commit in enumerate(self.stats_data.get('commits', [])[:10]):
            stats_info += f"  {i+1}. {commit['date']} - {commit['message'][:50]}...\n"
        
        stats_text.insert(tk.END, stats_info)
        stats_text.configure(state='disabled')
        
        # Botão fechar
        ttk.Button(main_frame, text="✖ Fechar", 
                  command=lambda: self.close()).pack()


class CommitDetailsDialog(ModalDialog):
    """Diálogo de detalhes do commit"""
    
    def __init__(self, parent, commit_data):
        self.commit_data = commit_data
        super().__init__(parent, f"ℹ️ Detalhes - {commit_data.get('hash', 'N/A')}", "700x500")
    
    def setup_ui(self):
        main_frame = ttk.Frame(self.window, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        ttk.Label(main_frame, text=f"ℹ️ Versão {self.commit_data.get('hash', 'N/A')}", 
                 font=('Segoe UI', 12, 'bold')).pack(pady=(0, 15))
        
        # Detalhes
        details_text = scrolledtext.ScrolledText(main_frame, height=20, width=70)
        details_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        info = f"""💬 MENSAGEM:
{self.commit_data.get('message', 'N/A')}

🔑 HASH:
{self.commit_data.get('full_hash', 'N/A')}

📅 DATA:
{self.commit_data.get('date', 'N/A')}

👤 AUTOR:
{self.commit_data.get('author', 'N/A')}
"""
        
        details_text.insert(tk.END, info)
        details_text.configure(state='disabled')
        
        # Botões
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(pady=10)
        
        ttk.Button(btn_frame, text="⏪ Restaurar", 
                  command=lambda: self.close('restore')).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(btn_frame, text="🔀 Criar Fork", 
                  command=lambda: self.close('fork')).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(btn_frame, text="✖ Fechar", 
                  command=lambda: self.close(None)).pack(side=tk.LEFT)

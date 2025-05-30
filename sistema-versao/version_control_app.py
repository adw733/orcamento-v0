#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Controle de Versões - Versão Melhorada
Interface gráfica moderna e modularizada para controle de versões Git

Autor: Assistant
Data: 2025
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import threading
import datetime
import os

# Importar módulos locais
from git_commands import GitCommands
from project_commands import ProjectCommands
from gui_components import (
    StatusBar, CommitsList, SaveVersionPanel, BranchesList, 
    ProjectControlPanel, ConfigDialog, StatsDialog, CommitDetailsDialog
)


class VersionControlApp:
    """Aplicação principal de controle de versões"""
    
    def __init__(self, project_path):
        self.project_path = project_path
        self.git = GitCommands(project_path)
        self.project = ProjectCommands(project_path)
        
        # Inicializar interface
        self.setup_window()
        self.create_layout()
        self.connect_events()
        
        # Inicializar Git
        if not self.git.initialize():
            messagebox.showerror("Erro", "Erro ao inicializar repositório Git")
            return
        
        # Carregar dados iniciais
        self.refresh_all()
        
        # Auto-refresh
        self.schedule_auto_refresh()
        
        # Auto-backup
        self.schedule_auto_backup()
    
    def setup_window(self):
        """Configura janela principal"""
        self.root = tk.Tk()
        self.root.title("🚀 Controle de Versões - Orçamento Rev1")
        self.root.geometry("1200x800")
        self.root.minsize(1000, 700)
        self.root.configure(bg='#f8fafc')
        
        # Configurar estilo
        self.setup_styles()
    
    def setup_styles(self):
        """Configura estilos da interface"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configurar estilos personalizados
        style.configure('Title.TLabel', font=('Segoe UI', 16, 'bold'), 
                       background='#f8fafc', foreground='#1f2937')
        style.configure('Subtitle.TLabel', font=('Segoe UI', 12, 'bold'), 
                       background='#f8fafc', foreground='#374151')
    
    def create_layout(self):
        """Cria layout da interface"""
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="15")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Cabeçalho
        self.create_header(main_frame)
        
        # Área principal - dois painéis
        content_frame = ttk.Frame(main_frame)
        content_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(15, 0))
        
        # Painel esquerdo - Commits
        self.commits_list = CommitsList(content_frame)
        self.commits_list.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Painel direito - Controles
        right_frame = ttk.Frame(content_frame)
        right_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Salvar versão
        self.save_panel = SaveVersionPanel(right_frame, self.git.config.get('commit_templates', []))
        self.save_panel.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Forks
        self.branches_list = BranchesList(right_frame)
        self.branches_list.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Controle do projeto
        self.project_panel = ProjectControlPanel(right_frame)
        self.project_panel.grid(row=2, column=0, sticky=(tk.W, tk.E))
        
        # Configurar grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(1, weight=1)
        content_frame.columnconfigure(0, weight=2)
        content_frame.columnconfigure(1, weight=1)
        content_frame.rowconfigure(0, weight=1)
        right_frame.columnconfigure(0, weight=1)
    
    def create_header(self, parent):
        """Cria cabeçalho da aplicação"""
        header_frame = ttk.Frame(parent)
        header_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Título
        ttk.Label(header_frame, text="🚀 Controle de Versões", 
                 style='Title.TLabel').pack(side=tk.LEFT)
        
        # Status bar
        self.status_bar = StatusBar(header_frame)
        self.status_bar.pack(side=tk.RIGHT)
        
        header_frame.columnconfigure(0, weight=1)
    
    def connect_events(self):
        """Conecta eventos dos componentes"""
        # Status bar
        self.status_bar.refresh_btn.config(command=self.refresh_all)
        
        # Commits
        self.commits_list.restore_btn.config(command=self.restore_version)
        self.commits_list.fork_btn.config(command=self.create_fork_from_commit)
        self.commits_list.rename_btn.config(command=self.rename_commit)
        self.commits_list.details_btn.config(command=self.show_commit_details)
        
        # Context menu commits
        self.commits_list.context_menu.entryconfig(0, command=self.restore_version)
        self.commits_list.context_menu.entryconfig(1, command=self.create_fork_from_commit)
        self.commits_list.context_menu.entryconfig(3, command=self.rename_commit)
        self.commits_list.context_menu.entryconfig(4, command=self.show_commit_details)
        
        # Duplo clique em commits
        self.commits_list.on_double_click = self.show_commit_details
        
        # Save panel
        self.save_panel.save_btn.config(command=self.save_version)
        
        # Branches
        self.branches_list.new_btn.config(command=self.create_new_fork)
        self.branches_list.switch_btn.config(command=self.switch_fork)
        self.branches_list.rename_btn.config(command=self.rename_fork)
        self.branches_list.delete_btn.config(command=self.delete_fork)
        
        # Context menu branches
        self.branches_list.context_menu.entryconfig(0, command=self.switch_fork)
        self.branches_list.context_menu.entryconfig(1, command=self.rename_fork)
        self.branches_list.context_menu.entryconfig(3, command=self.delete_fork)
        
        # Project panel
        self.project_panel.start_btn.config(command=self.start_dev_server)
        self.project_panel.browser_btn.config(command=self.open_browser)
        self.project_panel.config_btn.config(command=self.show_config)
        self.project_panel.stats_btn.config(command=self.show_stats)
    
    def refresh_all(self):
        """Atualiza todos os dados"""
        self.refresh_commits()
        self.refresh_status()
        self.refresh_branches()
        self.update_status_bar()
    
    def refresh_commits(self):
        """Atualiza lista de commits"""
        commits = self.git.get_commits()
        self.commits_list.load_commits(commits)
    
    def refresh_status(self):
        """Atualiza status dos arquivos"""
        status = self.git.get_status()
        self.save_panel.update_status(status)
    
    def refresh_branches(self):
        """Atualiza lista de branches"""
        branches, current = self.git.get_branches()
        self.branches_list.load_branches(branches)
    
    def update_status_bar(self):
        """Atualiza barra de status"""
        status = self.git.get_status()
        if status:
            self.status_bar.update_status(f"📝 {len(status)} arquivo(s) modificado(s)", 'orange')
        else:
            self.status_bar.update_status("✅ Nenhuma mudança pendente", 'green')
    
    # ========== AÇÕES DE COMMITS ==========
    
    def save_version(self):
        """Salva nova versão"""
        message = self.save_panel.get_message()
        if not message:
            messagebox.showwarning("Aviso", "Digite uma descrição para a versão!")
            return
        
        if not messagebox.askyesno("Confirmar", f"Salvar versão:\n\n'{message}'?"):
            return
        
        def save_in_thread():
            success, result = self.git.create_commit(message)
            self.root.after(0, lambda: self.on_save_complete(success, result, message))
        
        threading.Thread(target=save_in_thread, daemon=True).start()
    
    def on_save_complete(self, success, result, message):
        """Callback do salvamento"""
        if success:
            messagebox.showinfo("Sucesso", f"✅ Versão '{message}' salva!")
            self.save_panel.clear_message()
            self.refresh_all()
        else:
            messagebox.showerror("Erro", f"❌ {result}")
    
    def restore_version(self):
        """Restaura versão selecionada"""
        commit = self.commits_list.get_selected_commit()
        if not commit:
            messagebox.showwarning("Aviso", "Selecione uma versão para restaurar!")
            return
        
        if not messagebox.askyesno("Confirmar", 
                                  f"Restaurar versão:\n\n{commit['hash']} - {commit['message']}?"):
            return
        
        def restore_in_thread():
            success, result = self.git.checkout_commit(commit['full_hash'])
            self.root.after(0, lambda: self.on_restore_complete(success, result))
        
        threading.Thread(target=restore_in_thread, daemon=True).start()
    
    def on_restore_complete(self, success, result):
        """Callback da restauração"""
        if success:
            messagebox.showinfo("Sucesso", f"✅ {result}")
            self.refresh_all()
        else:
            messagebox.showerror("Erro", f"❌ {result}")
    
    def create_fork_from_commit(self):
        """Cria fork do commit selecionado"""
        commit = self.commits_list.get_selected_commit()
        if not commit:
            messagebox.showwarning("Aviso", "Selecione uma versão para criar fork!")
            return
        
        fork_name = simpledialog.askstring(
            "Nome do Fork",
            "Digite um nome para o novo fork:",
            initialvalue=f"fork_{datetime.datetime.now().strftime('%m%d_%H%M')}"
        )
        
        if fork_name:
            success, result = self.git.create_branch(fork_name, commit['full_hash'])
            if success:
                messagebox.showinfo("Sucesso", f"✅ {result}")
                self.refresh_branches()
            else:
                messagebox.showerror("Erro", f"❌ {result}")
    
    def rename_commit(self):
        """Renomeia commit selecionado"""
        commit = self.commits_list.get_selected_commit()
        if not commit:
            messagebox.showwarning("Aviso", "Selecione uma versão para renomear!")
            return
        
        new_message = simpledialog.askstring(
            "Renomear Versão",
            f"Novo nome para a versão {commit['hash']}:",
            initialvalue=commit['message']
        )
        
        if new_message and new_message.strip():
            messagebox.showinfo("Info", 
                              "Para renomear versões, faça checkout para ela e crie uma nova versão com o nome desejado.")
    
    def show_commit_details(self):
        """Mostra detalhes do commit"""
        commit = self.commits_list.get_selected_commit()
        if not commit:
            messagebox.showwarning("Aviso", "Selecione uma versão para ver detalhes!")
            return
        
        dialog = CommitDetailsDialog(self.root, commit)
        result = dialog.show()
        
        if result == 'restore':
            self.restore_version()
        elif result == 'fork':
            self.create_fork_from_commit()
    
    # ========== AÇÕES DE BRANCHES ==========
    
    def create_new_fork(self):
        """Cria novo fork"""
        fork_name = simpledialog.askstring(
            "Novo Fork",
            "Digite um nome para o novo fork:",
            initialvalue=f"fork_{datetime.datetime.now().strftime('%m%d_%H%M')}"
        )
        
        if fork_name:
            success, result = self.git.create_branch(fork_name)
            if success:
                messagebox.showinfo("Sucesso", f"✅ {result}")
                self.refresh_branches()
            else:
                messagebox.showerror("Erro", f"❌ {result}")
    
    def switch_fork(self):
        """Muda para fork selecionado"""
        branch_name = self.branches_list.get_selected_branch()
        if not branch_name:
            messagebox.showwarning("Aviso", "Selecione um fork para mudar!")
            return
        
        success, result = self.git.switch_branch(branch_name)
        if success:
            messagebox.showinfo("Sucesso", f"✅ {result}")
            self.refresh_all()
        else:
            messagebox.showerror("Erro", f"❌ {result}")
    
    def rename_fork(self):
        """Renomeia fork selecionado"""
        old_name = self.branches_list.get_selected_branch()
        if not old_name:
            messagebox.showwarning("Aviso", "Selecione um fork para renomear!")
            return
        
        if old_name in ['main', 'master']:
            messagebox.showwarning("Aviso", "Não é possível renomear a branch principal!")
            return
        
        new_name = simpledialog.askstring(
            "Renomear Fork",
            f"Novo nome para o fork '{old_name}':",
            initialvalue=old_name
        )
        
        if new_name and new_name.strip() and new_name != old_name:
            success, result = self.git.rename_branch(old_name, new_name.strip())
            if success:
                messagebox.showinfo("Sucesso", f"✅ {result}")
                self.refresh_branches()
            else:
                messagebox.showerror("Erro", f"❌ {result}")
    
    def delete_fork(self):
        """Exclui fork selecionado"""
        branch_name = self.branches_list.get_selected_branch()
        if not branch_name:
            messagebox.showwarning("Aviso", "Selecione um fork para excluir!")
            return
        
        if branch_name in ['main', 'master']:
            messagebox.showwarning("Aviso", "Não é possível excluir a branch principal!")
            return
        
        # Verificar se é a branch atual
        branches, current = self.git.get_branches()
        if branch_name == current:
            messagebox.showwarning("Aviso", "Não é possível excluir a branch atual! Mude para outra branch primeiro.")
            return
        
        if messagebox.askyesno("Confirmar", 
                              f"⚠️ Excluir permanentemente o fork '{branch_name}'?", 
                              icon='warning'):
            success, result = self.git.delete_branch(branch_name)
            if success:
                messagebox.showinfo("Sucesso", f"✅ {result}")
                self.refresh_branches()
            else:
                messagebox.showerror("Erro", f"❌ {result}")
    
    # ========== AÇÕES DO PROJETO ==========
    
    def start_dev_server(self):
        """Inicia servidor de desenvolvimento"""
        def start_in_thread():
            success, result = self.project.start_dev_server()
            self.root.after(0, lambda: self.on_dev_start_complete(success, result))
        
        threading.Thread(target=start_in_thread, daemon=True).start()
    
    def on_dev_start_complete(self, success, result):
        """Callback do start do servidor"""
        if success:
            messagebox.showinfo("Sucesso", f"✅ {result}\n\n🌐 Abrindo no navegador em 3 segundos...")
            self.root.after(3000, self.open_browser)
        else:
            messagebox.showerror("Erro", f"❌ {result}")
    
    def open_browser(self):
        """Abre projeto no navegador"""
        success, result = self.project.open_browser()
        if not success:
            messagebox.showerror("Erro", f"❌ {result}")
    
    def show_config(self):
        """Mostra diálogo de configuração"""
        dialog = ConfigDialog(self.root, self.git.config)
        result = dialog.show()
        
        if result:
            # Atualizar configuração
            self.git.config.update(result)
            self.git.save_config()
            self.git.configure_user()
            messagebox.showinfo("Sucesso", "✅ Configurações salvas!")
    
    def show_stats(self):
        """Mostra estatísticas"""
        stats_data = {
            'commits': self.git.get_commits(),
            'branches': self.git.get_branches()[0],
            'current_branch': self.git.get_branches()[1],
            'status': self.git.get_status()
        }
        
        dialog = StatsDialog(self.root, stats_data)
        dialog.show()
    
    # ========== AUTO FUNÇÕES ==========
    
    def schedule_auto_refresh(self):
        """Agenda auto-refresh"""
        self.refresh_status()  # Só atualizar status para não sobrecarregar
        self.update_status_bar()
        self.root.after(5000, self.schedule_auto_refresh)  # 5 segundos
    
    def schedule_auto_backup(self):
        """Agenda auto-backup"""
        if self.git.config.get('auto_backup', True):
            status = self.git.get_status()
            if status:  # Só fazer backup se houver mudanças
                timestamp = datetime.datetime.now().strftime('%H:%M')
                success, result = self.git.create_commit(f"Auto-backup {timestamp}")
                if success:
                    self.status_bar.update_status(f"💾 Auto-backup {timestamp}", 'blue')
                    self.root.after(1000, self.refresh_commits)
        
        # Reagendar
        if self.git.config.get('auto_backup', True):
            self.root.after(30000, self.schedule_auto_backup)  # 30 segundos
    
    def run(self):
        """Executa a aplicação"""
        self.root.mainloop()


def find_project_directory():
    """Encontra diretório do projeto"""
    current_dir = os.getcwd()
    
    # Possíveis caminhos
    possible_paths = [
        current_dir,
        r'C:\Users\adw73\Desktop\orcamento_rev1',
        os.path.join(os.path.dirname(current_dir), 'orcamento_rev1'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path) and os.path.exists(os.path.join(path, 'package.json')):
            return path
    
    # Se não encontrar, pedir ao usuário
    import tkinter.filedialog as filedialog
    root = tk.Tk()
    root.withdraw()
    
    project_dir = filedialog.askdirectory(
        title="Selecione o diretório do projeto orcamento_rev1"
    )
    root.destroy()
    
    return project_dir if project_dir else None


def main():
    """Função principal"""
    print("🚀 Iniciando Sistema de Controle de Versões...")
    
    # Encontrar diretório do projeto
    project_dir = find_project_directory()
    
    if not project_dir:
        print("❌ Diretório do projeto não encontrado.")
        return
    
    print(f"📁 Projeto encontrado: {project_dir}")
    
    try:
        # Criar e executar aplicação
        app = VersionControlApp(project_dir)
        app.run()
    except Exception as e:
        print(f"❌ Erro ao iniciar aplicação: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

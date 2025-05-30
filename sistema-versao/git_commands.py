#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de comandos Git - Sistema de Controle de Versões
Gerencia todas as operações Git do projeto
"""

import subprocess
import os
import json
from pathlib import Path


class GitCommands:
    def __init__(self, project_path):
        self.project_path = project_path
        self.config_file = os.path.join(project_path, 'sistema-versao', '.git-config.json')
        self.load_config()
    
    def load_config(self):
        """Carrega configurações do Git"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
            else:
                self.config = {
                    'user_name': 'Usuario',
                    'user_email': 'usuario@local',
                    'auto_backup': True,
                    'commit_templates': [
                        'feat: nova funcionalidade',
                        'fix: correção de bug',
                        'refactor: melhoria de código',
                        'style: ajustes visuais',
                        'docs: atualização documentação'
                    ]
                }
                self.save_config()
        except Exception as e:
            print(f"Erro ao carregar config: {e}")
            self.config = {}
    
    def save_config(self):
        """Salva configurações"""
        try:
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Erro ao salvar config: {e}")
    
    def run_command(self, command):
        """Executa comando git"""
        try:
            os.chdir(self.project_path)
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                encoding='utf-8'
            )
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            return False, "", str(e)
    
    def initialize(self):
        """Inicializa repositório git"""
        if not os.path.exists(os.path.join(self.project_path, '.git')):
            success, stdout, stderr = self.run_command('git init')
            if success:
                self.configure_user()
                return True
            return False
        return True
    
    def configure_user(self):
        """Configura usuário Git"""
        if self.config.get('user_name'):
            self.run_command(f'git config user.name "{self.config["user_name"]}"')
        if self.config.get('user_email'):
            self.run_command(f'git config user.email "{self.config["user_email"]}"')
    
    def get_commits(self):
        """Obtém lista de commits"""
        success, stdout, stderr = self.run_command('git rev-list --count HEAD')
        if not success or stdout.strip() == '0':
            return []
        
        success, stdout, stderr = self.run_command(
            'git log --oneline --pretty=format:"%H|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M" -20'
        )
        
        if success:
            commits = []
            for line in stdout.strip().split('\n'):
                if line.strip() and '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 4:
                        commits.append({
                            'hash': parts[0][:7],
                            'full_hash': parts[0],
                            'date': parts[1],
                            'author': parts[2],
                            'message': parts[3]
                        })
            return commits
        return []
    
    def get_status(self):
        """Obtém status dos arquivos"""
        success, stdout, stderr = self.run_command('git status --porcelain')
        if success:
            files = []
            for line in stdout.strip().split('\n'):
                if line.strip():
                    status = line[:2]
                    file_path = line[3:]
                    files.append({'status': status, 'file': file_path})
            return files
        return []
    
    def create_commit(self, message):
        """Cria um novo commit"""
        self.configure_user()
        self.run_command('git add .')
        success, stdout, stderr = self.run_command(f'git commit -m "{message}" --allow-empty')
        if success:
            return True, "Commit criado com sucesso!"
        return False, f"Erro: {stderr}"
    
    def checkout_commit(self, commit_hash):
        """Faz checkout para um commit"""
        status = self.get_status()
        if status:
            self.run_command('git stash push -m "Auto-stash"')
        
        success, stdout, stderr = self.run_command(f'git checkout {commit_hash}')
        if success:
            return True, f"Versão {commit_hash} restaurada!"
        return False, f"Erro: {stderr}"
    
    def get_branches(self):
        """Obtém lista de branches"""
        success, stdout, stderr = self.run_command('git branch')
        if success:
            branches = []
            current = None
            for line in stdout.strip().split('\n'):
                line = line.strip()
                if line.startswith('*'):
                    current = line[2:].strip()
                    branches.append({'name': current, 'current': True})
                elif line:
                    branches.append({'name': line, 'current': False})
            return branches, current
        return [], None
    
    def create_branch(self, name, from_commit=None):
        """Cria nova branch"""
        if from_commit:
            command = f'git checkout -b {name} {from_commit}'
        else:
            command = f'git checkout -b {name}'
        
        success, stdout, stderr = self.run_command(command)
        if success:
            return True, f"Fork '{name}' criado!"
        return False, f"Erro: {stderr}"
    
    def switch_branch(self, name):
        """Muda para branch"""
        success, stdout, stderr = self.run_command(f'git checkout {name}')
        if success:
            return True, f"Mudou para '{name}'"
        return False, f"Erro: {stderr}"
    
    def rename_branch(self, old_name, new_name):
        """Renomeia branch"""
        branches, current = self.get_branches()
        branch_names = [b['name'] for b in branches]
        
        if old_name not in branch_names:
            return False, f"Fork '{old_name}' não encontrado"
        
        if new_name in branch_names:
            return False, f"Fork '{new_name}' já existe"
        
        success, stdout, stderr = self.run_command(f'git branch -m {old_name} {new_name}')
        if success:
            return True, f"Fork renomeado para '{new_name}'"
        return False, f"Erro: {stderr}"
    
    def delete_branch(self, name):
        """Exclui branch"""
        success, stdout, stderr = self.run_command(f'git branch -D {name}')
        if success:
            return True, f"Fork '{name}' excluído"
        return False, f"Erro: {stderr}"

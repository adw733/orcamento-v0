#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de comandos do projeto - Sistema de Controle de Versões
Gerencia comandos específicos do projeto (npm, dev server, etc.)
"""

import subprocess
import os
import webbrowser
import json


class ProjectCommands:
    def __init__(self, project_path):
        self.project_path = project_path
    
    def run_command(self, command, use_console=False):
        """Executa comando do projeto"""
        try:
            os.chdir(self.project_path)
            
            if use_console:
                # Para comandos que ficam rodando (dev server)
                process = subprocess.Popen(
                    command,
                    shell=True,
                    creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
                )
                return True, f"Processo iniciado (PID: {process.pid})", process
            else:
                # Para comandos simples
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
    
    def kill_port_3000(self):
        """Mata processos na porta 3000"""
        try:
            if os.name == 'nt':  # Windows
                # Encontrar PIDs na porta 3000
                find_cmd = 'netstat -aon | findstr :3000'
                result = subprocess.run(find_cmd, shell=True, capture_output=True, text=True)
                
                pids = set()
                for line in result.stdout.strip().split('\n'):
                    parts = line.strip().split()
                    if len(parts) >= 5 and parts[-1].isdigit():
                        pids.add(parts[-1])
                
                # Matar processos
                for pid in pids:
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
            else:  # Linux/Mac
                subprocess.run("pkill -f ':3000'", shell=True, capture_output=True)
        except Exception as e:
            print(f"Erro ao matar processos: {e}")
    
    def check_package_json(self):
        """Verifica se package.json existe"""
        return os.path.exists(os.path.join(self.project_path, 'package.json'))
    
    def get_available_commands(self):
        """Obtém comandos disponíveis para o projeto"""
        commands = []
        
        # Verificar gerenciadores de pacotes
        package_managers = [
            ('npm', ['npm run dev', 'npm start']),
            ('yarn', ['yarn dev', 'yarn start']),
            ('pnpm', ['pnpm dev', 'pnpm start'])
        ]
        
        for manager, cmds in package_managers:
            try:
                result = subprocess.run(f'{manager} --version', shell=True, 
                                      capture_output=True, check=True)
                commands.extend(cmds)
                break  # Usar o primeiro disponível
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        return commands
    
    def start_dev_server(self):
        """Inicia servidor de desenvolvimento"""
        if not self.check_package_json():
            return False, "package.json não encontrado!"
        
        # Matar processos antigos
        self.kill_port_3000()
        
        # Tentar comandos disponíveis
        commands = self.get_available_commands()
        
        for cmd in commands:
            if 'dev' in cmd:  # Priorizar comandos dev
                success, output, process_or_error = self.run_command(cmd, use_console=True)
                if success:
                    return True, f"Servidor iniciado: {cmd}"
        
        return False, "Nenhum gerenciador de pacotes encontrado"
    
    def install_dependencies(self):
        """Instala dependências do projeto"""
        if not self.check_package_json():
            return False, "package.json não encontrado!"
        
        # Tentar diferentes gerenciadores
        managers = ['npm install', 'yarn install', 'pnpm install']
        
        for cmd in managers:
            manager = cmd.split()[0]
            try:
                # Verificar se o gerenciador existe
                subprocess.run(f'{manager} --version', shell=True, 
                             capture_output=True, check=True)
                
                # Executar instalação
                success, output, error = self.run_command(cmd)
                if success:
                    return True, f"Dependências instaladas com {manager}"
                    
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        return False, "Nenhum gerenciador de pacotes encontrado"
    
    def open_browser(self, url="http://localhost:3000"):
        """Abre projeto no navegador"""
        try:
            webbrowser.open(url)
            return True, f"Abrindo {url}"
        except Exception as e:
            return False, f"Erro ao abrir navegador: {e}"
    
    def check_project_status(self):
        """Verifica status do projeto"""
        status = {
            'package_json': self.check_package_json(),
            'node_modules': os.path.exists(os.path.join(self.project_path, 'node_modules')),
            'available_commands': self.get_available_commands(),
            'vercel_cli': self.check_vercel_cli()
        }
        return status
    
    def check_vercel_cli(self):
        """Verifica se Vercel CLI está instalado"""
        try:
            result = subprocess.run('vercel --version', shell=True, 
                                  capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def install_vercel_cli(self):
        """Instala Vercel CLI globalmente"""
        commands = ['npm install -g vercel', 'yarn global add vercel', 'pnpm add -g vercel']
        
        for cmd in commands:
            manager = cmd.split()[0]
            try:
                # Verificar se o gerenciador existe
                subprocess.run(f'{manager} --version', shell=True, 
                             capture_output=True, check=True)
                
                # Instalar Vercel CLI
                success, output, error = self.run_command(cmd)
                if success:
                    return True, f"Vercel CLI instalado com {manager}"
                    
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        return False, "Nenhum gerenciador de pacotes encontrado para instalar Vercel CLI"
    
    def vercel_login(self):
        """Faz login na Vercel"""
        if not self.check_vercel_cli():
            return False, "Vercel CLI não está instalado"
        
        try:
            os.chdir(self.project_path)
            # Usar subprocess.Popen para abrir em nova janela
            process = subprocess.Popen(
                'vercel login',
                shell=True,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            return True, "Abrindo login da Vercel..."
        except Exception as e:
            return False, f"Erro ao fazer login: {e}"
    
    def vercel_deploy(self, production=False):
        """Faz deploy para Vercel"""
        if not self.check_vercel_cli():
            return False, "Vercel CLI não está instalado"
        
        try:
            os.chdir(self.project_path)
            
            if production:
                command = 'vercel --prod'
                deploy_type = "produção"
            else:
                command = 'vercel'
                deploy_type = "preview"
            
            # Executar deploy em nova janela de console
            process = subprocess.Popen(
                command,
                shell=True,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            
            return True, f"Deploy de {deploy_type} iniciado! Acompanhe no console..."
            
        except Exception as e:
            return False, f"Erro no deploy: {e}"
    
    def get_vercel_projects(self):
        """Obtém lista de projetos na Vercel"""
        if not self.check_vercel_cli():
            return False, "Vercel CLI não está instalado", []
        
        try:
            os.chdir(self.project_path)
            success, output, error = self.run_command('vercel ls --format json')
            
            if success:
                try:
                    projects = json.loads(output)
                    return True, "Projetos obtidos", projects
                except json.JSONDecodeError:
                    return False, "Erro ao processar lista de projetos", []
            else:
                return False, f"Erro: {error}", []
                
        except Exception as e:
            return False, f"Erro: {e}", []
    
    def open_vercel_dashboard(self):
        """Abre dashboard da Vercel"""
        try:
            webbrowser.open("https://vercel.com/dashboard")
            return True, "Abrindo dashboard da Vercel"
        except Exception as e:
            return False, f"Erro ao abrir dashboard: {e}"
    
    def check_vercel_config(self):
        """Verifica se existe configuração da Vercel"""
        vercel_json = os.path.join(self.project_path, 'vercel.json')
        return os.path.exists(vercel_json)
    
    def create_vercel_config(self):
        """Cria configuração básica da Vercel para Next.js"""
        vercel_config = {
            "buildCommand": "npm run build",
            "outputDirectory": ".next",
            "devCommand": "npm run dev",
            "installCommand": "npm install",
            "framework": "nextjs"
        }
        
        try:
            vercel_json_path = os.path.join(self.project_path, 'vercel.json')
            with open(vercel_json_path, 'w', encoding='utf-8') as f:
                json.dump(vercel_config, f, indent=2)
            return True, "Arquivo vercel.json criado"
        except Exception as e:
            return False, f"Erro ao criar vercel.json: {e}"

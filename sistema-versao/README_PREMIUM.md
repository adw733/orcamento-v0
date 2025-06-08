# 🚀 Sistema de Controle de Versões Premium v2.0

Uma versão totalmente redesenhada do gerenciador de versões com interface moderna, terminal integrado e funcionalidades avançadas.

## ✨ Principais Funcionalidades

### 📊 Dashboard Avançado
- **Estatísticas em tempo real**: Commits, branches, arquivos modificados
- **Monitor do sistema**: CPU, memória, disco
- **Atividade recente**: Histórico de ações e commits
- **Cards visuais** com informações importantes

### 📦 Controle de Versões Aprimorado
- **Interface moderna** com CustomTkinter
- **Gestão completa de commits** e branches
- **Visualização de histórico** com Treeview interativo
- **Ações rápidas** para Git (pull, push, stash, reset)
- **Criação de tags** e gerenciamento avançado

### 💻 Terminal Integrado
- **Terminal embutido** na aplicação
- **Suporte múltiplos shells**: WSL, CMD, PowerShell, Git Bash
- **Integração com Claude Code** - botão direto para iniciar
- **Comandos frequentes** com botões rápidos
- **Histórico de comandos** persistente

### 🚀 Deploy Automático
- **Integração completa com Vercel**
- **Deploy preview e production**
- **Logs em tempo real** de deploy
- **Comandos NPM** integrados (install, build, dev)
- **Status de autenticação** visual

### 🛠️ Ferramentas Avançadas
- **Git Tools**: Tag, reset, clean, blame, graph, bisect
- **File Tools**: Busca, análise de código, backup, limpeza de cache
- **System Tools**: Monitor, diagnósticos, QR code, temas
- **Editor de configurações** com interface gráfica

### 🎨 Interface Moderna
- **Tema escuro/claro** configurável
- **Layout responsivo** com abas organizadas
- **Ícones intuitivos** para todas as ações
- **Barra de status** com informações em tempo real
- **Janelas modais** para ações específicas

## 🔧 Instalação

### Requisitos
- Python 3.8+
- Git instalado
- WSL (para terminal integrado)
- Node.js (para projetos Next.js)

### Instalação Automática

1. **Execute o instalador**:
   ```bash
   instalar_premium.bat
   ```

2. **Inicie o sistema**:
   ```bash
   executar_premium.bat
   ```

### Instalação Manual

1. **Instale as dependências**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Execute o sistema**:
   ```bash
   python gerenciador_versao_premium.py
   ```

## 📋 Dependências

- **CustomTkinter**: Interface moderna
- **psutil**: Monitoramento do sistema
- **Pillow**: Processamento de imagens
- **qrcode**: Geração de QR codes

## 🚀 Como Usar

### 1. Dashboard
- Visualize estatísticas do projeto em tempo real
- Monitore recursos do sistema
- Acompanhe atividade recente

### 2. Git & Versões
- **Salvar versão**: Digite descrição e clique em "Salvar Versão"
- **Navegar histórico**: Duplo clique em versão para opções
- **Gerenciar branches**: Criar, trocar, renomear branches
- **Ações rápidas**: Pull, push, stash com um clique

### 3. Terminal
- **Comando rápido**: Digite no campo inferior e pressione Enter
- **Claude Code**: Clique no botão para iniciar automaticamente
- **Múltiplos shells**: Selecione WSL, CMD, PowerShell ou Git Bash
- **Comandos frequentes**: Botões para comandos comuns

### 4. Deploy
- **Login Vercel**: Configure autenticação
- **Deploy preview**: Teste antes da produção
- **Deploy production**: Publique versão final
- **Logs**: Acompanhe progresso em tempo real

### 5. Ferramentas
- **Git avançado**: Blame, graph, tags, reset
- **Análise**: Estatísticas e estrutura do projeto
- **Sistema**: Monitor, diagnósticos, configurações
- **Backup**: Crie cópias de segurança

## ⚙️ Configurações

### Terminal
- **Shell padrão**: WSL, CMD, PowerShell, Git Bash
- **Caminho Claude Code**: Personalizar comando do Claude

### Git
- **Nome do usuário**: Configuração global
- **Email**: Para commits

### Interface
- **Tema**: Escuro ou claro
- **Auto-refresh**: Atualização automática dos dados

## 🔍 Funcionalidades Especiais

### 🤖 Integração Claude Code
- Botão direto para iniciar Claude Code no WSL
- Configuração personalizada do caminho
- Execução automática no diretório do projeto

### 📱 QR Code
- Gere QR code para localhost:3000
- Acesso rápido via mobile durante desenvolvimento

### 📊 Diagnósticos
- Verificação completa do ambiente
- Status de Git, Node.js, NPM, Vercel CLI
- Análise da estrutura do projeto

### 🎨 Temas
- Modo escuro/claro
- Salvamento automático de preferências
- Aplicação instantânea

## 🚨 Solução de Problemas

### Erro "CustomTkinter não encontrado"
```bash
pip install customtkinter
```

### Erro "WSL não encontrado"
- Instale WSL2 no Windows
- Configure distribuição Ubuntu

### Claude Code não inicia
- Verifique se Claude Code está instalado no WSL
- Configure o caminho correto nas configurações

### Deploy Vercel falha
- Execute `vercel login` manualmente
- Verifique se o projeto é Next.js válido

## 📈 Recursos Avançados

### Backup Automático
- Cria backup completo do projeto
- Exclui automaticamente node_modules e cache
- Nomeia com timestamp para organização

### Monitor do Sistema
- Atualização em tempo real de CPU, RAM, disco
- Contagem de processos Node.js ativos
- Informações detalhadas do ambiente

### Análise de Código
- Contagem de tipos de arquivo
- Estatísticas do projeto
- Estrutura e organização

## 🔄 Atualizações

O sistema verifica e atualiza automaticamente:
- Status do Git a cada ação
- Informações do sistema periodicamente
- Logs de deploy em tempo real
- Relógio na barra de status

## 💡 Dicas de Uso

1. **Atalhos**: Use duplo clique nas listas para ações rápidas
2. **Terminal**: Comandos frequentes têm botões dedicados
3. **Configurações**: Personalize conforme seu fluxo de trabalho
4. **Backup**: Execute backup antes de grandes mudanças
5. **Monitor**: Acompanhe recursos durante desenvolvimento

## 📞 Suporte

Para problemas ou sugestões:
- Verifique os logs no terminal integrado
- Execute diagnósticos na aba Ferramentas
- Configure corretamente Git e Node.js

---

**Desenvolvido com ❤️ para facilitar o desenvolvimento Next.js**
#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Iniciando Setup do Ambiente de Desenvolvimento (VPS Ubuntu 24.04)${NC}"

# 1. Update e Dependências Básicas
echo -e "${GREEN}>>> Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential net-tools htop

# 2. Instalar Docker & Docker Compose
echo -e "${GREEN}>>> Instalando Docker...${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
# Dar permissão ao usuário atual para usar docker sem sudo
sudo usermod -aG docker $USER
rm get-docker.sh

# 3. Instalar Node.js (LTS) via NVM
echo -e "${GREEN}>>> Instalando Node.js...${NC}"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts
nvm use --lts
npm install -g pm2 yarn pnpm

# 4. Instalar Supabase CLI
echo -e "${GREEN}>>> Instalando Supabase CLI...${NC}"
# Usando homebrew se disponível ou script direto. No linux, script direto é melhor para dev env simples, 
# mas supabase recomenda brew. Vamos usar o binário direto via script oficial se existir, ou brew.
# Brew no linux:
NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Adicionar brew ao path (assumindo linuxbrew padrão)
test -d /home/linuxbrew/.linuxbrew && eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
echo "eval \"\$($(brew --prefix)/bin/brew shellenv)\"" >> ~/.bashrc
brew install supabase/tap/supabase

# 5. Configurar Firewalls básicos (UFW)
echo -e "${GREEN}>>> Configurando Firewall (UFW)...${NC}"
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 8083/tcp # Frontend Dev
sudo ufw allow 54321/tcp # Supabase Studio/API
sudo ufw allow 8085/tcp  # Evolution API
sudo ufw enable

echo -e "${BLUE}>>> Setup finalizado!${NC}"
echo -e "Por favor, faça logout e login novamente para aplicar as permissões do Docker."
echo -e "Depois, clone seu repositório e rode:"
echo -e "1. 'npm install'"
echo -e "2. 'supabase start'"
echo -e "3. 'docker compose up -d' (para Evolution)"

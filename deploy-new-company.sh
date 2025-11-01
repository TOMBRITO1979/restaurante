#!/bin/bash

# ============================================
# Script de Deploy para Nova Empresa
# ============================================
#
# Este script facilita o deploy de uma nova instância
# do sistema para uma empresa específica.
#
# Uso:
#   ./deploy-new-company.sh empresa-nome
#
# Exemplo:
#   ./deploy-new-company.sh pizzaria-sul
#

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar argumentos
if [ -z "$1" ]; then
    echo -e "${RED}Erro: Nome da empresa não fornecido${NC}"
    echo "Uso: $0 <nome-empresa>"
    echo "Exemplo: $0 pizzaria-sul"
    exit 1
fi

COMPANY_NAME="$1"
STACK_NAME="restaurante_${COMPANY_NAME}"
ENV_FILE=".env.${COMPANY_NAME}"
STACK_FILE="docker-stack-${COMPANY_NAME}.yml"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploy: ${COMPANY_NAME}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================
# 1. Verificar arquivo .env
# ============================================

echo -e "${YELLOW}[1/6] Verificando arquivo de ambiente...${NC}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Erro: Arquivo $ENV_FILE não encontrado${NC}"
    echo ""
    echo "Crie o arquivo de ambiente primeiro:"
    echo "  cp .env.example $ENV_FILE"
    echo "  nano $ENV_FILE"
    echo ""
    echo "Configure as variáveis:"
    echo "  - FRONTEND_DOMAIN=empresa.com"
    echo "  - BACKEND_DOMAIN=api.empresa.com"
    echo "  - JWT_SECRET=..."
    echo "  - etc."
    exit 1
fi

# Carregar variáveis
source "$ENV_FILE"

# Validar variáveis obrigatórias
if [ -z "$FRONTEND_DOMAIN" ] || [ -z "$BACKEND_DOMAIN" ]; then
    echo -e "${RED}Erro: FRONTEND_DOMAIN e BACKEND_DOMAIN devem estar definidos em $ENV_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Arquivo de ambiente encontrado${NC}"
echo "  Frontend: https://$FRONTEND_DOMAIN"
echo "  Backend: https://$BACKEND_DOMAIN"
echo ""

# ============================================
# 2. Verificar DNS
# ============================================

echo -e "${YELLOW}[2/6] Verificando DNS...${NC}"

if host "$FRONTEND_DOMAIN" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DNS configurado para $FRONTEND_DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠ Aviso: DNS não configurado para $FRONTEND_DOMAIN${NC}"
    echo "  Configure o DNS antes de continuar para evitar problemas com SSL"
fi

if host "$BACKEND_DOMAIN" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DNS configurado para $BACKEND_DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠ Aviso: DNS não configurado para $BACKEND_DOMAIN${NC}"
fi
echo ""

# ============================================
# 3. Build do Frontend
# ============================================

echo -e "${YELLOW}[3/6] Building frontend com API URL personalizada...${NC}"

cd frontend

docker build \
  --no-cache \
  --build-arg VITE_API_URL="https://${BACKEND_DOMAIN}" \
  -t "r.chatwell.pro/restaurante-frontend:${COMPANY_NAME}" \
  .

echo -e "${GREEN}✓ Frontend build completo${NC}"
echo ""

cd ..

# ============================================
# 4. Build do Backend (se necessário)
# ============================================

echo -e "${YELLOW}[4/6] Verificando backend image...${NC}"

if ! docker image inspect r.chatwell.pro/restaurante-backend:latest > /dev/null 2>&1; then
    echo "Building backend..."
    cd backend
    docker build -t r.chatwell.pro/restaurante-backend:latest .
    cd ..
    echo -e "${GREEN}✓ Backend build completo${NC}"
else
    echo -e "${GREEN}✓ Backend image já existe${NC}"
fi
echo ""

# ============================================
# 5. Criar Stack File
# ============================================

echo -e "${YELLOW}[5/6] Criando stack file...${NC}"

cat > "$STACK_FILE" << STACKEOF
version: '3.8'

services:
  backend_${COMPANY_NAME}:
    image: r.chatwell.pro/restaurante-backend:latest
    env_file:
      - ${ENV_FILE}
    networks:
      - network_public
      - restaurante_internal
    deploy:
      replicas: 1
      labels:
        - traefik.enable=true
        - traefik.docker.network=network_public
        - traefik.http.routers.${STACK_NAME}-backend.rule=Host(\`${BACKEND_DOMAIN}\`)
        - traefik.http.routers.${STACK_NAME}-backend.entrypoints=websecure
        - traefik.http.routers.${STACK_NAME}-backend.tls.certresolver=letsencrypt
        - traefik.http.services.${STACK_NAME}-backend.loadbalancer.server.port=3000
      restart_policy:
        condition: on-failure

  frontend_${COMPANY_NAME}:
    image: r.chatwell.pro/restaurante-frontend:${COMPANY_NAME}
    networks:
      - network_public
    deploy:
      replicas: 1
      labels:
        - traefik.enable=true
        - traefik.docker.network=network_public
        - traefik.http.routers.${STACK_NAME}-frontend.rule=Host(\`${FRONTEND_DOMAIN}\`)
        - traefik.http.routers.${STACK_NAME}-frontend.entrypoints=websecure
        - traefik.http.routers.${STACK_NAME}-frontend.tls.certresolver=letsencrypt
        - traefik.http.services.${STACK_NAME}-frontend.loadbalancer.server.port=80
      restart_policy:
        condition: on-failure

networks:
  network_public:
    external: true
  restaurante_internal:
    external: true

STACKEOF

echo -e "${GREEN}✓ Stack file criado: $STACK_FILE${NC}"
echo ""

# ============================================
# 6. Deploy
# ============================================

echo -e "${YELLOW}[6/6] Fazendo deploy no Docker Swarm...${NC}"

docker stack deploy -c "$STACK_FILE" "$STACK_NAME"

echo -e "${GREEN}✓ Deploy completo!${NC}"
echo ""

# ============================================
# Informações finais
# ============================================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploy Concluído!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Stack: $STACK_NAME"
echo "Frontend: https://$FRONTEND_DOMAIN"
echo "Backend: https://$BACKEND_DOMAIN"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo ""
echo "1. Aguarde os certificados SSL serem gerados (1-2 minutos)"
echo "   docker service logs ${STACK_NAME}_frontend_${COMPANY_NAME}"
echo ""
echo "2. Acesse o sistema como SUPER_ADMIN:"
echo "   https://$FRONTEND_DOMAIN"
echo ""
echo "3. Crie a empresa no menu 'Empresas'"
echo ""
echo "4. Crie um usuário ADMIN para a empresa"
echo ""
echo "5. Faça login com o admin e configure a empresa"
echo ""
echo "Verificar status dos serviços:"
echo "  docker stack ps $STACK_NAME"
echo ""
echo "Visualizar logs:"
echo "  docker service logs -f ${STACK_NAME}_backend_${COMPANY_NAME}"
echo "  docker service logs -f ${STACK_NAME}_frontend_${COMPANY_NAME}"
echo ""


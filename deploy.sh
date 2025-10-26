#!/bin/bash

# Script de deploy para Docker Swarm
# Execute este script no servidor VPS

set -e

echo "========================================="
echo "Deploy Restaurante SaaS"
echo "========================================="

# Carregar variáveis de ambiente
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Erro: Arquivo .env não encontrado!"
    exit 1
fi

# Verificar variáveis obrigatórias
REQUIRED_VARS=(
    "FRONTEND_DOMAIN"
    "BACKEND_DOMAIN"
    "FRONTEND_URL"
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Erro: Variável $var não está definida no .env"
        exit 1
    fi
done

echo "1. Fazendo login no Docker Hub..."
if [ -z "${DOCKER_HUB_TOKEN}" ]; then
    echo "Erro: Variável DOCKER_HUB_TOKEN não está definida"
    echo "Execute: export DOCKER_HUB_TOKEN='seu-token'"
    exit 1
fi
echo "${DOCKER_HUB_TOKEN}" | docker login -u tomautomations --password-stdin

echo ""
echo "2. Building Backend image..."
cd backend
docker build -t tomautomations/restaurante-backend:latest .
cd ..

echo ""
echo "3. Building Frontend image..."
cd frontend
docker build \
  --build-arg VITE_API_URL=https://${BACKEND_DOMAIN} \
  -t tomautomations/restaurante-frontend:latest .
cd ..

echo ""
echo "4. Pushing images to Docker Hub..."
docker push tomautomations/restaurante-backend:latest
docker push tomautomations/restaurante-frontend:latest

echo ""
echo "5. Verificando rede network_public..."
if ! docker network ls | grep -q network_public; then
    echo "Criando rede network_public..."
    docker network create --driver overlay network_public
else
    echo "Rede network_public já existe"
fi

echo ""
echo "6. Removendo stack anterior (se existir)..."
docker stack rm restaurante || true
echo "Aguardando remoção completa..."
sleep 10

echo ""
echo "7. Fazendo deploy da stack..."
docker stack deploy -c docker-stack.yml restaurante

echo ""
echo "========================================="
echo "Deploy concluído com sucesso!"
echo "========================================="
echo ""
echo "Verificar status dos serviços:"
echo "  docker service ls"
echo ""
echo "Ver logs:"
echo "  docker service logs -f restaurante_backend"
echo "  docker service logs -f restaurante_frontend"
echo ""
echo "URLs configuradas:"
echo "  Frontend: https://${FRONTEND_DOMAIN}"
echo "  Backend:  https://${BACKEND_DOMAIN}"
echo ""
echo "IMPORTANTE:"
echo "1. Certifique-se de que os DNS apontam para este servidor"
echo "2. Configure as credenciais AWS S3 no arquivo .env quando disponível"
echo "3. Configure as credenciais SMTP no arquivo .env quando disponível"
echo "4. Acesse o Traefik para verificar os certificados SSL"
echo ""

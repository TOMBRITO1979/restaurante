#!/bin/bash

# Script para fazer build e push das imagens Docker
# Execute no servidor VPS ou localmente com Docker instalado

set -e

echo "========================================="
echo "🐳 Build e Push das Imagens Docker"
echo "========================================="
echo ""

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    exit 1
fi

# Login no Docker Hub
echo "🔐 Fazendo login no Docker Hub..."
if [ -z "$DOCKER_HUB_TOKEN" ]; then
    echo "❌ Variável DOCKER_HUB_TOKEN não definida!"
    echo "Execute: export DOCKER_HUB_TOKEN='seu-token'"
    exit 1
fi
echo "$DOCKER_HUB_TOKEN" | docker login -u tomautomations --password-stdin

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer login no Docker Hub!"
    exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""

# Build Backend
echo "🏗️  Building Backend..."
cd backend
docker build -t tomautomations/restaurante-backend:latest .
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build do backend!"
    exit 1
fi
cd ..
echo "✅ Backend build concluído!"
echo ""

# Build Frontend
echo "🏗️  Building Frontend..."
cd frontend
docker build \
  --build-arg VITE_API_URL=https://rapi.chatwell.pro \
  -t tomautomations/restaurante-frontend:latest .
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build do frontend!"
    exit 1
fi
cd ..
echo "✅ Frontend build concluído!"
echo ""

# Push Backend
echo "📤 Pushing Backend para Docker Hub..."
docker push tomautomations/restaurante-backend:latest
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer push do backend!"
    exit 1
fi
echo "✅ Backend enviado com sucesso!"
echo ""

# Push Frontend
echo "📤 Pushing Frontend para Docker Hub..."
docker push tomautomations/restaurante-frontend:latest
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer push do frontend!"
    exit 1
fi
echo "✅ Frontend enviado com sucesso!"
echo ""

echo "========================================="
echo "✅ IMAGENS PRONTAS!"
echo "========================================="
echo ""
echo "📦 Imagens disponíveis:"
echo "   - tomautomations/restaurante-backend:latest"
echo "   - tomautomations/restaurante-frontend:latest"
echo ""
echo "🚀 Próximo passo:"
echo "   Fazer deploy via Portainer"
echo ""

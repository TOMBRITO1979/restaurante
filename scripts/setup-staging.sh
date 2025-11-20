#!/bin/bash

# ✅ STAGING: Setup do Ambiente de Staging para Testes
# Cria ambiente isolado para testar restauração de backups

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $@${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $@${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $@${NC}"
}

log_error() {
    echo -e "${RED}❌ $@${NC}"
}

log_info "═══════════════════════════════════════════════════════"
log_info "Setup Ambiente Staging - ChefWell"
log_info "═══════════════════════════════════════════════════════"

# Verificar se Docker Compose está disponível
if ! command -v docker &> /dev/null; then
    log_error "Docker não encontrado!"
    exit 1
fi

log_info "🔍 Verificando se staging já está rodando..."

# Parar staging se já existir
if docker ps -a | grep -q chefwell_postgres_staging; then
    log_warning "Staging já existe. Removendo..."
    cd /root/restaurante/staging
    docker compose -f docker-compose.staging.yml down -v 2>/dev/null || true
fi

log_info "🚀 Iniciando ambiente staging..."

cd /root/restaurante/staging
docker compose -f docker-compose.staging.yml up -d

log_info "⏳ Aguardando PostgreSQL staging estar pronto..."

# Aguardar PostgreSQL
for i in {1..30}; do
    if docker exec chefwell_postgres_staging pg_isready -U postgres > /dev/null 2>&1; then
        log_success "PostgreSQL staging pronto!"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "Timeout aguardando PostgreSQL staging"
        exit 1
    fi
    sleep 1
done

log_info "⏳ Aguardando backend staging estar pronto..."

# Aguardar backend
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_success "Backend staging pronto!"
        break
    fi
    if [ $i -eq 30 ]; then
        log_warning "Backend staging demorou para responder, mas container está rodando"
        break
    fi
    sleep 1
done

log_info ""
log_info "═══════════════════════════════════════════════════════"
log_success "Ambiente staging criado com sucesso!"
log_info "═══════════════════════════════════════════════════════"
log_info ""
log_info "📊 Containers Staging:"
docker ps --filter "name=chefwell.*staging" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
log_info ""
log_info "🌐 Endpoints:"
log_info "   - PostgreSQL: localhost:5433"
log_info "   - Backend API: http://localhost:3001"
log_info "   - Health: http://localhost:3001/health"
log_info ""
log_success "Staging pronto para testes de restauração!"

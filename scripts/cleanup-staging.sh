#!/bin/bash

# ✅ STAGING: Limpeza do Ambiente Staging
# Remove containers, volumes e libera recursos

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $@${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $@${NC}"
}

log_info "═══════════════════════════════════════════════════════"
log_info "Limpeza do Ambiente Staging - ChefWell"
log_info "═══════════════════════════════════════════════════════"

cd /root/restaurante/staging

log_info "🗑️  Parando e removendo containers staging..."
docker compose -f docker-compose.staging.yml down -v 2>/dev/null || true

log_info "🗑️  Removendo imagens staging..."
docker rmi staging-backend_staging 2>/dev/null || true

log_success "Staging removido com sucesso!"

log_info ""
log_info "Verificando se ainda há containers staging rodando..."
STAGING_CONTAINERS=$(docker ps -a --filter "name=staging" --format "{{.Names}}" | wc -l)

if [ "$STAGING_CONTAINERS" -eq 0 ]; then
    log_success "✅ Nenhum container staging encontrado"
else
    log_info "⚠️  Ainda há $STAGING_CONTAINERS container(s) staging"
fi

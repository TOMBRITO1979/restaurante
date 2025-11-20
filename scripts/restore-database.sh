#!/bin/bash

# ✅ SECURITY: Script de Restauração de Backup do ChefWell
# Restaura backup do PostgreSQL de forma segura

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Verificar se arquivo de backup foi fornecido
if [ -z "$1" ]; then
    error "Uso: $0 <arquivo-de-backup.dump.gz>"
    echo ""
    echo "Backups disponíveis:"
    echo ""
    echo "DIÁRIOS:"
    ls -lh /root/backups/daily/*.dump.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    echo ""
    echo "SEMANAIS:"
    ls -lh /root/backups/weekly/*.dump.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    echo ""
    echo "MENSAIS:"
    ls -lh /root/backups/monthly/*.dump.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    exit 1
fi

BACKUP_FILE="$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

log "🔄 Iniciando restauração do ChefWell..."
info "📁 Arquivo de backup: $BACKUP_FILE"

# Encontrar container do PostgreSQL
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep "chefwell_postgres" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    error "Container PostgreSQL não encontrado!"
    exit 1
fi

log "📦 Container PostgreSQL: $POSTGRES_CONTAINER"

# Descomprimir backup se necessário
TEMP_FILE="/tmp/chefwell_restore_$(date +%s).dump"

if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "📦 Descomprimindo backup..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
else
    cp "$BACKUP_FILE" "$TEMP_FILE"
fi

# Confirmação de segurança
warning "⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER todos os dados atuais!"
warning "⚠️  Você tem certeza que deseja continuar?"
echo ""
read -p "Digite 'RESTAURAR' (em maiúsculas) para confirmar: " CONFIRMATION

if [ "$CONFIRMATION" != "RESTAURAR" ]; then
    error "Restauração cancelada pelo usuário"
    rm -f "$TEMP_FILE"
    exit 1
fi

log "✅ Confirmação recebida. Iniciando restauração..."

# Parar serviços dependentes (backend)
log "⏸️  Parando backend ChefWell..."
docker service scale chefwell_backend=0 > /dev/null 2>&1 || true
sleep 3

# Copiar backup para dentro do container
log "📤 Copiando backup para container..."
docker cp "$TEMP_FILE" "$POSTGRES_CONTAINER":/tmp/restore.dump

# Dropar conexões existentes e recriar database
log "🗑️  Preparando database..."
docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'restaurante' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true
docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS restaurante;" > /dev/null 2>&1 || true
docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "CREATE DATABASE restaurante;" > /dev/null 2>&1

# Executar restauração
log "💾 Executando pg_restore..."
if docker exec "$POSTGRES_CONTAINER" pg_restore -U postgres -d restaurante /tmp/restore.dump > /dev/null 2>&1; then
    log "✅ Restauração concluída com sucesso!"
else
    error "Falha na restauração!"
    log "🔄 Reiniciando backend..."
    docker service scale chefwell_backend=1 > /dev/null 2>&1
    rm -f "$TEMP_FILE"
    docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.dump
    exit 1
fi

# Limpar arquivo temporário do container
docker exec "$POSTGRES_CONTAINER" rm -f /tmp/restore.dump

# Reiniciar backend
log "🔄 Reiniciando backend ChefWell..."
docker service scale chefwell_backend=1 > /dev/null 2>&1
sleep 5

# Aguardar backend inicializar
log "⏳ Aguardando backend inicializar..."
for i in {1..30}; do
    if docker service ps chefwell_backend --filter "desired-state=running" | grep -q "Running"; then
        log "✅ Backend reiniciado com sucesso!"
        break
    fi
    sleep 2
done

# Limpar arquivo temporário local
rm -f "$TEMP_FILE"

log "✅ Restauração concluída com sucesso!"
log "ℹ️  Teste o sistema em: https://app.chefwell.pro"

exit 0

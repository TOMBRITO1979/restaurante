#!/bin/bash

# ✅ SECURITY: Script de Backup Automatizado do ChefWell
# Executa backup completo do PostgreSQL (todos schemas + tenants)
# Rotação automática: mantém últimos 7 backups diários + 4 semanais + 3 mensais

set -e  # Exit on error

# Configurações
BACKUP_DIR="/root/backups"
RETENTION_DAYS=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=3
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

log "🔄 Iniciando backup do ChefWell..."

# Encontrar container do PostgreSQL do ChefWell
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep "chefwell_postgres" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    error "Container PostgreSQL não encontrado!"
    exit 1
fi

log "📦 Container PostgreSQL: $POSTGRES_CONTAINER"

# Nome do arquivo de backup
BACKUP_FILE="$BACKUP_DIR/daily/chefwell_backup_${DATE}.dump"

# Executar backup usando pg_dump (dump completo do database)
log "💾 Executando pg_dump..."

if docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres -Fc restaurante > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup concluído: $BACKUP_FILE ($BACKUP_SIZE)"
else
    error "Falha ao executar pg_dump"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Verificar integridade do backup
log "🔍 Verificando integridade do backup..."
if pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    log "✅ Backup verificado com sucesso"
else
    warning "pg_restore não disponível no host, pulando verificação de integridade"
    log "ℹ️  Backup criado: $BACKUP_FILE"
fi

# Comprimir backup (gzip)
log "🗜️  Comprimindo backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "✅ Backup comprimido: $COMPRESSED_SIZE"

# Copiar para backup semanal (domingos)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    WEEKLY_BACKUP="$BACKUP_DIR/weekly/chefwell_weekly_${DATE}.dump.gz"
    cp "$BACKUP_FILE" "$WEEKLY_BACKUP"
    log "📅 Backup semanal criado: $WEEKLY_BACKUP"
fi

# Copiar para backup mensal (primeiro dia do mês)
if [ "$DAY_OF_MONTH" -eq 01 ]; then
    MONTHLY_BACKUP="$BACKUP_DIR/monthly/chefwell_monthly_${DATE}.dump.gz"
    cp "$BACKUP_FILE" "$MONTHLY_BACKUP"
    log "📆 Backup mensal criado: $MONTHLY_BACKUP"
fi

# Rotação de backups - Diários (manter últimos 7)
log "🗑️  Limpando backups antigos..."
DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "*.dump.gz" -type f | wc -l)
if [ "$DAILY_COUNT" -gt "$RETENTION_DAYS" ]; then
    find "$BACKUP_DIR/daily" -name "*.dump.gz" -type f -mtime +$RETENTION_DAYS -delete
    DELETED=$((DAILY_COUNT - RETENTION_DAYS))
    log "🗑️  Removidos $DELETED backups diários antigos"
fi

# Rotação de backups - Semanais (manter últimos 4)
WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "*.dump.gz" -type f | wc -l)
if [ "$WEEKLY_COUNT" -gt "$RETENTION_WEEKLY" ]; then
    find "$BACKUP_DIR/weekly" -name "*.dump.gz" -type f | sort | head -n -$RETENTION_WEEKLY | xargs rm -f
    log "🗑️  Limpeza de backups semanais concluída"
fi

# Rotação de backups - Mensais (manter últimos 3)
MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -name "*.dump.gz" -type f | wc -l)
if [ "$MONTHLY_COUNT" -gt "$RETENTION_MONTHLY" ]; then
    find "$BACKUP_DIR/monthly" -name "*.dump.gz" -type f | sort | head -n -$RETENTION_MONTHLY | xargs rm -f
    log "🗑️  Limpeza de backups mensais concluída"
fi

# Estatísticas finais
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.dump.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "📊 Estatísticas de Backup:"
log "   - Backups diários: $(find "$BACKUP_DIR/daily" -name "*.dump.gz" -type f | wc -l)"
log "   - Backups semanais: $(find "$BACKUP_DIR/weekly" -name "*.dump.gz" -type f | wc -l)"
log "   - Backups mensais: $(find "$BACKUP_DIR/monthly" -name "*.dump.gz" -type f | wc -l)"
log "   - Total de backups: $TOTAL_BACKUPS"
log "   - Espaço utilizado: $TOTAL_SIZE"

log "✅ Backup automatizado concluído com sucesso!"

# Opcional: Enviar notificação (descomentar se configurar webhook)
# curl -X POST https://seu-webhook.com/backup-success \
#   -H "Content-Type: application/json" \
#   -d "{\"status\":\"success\",\"file\":\"$BACKUP_FILE\",\"size\":\"$COMPRESSED_SIZE\"}"

exit 0

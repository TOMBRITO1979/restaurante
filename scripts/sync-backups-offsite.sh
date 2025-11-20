#!/bin/bash

# ✅ BACKUP OFFSITE: Sincronização de Backups para Servidor Remoto
# Usa rsync para copiar backups locais para servidor offsite
# Executa automaticamente via cron diariamente às 4h

set -e

# Configurações (ajuste conforme necessário)
BACKUP_DIR="/root/backups"
OFFSITE_DIR="/root/backups-offsite"  # Para teste local. Em produção: backupuser@servidor:/path
LOG_FILE="/var/log/chefwell-offsite-sync.log"

# Configurações de rsync
RSYNC_OPTS="-avz --delete --backup --backup-dir=old_backups"
BANDWIDTH_LIMIT="5000"  # KB/s (5 MB/s) - ajuste conforme sua conexão
TIMEOUT="300"  # 5 minutos
MAX_RETRIES=3

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função de log
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] $@" | tee -a "$LOG_FILE"
}

log_info() {
    log "${GREEN}ℹ️  $@${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  $@${NC}"
}

log_error() {
    log "${RED}❌ $@${NC}"
}

log_success() {
    log "${GREEN}✅ $@${NC}"
}

# Criar log file se não existir
touch "$LOG_FILE"

log_info "═══════════════════════════════════════════════════════"
log_info "Sincronização de Backups Offsite - ChefWell"
log_info "═══════════════════════════════════════════════════════"

# Verificar se diretório de backups existe
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Diretório de backups não encontrado: $BACKUP_DIR"
    exit 1
fi

# Criar diretório offsite se não existir (para teste local)
mkdir -p "$OFFSITE_DIR"

# Contar backups locais
TOTAL_LOCAL=$(find "$BACKUP_DIR" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
SIZE_LOCAL=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

log_info "📊 Backups locais: ${TOTAL_LOCAL} arquivos (${SIZE_LOCAL})"

# Função de rsync com retry
rsync_with_retry() {
    local attempt=1
    local success=false

    while [ $attempt -le $MAX_RETRIES ] && [ "$success" = "false" ]; do
        log_info "Tentativa ${attempt}/${MAX_RETRIES}..."

        if rsync $RSYNC_OPTS \
            --bwlimit=$BANDWIDTH_LIMIT \
            --timeout=$TIMEOUT \
            --stats \
            "$BACKUP_DIR/" "$OFFSITE_DIR/" >> "$LOG_FILE" 2>&1; then
            success=true
            log_success "Sincronização concluída com sucesso!"
        else
            log_warning "Tentativa ${attempt} falhou"
            attempt=$((attempt + 1))
            if [ $attempt -le $MAX_RETRIES ]; then
                log_info "Aguardando 30 segundos antes de tentar novamente..."
                sleep 30
            fi
        fi
    done

    if [ "$success" = "false" ]; then
        log_error "Falha após ${MAX_RETRIES} tentativas"
        exit 1
    fi
}

# Executar sincronização
log_info "🔄 Iniciando sincronização para ${OFFSITE_DIR}..."
START_TIME=$(date +%s)

rsync_with_retry

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Verificar backups remotos
TOTAL_REMOTE=$(find "$OFFSITE_DIR" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
SIZE_REMOTE=$(du -sh "$OFFSITE_DIR" 2>/dev/null | cut -f1)

log_info ""
log_info "═══════════════════════════════════════════════════════"
log_info "Resumo da Sincronização:"
log_info "  - Backups locais: ${TOTAL_LOCAL} (${SIZE_LOCAL})"
log_info "  - Backups remotos: ${TOTAL_REMOTE} (${SIZE_REMOTE})"
log_info "  - Tempo de transferência: ${DURATION}s"
log_info "═══════════════════════════════════════════════════════"

# Validar sincronização
if [ "$TOTAL_LOCAL" -eq "$TOTAL_REMOTE" ]; then
    log_success "✅ Sincronização verificada: Local e remoto sincronizados!"
else
    log_warning "⚠️  Diferença detectada: Local=${TOTAL_LOCAL}, Remoto=${TOTAL_REMOTE}"
fi

log_success "Sincronização offsite concluída!"

# Exit code
if [ "$TOTAL_LOCAL" -eq "$TOTAL_REMOTE" ]; then
    exit 0
else
    exit 1
fi

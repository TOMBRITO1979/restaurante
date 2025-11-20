#!/bin/bash

# ✅ MONITORING: Script de Monitoramento de Disk Space - ChefWell
# Monitora uso de disco e alerta quando atingir thresholds críticos
# Executado via cron a cada 6 horas

set -e

# Configurações
BACKUP_DIR="/root/backups"
LOG_FILE="/var/log/chefwell-disk-monitor.log"
WEBHOOK_URL="${DISK_ALERT_WEBHOOK:-}"  # Opcional: configure via env var

# Thresholds (percentuais)
WARNING_THRESHOLD=70
CRITICAL_THRESHOLD=80
EMERGENCY_THRESHOLD=90

# Cores para output
RED='\033[0;31m'
ORANGE='\033[0;33m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${GREEN}ℹ️  $@${NC}"
}

log_warning() {
    log "WARN" "${YELLOW}⚠️  $@${NC}"
}

log_critical() {
    log "CRIT" "${ORANGE}🔶 $@${NC}"
}

log_emergency() {
    log "EMER" "${RED}🚨 $@${NC}"
}

# Criar log file se não existir
touch "$LOG_FILE"

log_info "═══════════════════════════════════════════════════════"
log_info "Iniciando monitoramento de disk space - ChefWell"
log_info "═══════════════════════════════════════════════════════"

# Função para obter uso do disco
get_disk_usage() {
    local path=$1
    df -h "$path" | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Função para obter tamanho usado
get_disk_used() {
    local path=$1
    df -h "$path" | tail -1 | awk '{print $3}'
}

# Função para obter tamanho total
get_disk_total() {
    local path=$1
    df -h "$path" | tail -1 | awk '{print $2}'
}

# Função para enviar webhook (se configurado)
send_webhook() {
    local level=$1
    local message=$2

    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"level\":\"$level\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            --max-time 5 --silent > /dev/null 2>&1 || true
    fi
}

# Monitorar filesystem raiz
log_info "📊 Verificando uso do disco..."

ROOT_USAGE=$(get_disk_usage "/")
ROOT_USED=$(get_disk_used "/")
ROOT_TOTAL=$(get_disk_total "/")

log_info "Filesystem raiz: ${ROOT_USED} / ${ROOT_TOTAL} (${ROOT_USAGE}%)"

# Verificar thresholds
if [ "$ROOT_USAGE" -ge "$EMERGENCY_THRESHOLD" ]; then
    log_emergency "EMERGÊNCIA: Disco em ${ROOT_USAGE}% (>= ${EMERGENCY_THRESHOLD}%)"
    log_emergency "Ação imediata necessária! Libere espaço urgentemente!"
    send_webhook "EMERGENCY" "Disk usage at ${ROOT_USAGE}% on ChefWell server"
    ALERT_LEVEL="EMERGENCY"
elif [ "$ROOT_USAGE" -ge "$CRITICAL_THRESHOLD" ]; then
    log_critical "CRÍTICO: Disco em ${ROOT_USAGE}% (>= ${CRITICAL_THRESHOLD}%)"
    log_critical "Recomendado: Limpar backups antigos ou aumentar disco"
    send_webhook "CRITICAL" "Disk usage at ${ROOT_USAGE}% on ChefWell server"
    ALERT_LEVEL="CRITICAL"
elif [ "$ROOT_USAGE" -ge "$WARNING_THRESHOLD" ]; then
    log_warning "AVISO: Disco em ${ROOT_USAGE}% (>= ${WARNING_THRESHOLD}%)"
    log_warning "Monitore de perto. Considere limpeza preventiva."
    send_webhook "WARNING" "Disk usage at ${ROOT_USAGE}% on ChefWell server"
    ALERT_LEVEL="WARNING"
else
    log_info "✅ Uso de disco normal: ${ROOT_USAGE}%"
    ALERT_LEVEL="OK"
fi

# Monitorar diretório de backups (se existir)
if [ -d "$BACKUP_DIR" ]; then
    log_info ""
    log_info "📁 Verificando diretório de backups..."

    BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    # Contar backups
    DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
    WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
    MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
    TOTAL_BACKUPS=$((DAILY_COUNT + WEEKLY_COUNT + MONTHLY_COUNT))

    log_info "Diretório de backups: ${BACKUP_SIZE}"
    log_info "Backups - Diários: ${DAILY_COUNT} | Semanais: ${WEEKLY_COUNT} | Mensais: ${MONTHLY_COUNT}"
    log_info "Total de backups: ${TOTAL_BACKUPS}"

    # Verificar se backups estão crescendo muito
    BACKUP_SIZE_MB=$(du -sm "$BACKUP_DIR" 2>/dev/null | cut -f1)
    if [ "$BACKUP_SIZE_MB" -gt 1000 ]; then
        log_warning "Backups usando mais de 1 GB (${BACKUP_SIZE})"
        log_warning "Considere revisar política de retenção"
    else
        log_info "✅ Tamanho de backups adequado"
    fi
else
    log_warning "⚠️  Diretório de backups não encontrado: $BACKUP_DIR"
fi

# Verificar inodes (prevenir "No space left" mesmo com espaço)
log_info ""
log_info "📊 Verificando uso de inodes..."
INODE_USAGE=$(df -i / | tail -1 | awk '{print $5}' | sed 's/%//')
log_info "Inodes em uso: ${INODE_USAGE}%"

if [ "$INODE_USAGE" -ge 80 ]; then
    log_warning "AVISO: Inodes em ${INODE_USAGE}% (muitos arquivos pequenos)"
fi

# Resumo final
log_info ""
log_info "═══════════════════════════════════════════════════════"
log_info "Resumo do Monitoramento:"
log_info "  - Status Geral: ${ALERT_LEVEL}"
log_info "  - Disco: ${ROOT_USAGE}%"
log_info "  - Backups: ${BACKUP_SIZE:-N/A}"
log_info "  - Inodes: ${INODE_USAGE}%"
log_info "═══════════════════════════════════════════════════════"

# Recomendações baseadas no status
if [ "$ALERT_LEVEL" = "EMERGENCY" ] || [ "$ALERT_LEVEL" = "CRITICAL" ]; then
    log_info ""
    log_info "💡 Ações Recomendadas:"
    log_info "  1. Verificar maiores diretórios: du -sh /* | sort -hr | head -10"
    log_info "  2. Limpar logs antigos: journalctl --vacuum-time=7d"
    log_info "  3. Limpar Docker: docker system prune -a --volumes"
    log_info "  4. Limpar backups antigos: find $BACKUP_DIR -name '*.dump.gz' -mtime +30 -delete"
    log_info "  5. Considere aumentar tamanho do disco"
fi

log_info "Monitoramento concluído com sucesso!"

# Exit code baseado no nível de alerta
case "$ALERT_LEVEL" in
    "OK")
        exit 0
        ;;
    "WARNING")
        exit 0
        ;;
    "CRITICAL")
        exit 1
        ;;
    "EMERGENCY")
        exit 2
        ;;
esac

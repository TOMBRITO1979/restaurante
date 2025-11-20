#!/bin/bash

# ✅ BACKUP OFFSITE: Verificação de Backups Remotos
# Compara backups locais vs remotos

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BACKUP_DIR="/root/backups"
OFFSITE_DIR="/root/backups-offsite"

echo -e "${BOLD}${CYAN}"
echo "🔍 Verificando backups remotos..."
echo -e "${NC}"

# Função para contar backups
count_backups() {
    local dir=$1
    local type=$2
    find "$dir/$type" -name "*.dump.gz" -type f 2>/dev/null | wc -l
}

# Função para tamanho
get_size() {
    local dir=$1
    local type=$2
    du -sh "$dir/$type" 2>/dev/null | cut -f1 || echo "0"
}

# Backups locais
echo -e "${BOLD}${BLUE}📊 BACKUPS LOCAIS:${NC}"
LOCAL_DAILY=$(count_backups "$BACKUP_DIR" "daily")
LOCAL_WEEKLY=$(count_backups "$BACKUP_DIR" "weekly")
LOCAL_MONTHLY=$(count_backups "$BACKUP_DIR" "monthly")
LOCAL_TOTAL=$((LOCAL_DAILY + LOCAL_WEEKLY + LOCAL_MONTHLY))
LOCAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

echo "   Daily: ${LOCAL_DAILY} backups ($(get_size "$BACKUP_DIR" "daily"))"
echo "   Weekly: ${LOCAL_WEEKLY} backups ($(get_size "$BACKUP_DIR" "weekly"))"
echo "   Monthly: ${LOCAL_MONTHLY} backups ($(get_size "$BACKUP_DIR" "monthly"))"
echo "   Total: ${LOCAL_TOTAL} backups (${LOCAL_SIZE})"
echo ""

# Backups remotos
echo -e "${BOLD}${BLUE}📊 BACKUPS REMOTOS:${NC}"

if [ ! -d "$OFFSITE_DIR" ]; then
    echo -e "${RED}❌ Diretório remoto não encontrado: $OFFSITE_DIR${NC}"
    exit 1
fi

REMOTE_DAILY=$(count_backups "$OFFSITE_DIR" "daily")
REMOTE_WEEKLY=$(count_backups "$OFFSITE_DIR" "weekly")
REMOTE_MONTHLY=$(count_backups "$OFFSITE_DIR" "monthly")
REMOTE_TOTAL=$((REMOTE_DAILY + REMOTE_WEEKLY + REMOTE_MONTHLY))
REMOTE_SIZE=$(du -sh "$OFFSITE_DIR" 2>/dev/null | cut -f1)

# Status de cada categoria
check_status() {
    local local_count=$1
    local remote_count=$2
    if [ "$local_count" -eq "$remote_count" ]; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
}

echo "   Daily: ${REMOTE_DAILY} backups ($(get_size "$OFFSITE_DIR" "daily")) $(check_status $LOCAL_DAILY $REMOTE_DAILY)"
echo "   Weekly: ${REMOTE_WEEKLY} backups ($(get_size "$OFFSITE_DIR" "weekly")) $(check_status $LOCAL_WEEKLY $REMOTE_WEEKLY)"
echo "   Monthly: ${REMOTE_MONTHLY} backups ($(get_size "$OFFSITE_DIR" "monthly")) $(check_status $LOCAL_MONTHLY $REMOTE_MONTHLY)"
echo "   Total: ${REMOTE_TOTAL} backups (${REMOTE_SIZE}) $(check_status $LOCAL_TOTAL $REMOTE_TOTAL)"
echo ""

# Resultado final
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$LOCAL_TOTAL" -eq "$REMOTE_TOTAL" ]; then
    echo -e "${GREEN}✅ Local e remoto sincronizados!${NC}"
    echo -e "   Local: ${LOCAL_TOTAL} backups (${LOCAL_SIZE})"
    echo -e "   Remoto: ${REMOTE_TOTAL} backups (${REMOTE_SIZE})"
    exit 0
else
    echo -e "${YELLOW}⚠️  Diferença detectada entre local e remoto${NC}"
    echo -e "   Local: ${LOCAL_TOTAL} backups (${LOCAL_SIZE})"
    echo -e "   Remoto: ${REMOTE_TOTAL} backups (${REMOTE_SIZE})"
    echo -e "${YELLOW}   Execute: /root/restaurante/scripts/sync-backups-offsite.sh${NC}"
    exit 1
fi

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

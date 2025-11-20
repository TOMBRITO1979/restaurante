#!/bin/bash

# ✅ MONITORING: Dashboard Rápido de Status de Disco - ChefWell
# Mostra visão geral do uso de disco e backups

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configurações
BACKUP_DIR="/root/backups"

# Header
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           CHEFWELL - DISK SPACE MONITOR                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Função para barra de progresso
progress_bar() {
    local percentage=$1
    local width=30
    local filled=$((percentage * width / 100))
    local empty=$((width - filled))

    # Cor baseada no percentual
    local color=$GREEN
    if [ "$percentage" -ge 90 ]; then
        color=$RED
    elif [ "$percentage" -ge 80 ]; then
        color=$YELLOW
    fi

    echo -ne "${color}"
    printf '█%.0s' $(seq 1 $filled)
    echo -ne "${NC}"
    printf '░%.0s' $(seq 1 $empty)
    echo -ne " ${percentage}%"
}

# Status do Sistema
echo -e "${BOLD}${BLUE}📊 STATUS DO SISTEMA:${NC}"
echo ""

# Root filesystem
ROOT_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
ROOT_USED=$(df -h / | tail -1 | awk '{print $3}')
ROOT_TOTAL=$(df -h / | tail -1 | awk '{print $2}')

echo -ne "   Root Filesystem: ${ROOT_USED} / ${ROOT_TOTAL}  "
progress_bar "$ROOT_USAGE"

# Status
if [ "$ROOT_USAGE" -lt 70 ]; then
    echo -e "  ${GREEN}✅ OK${NC}"
elif [ "$ROOT_USAGE" -lt 80 ]; then
    echo -e "  ${YELLOW}⚠️  WARNING${NC}"
elif [ "$ROOT_USAGE" -lt 90 ]; then
    echo -e "  ${YELLOW}🔶 CRITICAL${NC}"
else
    echo -e "  ${RED}🚨 EMERGENCY${NC}"
fi

# Backups
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    BACKUP_SIZE_MB=$(du -sm "$BACKUP_DIR" 2>/dev/null | cut -f1)

    # Calcular percentual de backups em relação ao disco
    TOTAL_MB=$(df -m / | tail -1 | awk '{print $2}')
    BACKUP_PERCENTAGE=$((BACKUP_SIZE_MB * 100 / TOTAL_MB))

    echo -ne "   Backups: ${BACKUP_SIZE} / ${ROOT_TOTAL}  "
    progress_bar "$BACKUP_PERCENTAGE"
    echo -e "  ${GREEN}✅ OK${NC}"
else
    echo -e "   Backups: ${YELLOW}⚠️  Diretório não encontrado${NC}"
fi

# Inodes
INODE_USAGE=$(df -i / | tail -1 | awk '{print $5}' | sed 's/%//')
echo -ne "   Inodes: ${INODE_USAGE}%  "
if [ "$INODE_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Alto uso${NC}"
fi

echo ""

# Detalhes dos Backups
if [ -d "$BACKUP_DIR" ]; then
    echo -e "${BOLD}${BLUE}🗂️  DETALHES DOS BACKUPS:${NC}"
    echo ""

    # Contar backups
    DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
    WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "*.dump.gz" -type f 2>/dev/null | wc -l)
    MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -name "*.dump.gz" -type f 2>/dev/null | wc -l)

    # Tamanhos
    DAILY_SIZE=$(du -sh "$BACKUP_DIR/daily" 2>/dev/null | cut -f1 || echo "0")
    WEEKLY_SIZE=$(du -sh "$BACKUP_DIR/weekly" 2>/dev/null | cut -f1 || echo "0")
    MONTHLY_SIZE=$(du -sh "$BACKUP_DIR/monthly" 2>/dev/null | cut -f1 || echo "0")

    echo "   Daily:   ${DAILY_COUNT} backups (${DAILY_SIZE})"
    echo "   Weekly:  ${WEEKLY_COUNT} backups (${WEEKLY_SIZE})"
    echo "   Monthly: ${MONTHLY_COUNT} backups (${MONTHLY_SIZE})"
    echo "   Total:   $((DAILY_COUNT + WEEKLY_COUNT + MONTHLY_COUNT)) backups (${BACKUP_SIZE})"

    echo ""

    # Backup mais recente
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.dump.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "$LATEST_BACKUP" ]; then
        LATEST_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d'.' -f1)
        LATEST_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        echo -e "   ${BOLD}Último backup:${NC} $(basename "$LATEST_BACKUP")"
        echo "   Data: ${LATEST_DATE}"
        echo "   Tamanho: ${LATEST_SIZE}"
    fi
fi

echo ""

# Top 5 maiores diretórios
echo -e "${BOLD}${BLUE}📁 TOP 5 MAIORES DIRETÓRIOS:${NC}"
echo ""
du -sh /* 2>/dev/null | sort -hr | head -5 | while read size dir; do
    echo "   $size  $dir"
done

echo ""

# Status final
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$ROOT_USAGE" -lt 70 ]; then
    echo -e "${GREEN}✅ Todos os sistemas normais${NC}"
elif [ "$ROOT_USAGE" -lt 80 ]; then
    echo -e "${YELLOW}⚠️  Monitore o uso de disco${NC}"
elif [ "$ROOT_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}🔶 Libere espaço em breve${NC}"
else
    echo -e "${RED}🚨 AÇÃO IMEDIATA NECESSÁRIA - Libere espaço!${NC}"
fi

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

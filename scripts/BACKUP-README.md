# ChefWell - Sistema de Backup Automatizado

## 📋 Visão Geral

Sistema de backup automatizado para o ChefWell com:
- ✅ Backups diários automáticos (3h da manhã)
- ✅ Backups semanais (domingos)
- ✅ Backups mensais (dia 1 de cada mês)
- ✅ Compressão automática (gzip)
- ✅ Rotação automática de backups
- ✅ Logs detalhados
- ✅ Script de restauração seguro

## 🗂️ Estrutura de Diretórios

```
/root/backups/
├── daily/          # Backups diários (mantém últimos 7)
├── weekly/         # Backups semanais (mantém últimos 4)
└── monthly/        # Backups mensais (mantém últimos 3)
```

## ⚙️ Configuração

### Cron Job (Automático)

O backup é executado automaticamente todos os dias às **3h da manhã**:

```bash
# Ver cron job configurado
crontab -l | grep backup

# Editar cron job
crontab -e
```

**Cron configurado:**
```
0 3 * * * /root/restaurante/scripts/backup-database.sh >> /var/log/chefwell-backup.log 2>&1
```

### Logs

Logs de backup são salvos em:
```bash
# Ver últimas linhas do log
tail -f /var/log/chefwell-backup.log

# Ver backups bem-sucedidos
grep "✅" /var/log/chefwell-backup.log
```

## 🔄 Backup Manual

### Executar Backup Agora

```bash
/root/restaurante/scripts/backup-database.sh
```

**Saída esperada:**
```
[2025-11-16 14:08:26] 🔄 Iniciando backup do ChefWell...
[2025-11-16 14:08:26] 📦 Container PostgreSQL: chefwell_postgres.1.xxx
[2025-11-16 14:08:26] 💾 Executando pg_dump...
[2025-11-16 14:08:26] ✅ Backup concluído: /root/backups/daily/chefwell_backup_20251116_140826.dump (92K)
[2025-11-16 14:08:26] 🗜️  Comprimindo backup...
[2025-11-16 14:08:26] ✅ Backup comprimido: 36K
[2025-11-16 14:08:26] 📊 Estatísticas de Backup:
[2025-11-16 14:08:26]    - Backups diários: 7
[2025-11-16 14:08:26]    - Backups semanais: 4
[2025-11-16 14:08:26]    - Backups mensais: 3
[2025-11-16 14:08:26]    - Total de backups: 14
[2025-11-16 14:08:26]    - Espaço utilizado: 500K
[2025-11-16 14:08:26] ✅ Backup automatizado concluído com sucesso!
```

## 🔙 Restauração de Backup

### 1. Listar Backups Disponíveis

```bash
/root/restaurante/scripts/restore-database.sh
```

Isso mostrará todos os backups disponíveis:
```
DIÁRIOS:
  /root/backups/daily/chefwell_backup_20251116_140826.dump.gz (35K)
  /root/backups/daily/chefwell_backup_20251115_030000.dump.gz (34K)
  ...

SEMANAIS:
  /root/backups/weekly/chefwell_weekly_20251110_030000.dump.gz (36K)
  ...

MENSAIS:
  /root/backups/monthly/chefwell_monthly_20251101_030000.dump.gz (38K)
  ...
```

### 2. Restaurar Backup Específico

```bash
/root/restaurante/scripts/restore-database.sh /root/backups/daily/chefwell_backup_20251116_140826.dump.gz
```

**⚠️ ATENÇÃO:** A restauração irá:
1. Pedir confirmação (digite "RESTAURAR" em maiúsculas)
2. Parar o backend temporariamente
3. **SOBRESCREVER todos os dados atuais**
4. Restaurar o backup
5. Reiniciar o backend

**Saída esperada:**
```
[2025-11-16 14:10:00] 🔄 Iniciando restauração do ChefWell...
[2025-11-16 14:10:00] 📁 Arquivo de backup: /root/backups/daily/chefwell_backup_20251116_140826.dump.gz
[2025-11-16 14:10:00] 📦 Container PostgreSQL: chefwell_postgres.1.xxx
[2025-11-16 14:10:00] 📦 Descomprimindo backup...
[2025-11-16 14:10:00] ⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER todos os dados atuais!
[2025-11-16 14:10:00] ⚠️  Você tem certeza que deseja continuar?

Digite 'RESTAURAR' (em maiúsculas) para confirmar: RESTAURAR

[2025-11-16 14:10:05] ✅ Confirmação recebida. Iniciando restauração...
[2025-11-16 14:10:05] ⏸️  Parando backend ChefWell...
[2025-11-16 14:10:08] 📤 Copiando backup para container...
[2025-11-16 14:10:09] 🗑️  Preparando database...
[2025-11-16 14:10:10] 💾 Executando pg_restore...
[2025-11-16 14:10:12] ✅ Restauração concluída com sucesso!
[2025-11-16 14:10:12] 🔄 Reiniciando backend ChefWell...
[2025-11-16 14:10:17] ✅ Backend reiniciado com sucesso!
[2025-11-16 14:10:17] ✅ Restauração concluída com sucesso!
[2025-11-16 14:10:17] ℹ️  Teste o sistema em: https://app.chefwell.pro
```

## 📊 Política de Retenção

| Tipo | Frequência | Retenção | Quantidade |
|------|-----------|----------|------------|
| Diário | Todos os dias às 3h | 7 dias | ~7 backups |
| Semanal | Domingos às 3h | 4 semanas | ~4 backups |
| Mensal | Dia 1 às 3h | 3 meses | ~3 backups |

**Total esperado:** ~14 backups (dependendo do dia da semana/mês)

## 🛠️ Manutenção

### Verificar Espaço em Disco

```bash
du -sh /root/backups/
du -sh /root/backups/*
```

### Limpar Backups Manualmente

```bash
# Remover backups mais antigos que 30 dias
find /root/backups/daily -name "*.dump.gz" -mtime +30 -delete

# Remover todos os backups (CUIDADO!)
rm -rf /root/backups/daily/*
rm -rf /root/backups/weekly/*
rm -rf /root/backups/monthly/*
```

### Verificar Integridade de um Backup

```bash
# Descomprimir temporariamente
gunzip -c /root/backups/daily/chefwell_backup_20251116_140826.dump.gz > /tmp/test.dump

# Verificar com pg_restore (requer PostgreSQL client no host)
pg_restore --list /tmp/test.dump

# Limpar
rm /tmp/test.dump
```

## 🔐 Segurança

### Proteções Implementadas

- ✅ Backups armazenados com permissões restritas (root only)
- ✅ Confirmação obrigatória antes de restaurar
- ✅ Backup do estado atual antes de restauração
- ✅ Logs detalhados de todas as operações
- ✅ Rotação automática previne uso excessivo de disco

### Recomendações

1. **Backup Offsite**: Copie backups para outro servidor/cloud
```bash
# Exemplo: rsync para servidor remoto
rsync -avz /root/backups/ usuario@servidor-backup:/backups/chefwell/
```

2. **Criptografia** (opcional): Criptografe backups antes de enviar para cloud
```bash
# Criptografar backup
gpg --symmetric --cipher-algo AES256 backup.dump.gz

# Descriptografar
gpg --decrypt backup.dump.gz.gpg > backup.dump.gz
```

3. **Teste Regularmente**: Restaure backups em ambiente de teste mensalmente

4. **Monitore Logs**: Configure alertas se backups falharem

## 🚨 Troubleshooting

### Backup Falha

```bash
# Verificar se container PostgreSQL está rodando
docker ps | grep chefwell_postgres

# Verificar logs do PostgreSQL
docker service logs chefwell_postgres

# Testar conexão manualmente
docker exec chefwell_postgres.1.xxx psql -U postgres -c "SELECT version();"
```

### Restauração Falha

```bash
# Verificar permissões
ls -lh /root/backups/daily/

# Verificar se arquivo está corrompido
file /root/backups/daily/chefwell_backup_20251116_140826.dump.gz

# Ver logs de erro
tail -100 /var/log/chefwell-backup.log
```

### Espaço em Disco Cheio

```bash
# Ver uso de disco
df -h

# Ver maiores diretórios
du -sh /* | sort -hr | head -10

# Limpar backups antigos manualmente
find /root/backups -name "*.dump.gz" -mtime +60 -delete
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `/var/log/chefwell-backup.log`
2. Consulte este README
3. Entre em contato com o suporte técnico

---

**Última atualização:** 16 de Novembro de 2025
**Versão:** 1.0.0

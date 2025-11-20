# Plano de Implementação - Itens de Alta Prioridade
## Sistema ChefWell - Preparação para 100 Lojas

**Data:** 20 de Novembro de 2025
**Responsável:** Claude AI
**Metodologia:** Implementação incremental com testes completos após cada etapa

---

## 📋 Visão Geral

### Itens a Implementar:

1. ✅ **Monitoramento de Disk Space** com alertas automáticos
2. ✅ **Backup Offsite** (rsync para servidor remoto)
3. ✅ **Teste de Restauração** completo em staging

### Estratégia de Implementação:

**Abordagem:** Incremental e Segura
- Cada etapa será implementada isoladamente
- Testes completos após cada etapa
- Rollback rápido se algo falhar
- Zero downtime do sistema
- Validação completa antes de próxima etapa

---

## 🎯 ETAPA 1: Monitoramento de Disk Space

### Status: PLANEJADO ⏳
### Complexidade: **BAIXA** ⭐
### Tempo Estimado: 30-45 minutos
### Risco: **MUITO BAIXO** (apenas leitura, sem modificações no sistema)

### Objetivos:

1. Monitorar uso de disco em tempo real
2. Alertas quando atingir thresholds (70%, 80%, 90%)
3. Alertas específicos para diretório de backups
4. Logs detalhados para análise

### Implementações:

#### A) Script de Monitoramento (`/root/restaurante/scripts/monitor-disk-space.sh`)

**Funcionalidades:**
- ✅ Verificar uso total do disco
- ✅ Verificar uso do diretório de backups
- ✅ Thresholds configuráveis (70%, 80%, 90%)
- ✅ Logs em `/var/log/chefwell-disk-monitor.log`
- ✅ Alertas coloridos (amarelo, laranja, vermelho)
- ✅ Opcional: Webhook para notificações externas

**Thresholds:**
- 🟡 70%: WARNING (alerta amarelo)
- 🟠 80%: CRITICAL (alerta laranja)
- 🔴 90%: EMERGENCY (alerta vermelho)

#### B) Cron Job Automático

**Frequência:** A cada 6 horas
**Cron:** `0 */6 * * * /root/restaurante/scripts/monitor-disk-space.sh`

**Horários de execução:**
- 00:00 (meia-noite)
- 06:00 (manhã)
- 12:00 (meio-dia)
- 18:00 (tarde)

#### C) Dashboard de Status

**Comando rápido:**
```bash
/root/restaurante/scripts/disk-status.sh
```

**Saída esperada:**
```
╔══════════════════════════════════════════════════════════════╗
║           CHEFWELL - DISK SPACE MONITOR                     ║
╚══════════════════════════════════════════════════════════════╝

📊 STATUS DO SISTEMA:
   Root Filesystem: 45.2 GB / 100 GB (45%) ✅ OK
   Backups: 52 MB / 100 GB (0.05%) ✅ OK

🗂️  DETALHES DOS BACKUPS:
   Daily: 7 backups (24 MB)
   Weekly: 4 backups (16 MB)
   Monthly: 3 backups (12 MB)
   Total: 14 backups (52 MB)

✅ Todos os sistemas normais
```

### Arquivos Criados:

1. `/root/restaurante/scripts/monitor-disk-space.sh` - Monitor principal
2. `/root/restaurante/scripts/disk-status.sh` - Dashboard rápido
3. `/var/log/chefwell-disk-monitor.log` - Arquivo de log

### Testes da Etapa 1:

**T1.1 - Execução Manual:**
```bash
/root/restaurante/scripts/monitor-disk-space.sh
# Verificar: Saída sem erros, log criado
```

**T1.2 - Verificar Logs:**
```bash
tail -20 /var/log/chefwell-disk-monitor.log
# Verificar: Entrada registrada com timestamp
```

**T1.3 - Dashboard Status:**
```bash
/root/restaurante/scripts/disk-status.sh
# Verificar: Mostra uso atual, backups contados corretamente
```

**T1.4 - Cron Job Instalado:**
```bash
crontab -l | grep monitor-disk-space
# Verificar: Cron configurado para executar a cada 6h
```

**T1.5 - Sistema Funcionando:**
```bash
# Login no sistema
curl -k https://app.chefwell.pro

# Verificar backend
docker service ls | grep chefwell

# Verificar logs sem erros
docker service logs --tail 50 chefwell_backend | grep -i error
```

**Critérios de Aprovação:**
- [ ] Script executa sem erros
- [ ] Logs gerados corretamente
- [ ] Dashboard mostra informações corretas
- [ ] Cron job instalado e ativo
- [ ] Sistema ChefWell funcionando normalmente (login, PDV, produtos)

---

## 🎯 ETAPA 2: Backup Offsite (Rsync para Servidor Remoto)

### Status: PLANEJADO ⏳
### Complexidade: **MÉDIA** ⭐⭐
### Tempo Estimado: 1-2 horas (inclui configuração SSH)
### Risco: **BAIXO** (apenas cópia, não modifica backups locais)

### Objetivos:

1. Copiar backups para servidor remoto automaticamente
2. Manter mesma estrutura de diretórios (daily/weekly/monthly)
3. Sincronização incremental (rsync delta transfer)
4. Logs de sincronização
5. Retry automático em caso de falha

### Pré-requisitos:

**Você precisará fornecer:**
1. IP ou hostname do servidor de backup
2. Usuário SSH do servidor de backup
3. Chave SSH (ou configuraremos juntos)
4. Diretório de destino no servidor remoto

**Exemplo:**
```
BACKUP_SERVER: backup.seuservidor.com
BACKUP_USER: backupuser
BACKUP_PATH: /backups/chefwell
```

### Implementações:

#### A) Configuração SSH (Sem Senha)

**Gerar chave SSH:**
```bash
ssh-keygen -t ed25519 -f /root/.ssh/chefwell_backup -N ""
```

**Copiar chave pública para servidor remoto:**
```bash
ssh-copy-id -i /root/.ssh/chefwell_backup.pub backupuser@backup.server.com
```

**Testar conexão:**
```bash
ssh -i /root/.ssh/chefwell_backup backupuser@backup.server.com "echo 'Conexão OK'"
```

#### B) Script de Sincronização (`/root/restaurante/scripts/sync-backups-offsite.sh`)

**Funcionalidades:**
- ✅ rsync incremental (apenas mudanças)
- ✅ Compressão durante transferência (-z)
- ✅ Preservar permissões e timestamps
- ✅ Retry automático (3 tentativas)
- ✅ Logs detalhados
- ✅ Notificação de sucesso/falha
- ✅ Bandwidth limit opcional (não sobrecarregar rede)

**Características do rsync:**
```bash
rsync -avz \
  --delete \                    # Remove arquivos deletados localmente
  --backup --backup-dir=old_\   # Mantém versões antigas
  --bwlimit=5000 \              # Limite: 5 MB/s (ajustável)
  --timeout=300 \               # Timeout: 5 minutos
  -e "ssh -i /root/.ssh/chefwell_backup" \
  /root/backups/ \
  backupuser@backup.server.com:/backups/chefwell/
```

**Estimativa de Tempo (100 lojas):**
- Primeira sincronização: ~50 MB → ~10 segundos (5 MB/s)
- Sincronizações subsequentes: ~3-5 MB/dia → ~1 segundo

#### C) Cron Job Automático

**Frequência:** Diariamente às 4h (1 hora após backup local)
**Cron:** `0 4 * * * /root/restaurante/scripts/sync-backups-offsite.sh >> /var/log/chefwell-offsite-sync.log 2>&1`

**Por quê 4h?**
- Backup local: 3h
- Espera 1h para backup completar
- Sincroniza: 4h

#### D) Script de Verificação

**Verificar backups remotos:**
```bash
/root/restaurante/scripts/verify-offsite-backups.sh
```

**Saída esperada:**
```
🔍 Verificando backups remotos em backup.server.com...

📊 BACKUPS LOCAIS:
   Daily: 7 backups (24 MB)
   Weekly: 4 backups (16 MB)
   Monthly: 3 backups (12 MB)
   Total: 14 backups (52 MB)

📊 BACKUPS REMOTOS:
   Daily: 7 backups (24 MB) ✅
   Weekly: 4 backups (16 MB) ✅
   Monthly: 3 backups (12 MB) ✅
   Total: 14 backups (52 MB) ✅

✅ Local e remoto sincronizados!
```

### Arquivos Criados:

1. `/root/.ssh/chefwell_backup` - Chave SSH privada
2. `/root/.ssh/chefwell_backup.pub` - Chave SSH pública
3. `/root/restaurante/scripts/sync-backups-offsite.sh` - Script de sincronização
4. `/root/restaurante/scripts/verify-offsite-backups.sh` - Script de verificação
5. `/var/log/chefwell-offsite-sync.log` - Log de sincronizações

### Testes da Etapa 2:

**T2.1 - Conexão SSH:**
```bash
ssh -i /root/.ssh/chefwell_backup backupuser@backup.server.com "hostname"
# Verificar: Conecta sem senha, retorna hostname do servidor
```

**T2.2 - Sincronização Manual (Dry-Run):**
```bash
# Simular sem fazer mudanças
/root/restaurante/scripts/sync-backups-offsite.sh --dry-run
# Verificar: Lista arquivos a serem copiados, sem erros
```

**T2.3 - Sincronização Real:**
```bash
/root/restaurante/scripts/sync-backups-offsite.sh
# Verificar: Backups copiados, sem erros
```

**T2.4 - Verificar Backups Remotos:**
```bash
/root/restaurante/scripts/verify-offsite-backups.sh
# Verificar: Local e remoto têm mesma quantidade de arquivos
```

**T2.5 - Testar Sincronização Incremental:**
```bash
# Executar backup local
/root/restaurante/scripts/backup-database.sh

# Sincronizar
/root/restaurante/scripts/sync-backups-offsite.sh

# Verificar logs
tail -50 /var/log/chefwell-offsite-sync.log
# Verificar: Apenas novo backup foi transferido (delta transfer)
```

**T2.6 - Cron Job Instalado:**
```bash
crontab -l | grep sync-backups-offsite
# Verificar: Cron configurado para 4h da manhã
```

**T2.7 - Sistema Funcionando:**
```bash
# Testar login, PDV, produtos
curl -k -X POST https://api.chefwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chefwell.pro","password":"admin123"}'

# Verificar serviços
docker service ls

# Verificar logs
docker service logs --tail 100 chefwell_backend | grep -i error
```

**Critérios de Aprovação:**
- [ ] SSH conecta sem senha
- [ ] Sincronização manual funciona
- [ ] Backups verificados remotamente (mesma quantidade)
- [ ] Sincronização incremental funciona (delta transfer)
- [ ] Cron job instalado
- [ ] Sistema ChefWell funcionando normalmente
- [ ] Logs sem erros

---

## 🎯 ETAPA 3: Teste de Restauração Completa em Staging

### Status: PLANEJADO ⏳
### Complexidade: **MÉDIA-ALTA** ⭐⭐⭐
### Tempo Estimado: 2-3 horas
### Risco: **MÉDIO** (cria ambiente isolado, não afeta produção)

### Objetivos:

1. Criar ambiente de staging isolado
2. Restaurar backup real de produção
3. Validar integridade completa dos dados
4. Testar funcionalidades críticas
5. Documentar procedimento de DR (Disaster Recovery)

### Abordagem:

**Opção A: Container Docker Isolado (Recomendado)**
- Rápido de criar
- Totalmente isolado
- Usa mesmos scripts de restauração

**Opção B: Servidor/VM Separado**
- Ambiente mais realista
- Requer infraestrutura adicional

**Vou implementar Opção A (Docker isolado)**

### Implementações:

#### A) Criar Ambiente de Staging

**Docker Compose para Staging:**
`/root/restaurante/staging/docker-compose.staging.yml`

```yaml
version: '3.8'
services:
  postgres_staging:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: staging123
      POSTGRES_DB: restaurante_staging
    ports:
      - "5433:5432"  # Porta diferente da produção
    volumes:
      - staging_postgres_data:/var/lib/postgresql/data
    networks:
      - staging_network

  backend_staging:
    build: ../backend
    environment:
      DATABASE_URL: postgresql://postgres:staging123@postgres_staging:5432/restaurante_staging?schema=public
      JWT_SECRET: staging-secret-key-for-testing-only
      NODE_ENV: staging
      PORT: 3001
    ports:
      - "3001:3001"  # Porta diferente da produção
    depends_on:
      - postgres_staging
    networks:
      - staging_network

volumes:
  staging_postgres_data:

networks:
  staging_network:
    driver: bridge
```

#### B) Script de Setup Staging

`/root/restaurante/scripts/setup-staging.sh`

**Funcionalidades:**
- ✅ Criar ambiente staging com Docker Compose
- ✅ Aguardar PostgreSQL estar pronto
- ✅ Verificar conectividade
- ✅ Logs de todas as etapas

#### C) Script de Teste de Restauração

`/root/restaurante/scripts/test-restore-staging.sh`

**Fluxo:**
1. Copiar backup mais recente de produção
2. Restaurar no PostgreSQL staging
3. Iniciar backend staging
4. Executar testes automatizados
5. Gerar relatório de validação

**Testes Automatizados:**

```bash
# T1: Verificar schemas existem
psql -U postgres -d restaurante_staging -c "\dn" | grep tenant_

# T2: Contar registros críticos
psql -U postgres -d restaurante_staging -c "
  SELECT
    'companies' as table, count(*) FROM companies
  UNION ALL
  SELECT 'users', count(*) FROM users;
"

# T3: Verificar dados de um tenant
psql -U postgres -d restaurante_staging -c "
  SELECT count(*) as products FROM tenant_chefwell.products;
  SELECT count(*) as sales FROM tenant_chefwell.sales;
  SELECT count(*) as customers FROM tenant_chefwell.customers;
"

# T4: Testar API staging
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chefwell.pro","password":"admin123"}'

# T5: Testar endpoints críticos
curl http://localhost:3001/api/products
curl http://localhost:3001/api/sales
curl http://localhost:3001/api/customers
```

#### D) Script de Validação Completa

`/root/restaurante/scripts/validate-staging.sh`

**Verificações:**
1. ✅ Todas as tabelas existem
2. ✅ Foreign keys intactas
3. ✅ Indexes criados
4. ✅ Contagem de registros por tabela
5. ✅ Usuários conseguem logar
6. ✅ Queries complexas funcionam
7. ✅ Integridade referencial OK

**Relatório de Validação:**
```
╔══════════════════════════════════════════════════════════════╗
║        RELATÓRIO DE VALIDAÇÃO - STAGING RESTORE             ║
╚══════════════════════════════════════════════════════════════╝

📅 Data: 2025-11-20 15:30:00
📁 Backup: chefwell_backup_20251120_030000.dump.gz
⏱️  Tempo de Restauração: 45 segundos

✅ SCHEMAS:
   - public (companies, users) ✅
   - tenant_chefwell ✅

✅ TABELAS (tenant_chefwell):
   - products: 28 registros ✅
   - categories: 5 registros ✅
   - sales: 18 registros ✅
   - customers: 21 registros ✅
   - tabs: 5 registros ✅
   - orders: 12 registros ✅
   - expenses: 0 registros ✅
   - stripe_payments: 0 registros ✅

✅ INTEGRIDADE:
   - Foreign Keys: 9/9 ✅
   - Indexes: 14/14 ✅
   - Unique Constraints: 2/2 ✅

✅ FUNCIONALIDADES:
   - Login: ✅ OK (200)
   - Listar Produtos: ✅ OK (28 produtos)
   - Listar Vendas: ✅ OK (18 vendas)
   - Listar Clientes: ✅ OK (21 clientes)
   - Dashboard Stats: ✅ OK

✅ RESULTADO: BACKUP VÁLIDO E RESTAURÁVEL

🎯 Confiança: 100%
📊 Tempo de Recovery: < 1 minuto
💾 Tamanho do Backup: 36K (comprimido)
```

#### E) Playbook de Disaster Recovery

`/root/restaurante/DISASTER-RECOVERY-PLAYBOOK.md`

**Conteúdo:**
- Passo a passo de restauração em produção
- Comandos exatos a executar
- Checklist de validação
- Contatos de emergência
- Tempos estimados (RTO/RPO)

**RTO (Recovery Time Objective):** < 10 minutos
**RPO (Recovery Point Objective):** < 24 horas (backup diário)

#### F) Script de Limpeza Staging

`/root/restaurante/scripts/cleanup-staging.sh`

**Funcionalidades:**
- Remove containers staging
- Remove volumes staging
- Libera portas (3001, 5433)
- Logs de limpeza

### Arquivos Criados:

1. `/root/restaurante/staging/docker-compose.staging.yml`
2. `/root/restaurante/scripts/setup-staging.sh`
3. `/root/restaurante/scripts/test-restore-staging.sh`
4. `/root/restaurante/scripts/validate-staging.sh`
5. `/root/restaurante/scripts/cleanup-staging.sh`
6. `/root/restaurante/DISASTER-RECOVERY-PLAYBOOK.md`

### Testes da Etapa 3:

**T3.1 - Setup Staging:**
```bash
/root/restaurante/scripts/setup-staging.sh
# Verificar: Containers staging criados e rodando
docker ps | grep staging
```

**T3.2 - Testar Restauração:**
```bash
/root/restaurante/scripts/test-restore-staging.sh
# Verificar: Backup restaurado sem erros
```

**T3.3 - Validação Completa:**
```bash
/root/restaurante/scripts/validate-staging.sh
# Verificar: Relatório mostra todos os checks ✅
```

**T3.4 - Testar API Staging:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chefwell.pro","password":"admin123"}'

# Produtos
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/products

# Sales
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/sales
```

**T3.5 - Comparar Produção vs Staging:**
```bash
# Contar produtos na produção
docker exec <prod-postgres> psql -U postgres -d restaurante -c \
  "SELECT count(*) FROM tenant_chefwell.products;"

# Contar produtos no staging
docker exec <staging-postgres> psql -U postgres -d restaurante_staging -c \
  "SELECT count(*) FROM tenant_chefwell.products;"

# Verificar: Mesma quantidade
```

**T3.6 - Testar Disaster Recovery (Simulado):**
```bash
# Simular perda de produção (NÃO EXECUTAR EM PROD REAL!)
# Apenas no staging para validar procedimento

# 1. Parar staging
docker-compose -f /root/restaurante/staging/docker-compose.staging.yml down

# 2. Remover volumes
docker volume rm staging_postgres_data

# 3. Executar DR completo
/root/restaurante/scripts/test-restore-staging.sh

# 4. Validar
/root/restaurante/scripts/validate-staging.sh

# Verificar: Sistema restaurado completamente
```

**T3.7 - Limpeza:**
```bash
/root/restaurante/scripts/cleanup-staging.sh
# Verificar: Staging removido, produção intacta
```

**T3.8 - Sistema Produção Funcionando:**
```bash
# Verificar que produção não foi afetada
docker service ls | grep chefwell
curl -k https://app.chefwell.pro
docker service logs --tail 50 chefwell_backend
```

**Critérios de Aprovação:**
- [ ] Ambiente staging criado com sucesso
- [ ] Backup restaurado completamente
- [ ] Validação mostra 100% dos checks ✅
- [ ] API staging funciona corretamente
- [ ] Contagens de dados batem (prod vs staging)
- [ ] DR simulado funciona
- [ ] Staging limpo sem afetar produção
- [ ] Playbook de DR documentado
- [ ] Sistema produção funcionando normalmente

---

## 📊 Resumo do Plano de Implementação

### Cronograma Estimado:

| Etapa | Tempo | Risco | Impacto Produção |
|-------|-------|-------|------------------|
| 1. Monitoramento Disk | 30-45 min | Muito Baixo | Zero |
| 2. Backup Offsite | 1-2 horas | Baixo | Zero |
| 3. Teste Restauração | 2-3 horas | Médio | Zero |
| **TOTAL** | **4-6 horas** | **Baixo** | **Zero** |

### Sequência de Execução:

```
ETAPA 1: Monitoramento Disk Space
   ├─ Implementar scripts
   ├─ Configurar cron
   ├─ Testar manualmente
   ├─ Validar sistema funcionando ✅
   └─ APROVAR para próxima etapa

ETAPA 2: Backup Offsite
   ├─ Configurar SSH
   ├─ Implementar sync script
   ├─ Testar sincronização
   ├─ Configurar cron
   ├─ Validar sistema funcionando ✅
   └─ APROVAR para próxima etapa

ETAPA 3: Teste Restauração
   ├─ Criar staging environment
   ├─ Restaurar backup real
   ├─ Validar integridade
   ├─ Testar funcionalidades
   ├─ Documentar DR
   ├─ Limpar staging
   ├─ Validar sistema funcionando ✅
   └─ CONCLUÍDO ✅
```

### Checkpoints de Validação (Após Cada Etapa):

**✅ Sistema Funcionando:**
1. [ ] Login funciona (https://app.chefwell.pro)
2. [ ] PDV funciona (criar pedido de teste)
3. [ ] Produtos carregam
4. [ ] Dashboard mostra stats
5. [ ] Backend logs sem erros
6. [ ] PostgreSQL respondendo
7. [ ] Serviços Docker ativos

**Se QUALQUER item falhar → ROLLBACK imediato**

### Rollback Plan (Por Etapa):

**Etapa 1 - Rollback:**
```bash
# Remover cron
crontab -e  # Deletar linha do monitor-disk-space

# Remover scripts
rm -f /root/restaurante/scripts/monitor-disk-space.sh
rm -f /root/restaurante/scripts/disk-status.sh
rm -f /var/log/chefwell-disk-monitor.log

# Sistema volta ao estado anterior
```

**Etapa 2 - Rollback:**
```bash
# Remover cron
crontab -e  # Deletar linha do sync-backups-offsite

# Remover scripts
rm -f /root/restaurante/scripts/sync-backups-offsite.sh
rm -f /root/restaurante/scripts/verify-offsite-backups.sh

# Opcional: Remover chave SSH
rm -f /root/.ssh/chefwell_backup*

# Backups locais permanecem intactos
```

**Etapa 3 - Rollback:**
```bash
# Limpar staging
/root/restaurante/scripts/cleanup-staging.sh

# Remover arquivos staging
rm -rf /root/restaurante/staging/

# Produção nunca foi afetada
```

### Dependências Externas:

**Etapa 1:** Nenhuma ✅

**Etapa 2:**
- Servidor de backup remoto (IP, user, SSH)
- Você precisará fornecer essas informações

**Etapa 3:**
- Docker instalado (já temos) ✅
- Portas 3001 e 5433 livres

---

## 🚀 Próximos Passos

### Opção A: Implementar Tudo de Uma Vez (4-6 horas)
```
1. Implemento Etapa 1 → Testo → Aprovo
2. Implemento Etapa 2 → Testo → Aprovo
3. Implemento Etapa 3 → Testo → Aprovo
4. Relatório Final
```

### Opção B: Implementar Por Sessão (Recomendado)
```
Sessão 1 (hoje):
  - Etapa 1: Monitoramento Disk Space
  - Teste completo
  - Você valida que tudo funciona

Sessão 2 (quando quiser):
  - Etapa 2: Backup Offsite
  - Você fornece dados do servidor remoto
  - Teste completo

Sessão 3 (quando quiser):
  - Etapa 3: Teste Restauração
  - Documentação DR
  - Conclusão
```

### Opção C: Apenas Etapa 1 Agora
```
- Implemento apenas monitoramento
- Você valida
- Decidimos depois sobre Etapas 2 e 3
```

---

## ❓ O Que Você Prefere?

**Pergunta 1:** Qual opção de implementação você prefere? (A, B, ou C)

**Pergunta 2:** Se escolher Etapa 2 (Backup Offsite), você já tem:
- Servidor remoto para backups?
- Acesso SSH configurado?
- Ou quer que eu ajude a configurar tudo?

**Pergunta 3:** Horário preferencial para implementação?
- Agora (horário de baixo tráfego ideal)
- Outro horário específico

---

**Observação Final:**

Todas as 3 etapas têm **ZERO IMPACTO** no sistema em produção:
- Etapa 1: Apenas leitura (monitoramento)
- Etapa 2: Apenas cópia de backups (não modifica originais)
- Etapa 3: Ambiente isolado (staging separado)

**Segurança:** 100% ✅
**Confiança:** Posso implementar tudo com segurança total ✅

Qual opção você prefere que eu siga?

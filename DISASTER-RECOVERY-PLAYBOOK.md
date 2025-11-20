# Playbook de Disaster Recovery - ChefWell
## Procedimento de Recuperação de Desastres

**Versão:** 1.0.0
**Data:** 20 de Novembro de 2025
**Objetivo:** Restaurar sistema ChefWell em caso de falha catastrófica

---

## 📋 Informações Críticas

### RTO (Recovery Time Objective)
**< 10 minutos** - Tempo máximo para restaurar o sistema

### RPO (Recovery Point Objective)
**< 24 horas** - Perda máxima de dados (backup diário às 3h)

### Contatos de Emergência
- **Administrador do Sistema:** [SEU CONTATO]
- **Servidor de Backup:** /root/backups-offsite
- **Logs:** /var/log/chefwell-backup.log

---

## 🚨 Cenários de Disaster Recovery

### Cenário 1: Falha do Backend
**Sintoma:** API não responde, erro 502/504

**Solução Rápida:**
```bash
# Verificar status
docker service ls | grep chefwell_backend

# Reiniciar serviço
docker service update --force chefwell_backend

# Verificar logs
docker service logs --tail 100 chefwell_backend

# Testar
curl -k https://api.chefwell.pro/health
```

**Tempo Estimado:** 2-3 minutos

---

### Cenário 2: Falha do PostgreSQL
**Sintoma:** Backend mostra erros de conexão com banco

**Solução Rápida:**
```bash
# Verificar status
docker service ls | grep chefwell_postgres

# Verificar logs
docker service logs --tail 100 chefwell_postgres

# Reiniciar serviço
docker service update --force chefwell_postgres

# Aguardar 30 segundos
sleep 30

# Reiniciar backend
docker service update --force chefwell_backend
```

**Tempo Estimado:** 3-5 minutos

---

### Cenário 3: Corrupção de Dados / Perda Total do Banco
**Sintoma:** Dados corrompidos, tabelas faltando, schemas corrompidos

**⚠️ ATENÇÃO:** Este procedimento sobrescreve TODOS os dados!

#### Passo 1: Identificar Backup Mais Recente

```bash
# Listar backups disponíveis
ls -lh /root/backups/daily/
ls -lh /root/backups/weekly/
ls -lh /root/backups/monthly/

# Verificar backup offsite
ls -lh /root/backups-offsite/daily/
```

#### Passo 2: Escolher Backup

**Prioridade:**
1. Daily mais recente (último backup diário)
2. Weekly se daily estiver corrompido
3. Monthly se os outros falharem

**Exemplo:**
```bash
BACKUP_FILE="/root/backups/daily/chefwell_backup_20251120_030001.dump.gz"
```

#### Passo 3: Parar Backend

```bash
# Parar backend para evitar escritas durante restauração
docker service scale chefwell_backend=0

# Verificar que parou
docker service ls | grep chefwell_backend
# Deve mostrar 0/2
```

#### Passo 4: Backup de Segurança (Opcional mas Recomendado)

```bash
# Fazer backup do estado atual antes de restaurar
/root/restaurante/scripts/backup-database.sh

# Mover para local seguro
mv /root/backups/daily/chefwell_backup_$(date +%Y%m%d_%H%M%S).dump.gz \
   /root/backups/emergency_pre_restore_$(date +%Y%m%d_%H%M%S).dump.gz
```

#### Passo 5: Restaurar Backup

```bash
# Descomprimir backup
gunzip -c "$BACKUP_FILE" > /tmp/restore.dump

# Encontrar container PostgreSQL
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep chefwell_postgres | head -1)

# Copiar backup para container
docker cp /tmp/restore.dump "$POSTGRES_CONTAINER":/tmp/restore.dump

# Conectar ao PostgreSQL
docker exec -it "$POSTGRES_CONTAINER" bash

# Dentro do container:
# 1. Desconectar todos os usuários
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'restaurante' AND pid <> pg_backend_pid();"

# 2. Dropar database
psql -U postgres -c "DROP DATABASE restaurante;"

# 3. Recriar database
psql -U postgres -c "CREATE DATABASE restaurante;"

# 4. Restaurar backup
pg_restore -U postgres -d restaurante /tmp/restore.dump

# 5. Limpar
rm /tmp/restore.dump
exit
```

#### Passo 6: Reiniciar Backend

```bash
# Escalar backend de volta
docker service scale chefwell_backend=2

# Aguardar inicialização
sleep 30

# Verificar status
docker service ls | grep chefwell_backend
# Deve mostrar 2/2
```

#### Passo 7: Validar Restauração

```bash
# Testar health check
curl -k https://api.chefwell.pro/health

# Testar login
curl -k -X POST https://api.chefwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chefwell.pro","password":"admin123"}'

# Acessar frontend
curl -k https://app.chefwell.pro

# Verificar logs
docker service logs --tail 50 chefwell_backend | grep -i error
```

#### Passo 8: Notificar Usuários

```bash
# Informar usuários que sistema foi restaurado
# Mencionar data/hora do backup restaurado
# Explicar possível perda de dados (desde o horário do backup)
```

**Tempo Estimado Total:** 8-10 minutos

---

### Cenário 4: Perda Total do Servidor
**Sintoma:** Servidor inacessível, HD falhou, VM deletada

**Pré-requisitos:**
- Backups offsite disponíveis
- Novo servidor/VM configurado
- Docker instalado

#### Passo 1: Preparar Novo Servidor

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Inicializar Swarm (se necessário)
docker swarm init

# Clonar repositório
cd /root
git clone [SEU-REPO] restaurante
cd restaurante
```

#### Passo 2: Recuperar Backups Offsite

```bash
# Copiar backups do servidor offsite
rsync -avz backupuser@servidor-backup:/backups/chefwell/ /root/backups/

# Ou baixar do S3/cloud storage
# aws s3 sync s3://seu-bucket/chefwell-backups /root/backups/
```

#### Passo 3: Deploy do Sistema

```bash
# Backend
cd /root/restaurante/backend
docker build -t r.chatwell.pro/restaurante-backend:latest .
docker service create \
  --name chefwell_backend \
  --replicas 2 \
  --env-file .env \
  r.chatwell.pro/restaurante-backend:latest

# Frontend
cd /root/restaurante/frontend
docker build --build-arg VITE_API_URL=https://api.chefwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
docker service create \
  --name chefwell_frontend \
  --replicas 2 \
  r.chatwell.pro/restaurante-frontend:latest

# PostgreSQL
docker service create \
  --name chefwell_postgres \
  --env POSTGRES_PASSWORD=<senha> \
  postgres:16-alpine
```

#### Passo 4: Restaurar Backup (Seguir Cenário 3)

**Tempo Estimado Total:** 30-60 minutos (depende do tamanho dos dados)

---

## 🧪 Teste Periódico de DR

**Frequência:** Mensal

**Procedimento:**
```bash
# 1. Setup staging
/root/restaurante/scripts/setup-staging.sh

# 2. Testar restauração
/root/restaurante/scripts/test-restore-staging.sh

# 3. Validar dados
# Verificar que todos os dados foram restaurados corretamente

# 4. Limpar
/root/restaurante/scripts/cleanup-staging.sh
```

**Documentar Resultado:**
- Data do teste
- Backup usado
- Tempo de restauração
- Problemas encontrados
- Ações corretivas

---

## 📊 Checklist de Validação Pós-Restauração

### Funcionalidades Críticas

- [ ] **Login:** Usuários conseguem fazer login
- [ ] **Dashboard:** Carrega com dados corretos
- [ ] **PDV (Vendas):** Consegue criar nova venda
- [ ] **Produtos:** Lista produtos corretamente
- [ ] **Categorias:** Categorias aparecem
- [ ] **Clientes:** Clientes cadastrados aparecem
- [ ] **Pedidos:** Pedidos anteriores visíveis
- [ ] **Histórico:** Vendas passadas acessíveis
- [ ] **Relatórios:** Geram sem erros

### Integridade de Dados

- [ ] **Contagem de Produtos:** Confere com último conhecido
- [ ] **Contagem de Vendas:** Confere com último conhecido
- [ ] **Usuários:** Todos os usuários presentes
- [ ] **Permissões:** Permissões funcionando
- [ ] **Foreign Keys:** Sem erros de integridade referencial

### Performance

- [ ] **Tempo de Resposta:** APIs respondendo em < 500ms
- [ ] **Queries:** Sem slow queries
- [ ] **Conexões:** Pool de conexões normal

---

## 📞 Escalação de Problemas

### Nível 1: Problemas Simples
- Reiniciar serviços
- Verificar logs
- Testar conectividade
- **Tempo de resolução:** 5-10 minutos

### Nível 2: Restauração de Backup
- Seguir Cenário 3
- **Tempo de resolução:** 10-30 minutos

### Nível 3: Reconstrução Total
- Seguir Cenário 4
- Contatar suporte técnico
- **Tempo de resolução:** 1-2 horas

---

## 🔍 Logs e Diagnóstico

### Verificar Logs

```bash
# Backend
docker service logs -f chefwell_backend | grep ERROR

# PostgreSQL
docker service logs -f chefwell_postgres

# Backup
tail -100 /var/log/chefwell-backup.log

# Offsite sync
tail -100 /var/log/chefwell-offsite-sync.log
```

### Verificar Conectividade

```bash
# Testar PostgreSQL
docker exec <postgres-container> psql -U postgres -c "SELECT version();"

# Testar Backend
curl http://localhost:3000/health

# Testar API Externa
curl -k https://api.chefwell.pro/health
```

### Verificar Recursos

```bash
# Disk space
df -h

# Docker resources
docker stats --no-stream

# Processos
top -bn1 | head -20
```

---

## 🎯 Métricas de Sucesso

**Objetivos:**
- ✅ RTO < 10 minutos (95% dos casos)
- ✅ RPO < 24 horas (backup diário)
- ✅ Taxa de sucesso de restauração: 100%
- ✅ Testes mensais realizados

**Indicadores:**
- Tempo médio de restauração
- Número de incidentes por mês
- Disponibilidade do sistema (uptime)

---

## 📝 Histórico de Incidentes

| Data | Tipo | Causa | Tempo de Recovery | Ações Tomadas |
|------|------|-------|-------------------|---------------|
| - | - | - | - | - |

---

**Última Atualização:** 20 de Novembro de 2025
**Próxima Revisão:** 20 de Dezembro de 2025
**Responsável:** [SEU NOME]

---

## ⚠️ IMPORTANTE

- **SEMPRE** faça backup antes de restaurar
- **SEMPRE** teste em staging primeiro (quando possível)
- **SEMPRE** notifique usuários antes de manutenções
- **NUNCA** delete backups sem confirmar que novos funcionam
- **DOCUMENTE** todos os incidentes e soluções

---

**FIM DO PLAYBOOK DE DISASTER RECOVERY**

# Configuração de VPS para 100 Empresas - ChefWell

## 📊 Análise de Carga Estimada

### Premissas por Empresa (média)
- **Usuários simultâneos**: 3-5 usuários ativos
- **Produtos cadastrados**: 50-200 produtos
- **Vendas/dia**: 100-300 transações
- **Comandas abertas simultâneas**: 10-30
- **Armazenamento/empresa**: 500MB-2GB (produtos, imagens, dados)

### Totais para 100 Empresas
- **Usuários simultâneos**: 300-500 (pico)
- **Produtos totais**: 5.000-20.000
- **Vendas/dia**: 10.000-30.000 transações
- **Comandas abertas**: 1.000-3.000 simultâneas
- **Requisições/segundo (pico)**: 50-100 req/s
- **Armazenamento total**: 50GB-200GB dados + backups

---

## 🖥️ CONFIGURAÇÃO RECOMENDADA DE VPS

### Configuração MÍNIMA (Produção Inicial - até 50 empresas)

```
CPU: 4 vCPUs (dedicadas)
RAM: 16 GB
Disco: 200 GB SSD NVMe
Largura de Banda: 5 TB/mês
Rede: 1 Gbps

Custo estimado: $40-80/mês
Provedores: Hetzner (CPX41), Vultr (High Performance), DigitalOcean (Performance)
```

**Distribuição de Recursos:**
- **PostgreSQL**: 6 GB RAM, 2 vCPUs
- **Backend (Node.js)**: 4 GB RAM, 1 vCPU
- **Frontend (Nginx)**: 1 GB RAM, 0.5 vCPU
- **Redis**: 2 GB RAM, 0.5 vCPU
- **Sistema + Swap**: 3 GB RAM

---

### Configuração RECOMENDADA (100 empresas com crescimento)

```
CPU: 8 vCPUs (dedicadas)
RAM: 32 GB
Disco: 500 GB SSD NVMe
Largura de Banda: 10 TB/mês
Rede: 1 Gbps

Custo estimado: $80-150/mês
Provedores: Hetzner (CCX33), Vultr, DigitalOcean, Linode
```

**Distribuição de Recursos:**
- **PostgreSQL**: 16 GB RAM, 4 vCPUs
- **Backend (Node.js)**: 8 GB RAM, 2 vCPUs (2 réplicas)
- **Frontend (Nginx)**: 2 GB RAM, 1 vCPU (2 réplicas)
- **Redis**: 4 GB RAM, 1 vCPU
- **Sistema + Swap**: 2 GB RAM

---

### Configuração IDEAL (100+ empresas, alta disponibilidade)

```
CPU: 16 vCPUs (dedicadas)
RAM: 64 GB
Disco: 1 TB SSD NVMe
Largura de Banda: 20 TB/mês
Rede: 1 Gbps

Custo estimado: $150-300/mês
Provedores: Hetzner (CCX63), OVH, Vultr Bare Metal
```

**Distribuição de Recursos:**
- **PostgreSQL**: 32 GB RAM, 8 vCPUs (com PgBouncer)
- **Backend (Node.js)**: 16 GB RAM, 4 vCPUs (3-4 réplicas)
- **Frontend (Nginx)**: 4 GB RAM, 2 vCPUs (3 réplicas)
- **Redis**: 8 GB RAM, 2 vCPUs
- **Sistema + Monitoring**: 4 GB RAM

---

## 🐳 Docker Swarm - Stack Otimizada para 100 Empresas

### docker-stack-production.yml

```yaml
version: '3.8'

services:
  # PostgreSQL - Database Principal
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: restaurante
      # Otimizações para 100 empresas
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=pt_BR.UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '8'        # 50% dos vCPUs
          memory: 32G      # 50% da RAM
        reservations:
          cpus: '4'
          memory: 16G
    command:
      - "postgres"
      - "-c"
      - "max_connections=500"                    # 100 empresas * 5 conexões médias
      - "-c"
      - "shared_buffers=8GB"                     # 25% da RAM alocada
      - "-c"
      - "effective_cache_size=24GB"              # 75% da RAM alocada
      - "-c"
      - "maintenance_work_mem=2GB"
      - "-c"
      - "checkpoint_completion_target=0.9"
      - "-c"
      - "wal_buffers=16MB"
      - "-c"
      - "default_statistics_target=100"
      - "-c"
      - "random_page_cost=1.1"                   # SSD otimizado
      - "-c"
      - "effective_io_concurrency=200"           # SSD
      - "-c"
      - "work_mem=16MB"                          # 8GB / max_connections
      - "-c"
      - "min_wal_size=1GB"
      - "-c"
      - "max_wal_size=4GB"
      - "-c"
      - "max_worker_processes=8"
      - "-c"
      - "max_parallel_workers_per_gather=4"
      - "-c"
      - "max_parallel_workers=8"
      - "-c"
      - "max_parallel_maintenance_workers=4"
    networks:
      - chefwell_network

  # Redis - Cache e Sessões
  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '2'
          memory: 8G
        reservations:
          cpus: '1'
          memory: 4G
    command:
      - "redis-server"
      - "--maxmemory"
      - "6gb"
      - "--maxmemory-policy"
      - "allkeys-lru"                            # Evicção LRU
      - "--appendonly"
      - "yes"                                    # Persistência
      - "--save"
      - "900 1"                                  # Snapshot a cada 15min
      - "--save"
      - "300 10"
      - "--save"
      - "60 10000"
    volumes:
      - redis_data:/data
    networks:
      - chefwell_network

  # Backend - Node.js (múltiplas réplicas)
  backend:
    image: r.chatwell.pro/restaurante-backend:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/restaurante?schema=public
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      REDIS_URL: redis://redis:6379
      # Performance
      NODE_OPTIONS: "--max-old-space-size=2048"  # Limite de heap por réplica
    deploy:
      replicas: 4                                # 4 réplicas para load balancing
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'                              # 2 vCPUs por réplica
          memory: 2G                             # 2GB por réplica = 8GB total
        reservations:
          cpus: '1'
          memory: 1G
    networks:
      - chefwell_network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend - Nginx (múltiplas réplicas)
  frontend:
    image: r.chatwell.pro/restaurante-frontend:latest
    deploy:
      replicas: 3                                # 3 réplicas
      update_config:
        parallelism: 1
        delay: 5s
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    networks:
      - chefwell_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.chefwell.pro`)"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

  # Traefik - Load Balancer
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@chefwell.pro"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--metrics.prometheus=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    deploy:
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '1'
          memory: 1G
    networks:
      - chefwell_network

volumes:
  postgres_data:
  redis_data:
  traefik_letsencrypt:

networks:
  chefwell_network:
    driver: overlay
    attachable: true
```

---

## ⚙️ Otimizações do Sistema Operacional

### /etc/sysctl.conf

```bash
# Network optimizations
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 10000 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30

# File descriptors
fs.file-max = 100000
fs.inotify.max_user_watches = 524288

# Memory
vm.swappiness = 10
vm.overcommit_memory = 1
vm.max_map_count = 262144

# PostgreSQL shared memory
kernel.shmmax = 17179869184  # 16GB
kernel.shmall = 4194304      # 16GB / 4KB

# Apply changes
# sudo sysctl -p
```

### /etc/security/limits.conf

```bash
* soft nofile 65535
* hard nofile 65535
* soft nproc 4096
* hard nproc 4096
postgres soft nofile 65535
postgres hard nofile 65535
```

---

## 📈 Escalabilidade - Plano de Crescimento

### 50 empresas → 100 empresas
**Ação:** Aumentar réplicas do backend de 2 para 4
```bash
docker service scale chefwell_backend=4
```

### 100 empresas → 200 empresas
**Ação:** Upgrade de VPS
- RAM: 32GB → 64GB
- CPU: 8 vCPUs → 16 vCPUs
- Réplicas backend: 4 → 6

### 200+ empresas
**Ação:** Migrar para arquitetura distribuída
- PostgreSQL dedicado (servidor separado)
- Redis Cluster (3 nós)
- Backend em múltiplos servidores
- Load balancer externo (AWS ALB, Cloudflare)

---

## 💾 Armazenamento e Backup

### Armazenamento S3/MinIO
```bash
# Para 100 empresas com imagens de produtos
Estimativa: 100 empresas * 1GB média = 100GB

# Recomendação
AWS S3: $2.30/100GB/mês (Standard)
MinIO Self-hosted: Grátis (usa disco da VPS)
Backblaze B2: $0.50/100GB/mês (mais barato)
```

### Backups
```bash
# Diários: 7 dias * 500MB = 3.5GB
# Semanais: 4 semanas * 500MB = 2GB
# Mensais: 3 meses * 500MB = 1.5GB
Total backups: ~7GB

# Armazenamento total necessário
Database: 50GB (100 schemas)
Backups: 7GB
S3/Imagens: 100GB
Sistema: 20GB
---------------
Total: ~180GB → Recomendado: 500GB SSD
```

---

## 🔍 Monitoramento

### Ferramentas Recomendadas

1. **Prometheus + Grafana** (self-hosted)
   - Métricas de CPU, RAM, Disco
   - Latência de requests
   - Taxa de erro

2. **Uptime Robot** (gratuito até 50 monitores)
   - Health checks HTTP
   - Alertas por email/SMS

3. **Sentry** (gratuito até 5k eventos/mês)
   - Error tracking
   - Performance monitoring

### Dashboard Crítico
```
- CPU Usage: < 70% (alerta em 80%)
- RAM Usage: < 80% (alerta em 90%)
- Disco Usage: < 70% (alerta em 80%)
- PostgreSQL connections: < 400/500
- Response time: < 200ms (p95)
- Error rate: < 1%
```

---

## 💰 Custos Estimados Mensais

### Configuração Recomendada (100 empresas)

| Item | Custo Mensal |
|------|--------------|
| VPS (8 vCPUs, 32GB RAM, 500GB SSD) | $80-150 |
| Backblaze B2 (100GB) | $0.50 |
| Domínio (.pro) | $2 |
| SSL (Let's Encrypt) | Grátis |
| Email (SendGrid - 40k emails/mês) | Grátis |
| Monitoring (Uptime Robot) | Grátis |
| **TOTAL** | **$82-152/mês** |

### Por Empresa
```
Custo total: $152/mês
Empresas: 100
Custo por empresa: $1.52/mês
```

**Margem sugerida:** $10-30/empresa/mês = lucro de $848-$2.848/mês

---

## 🚀 Deploy Inicial para 100 Empresas

### 1. Provisionar VPS
```bash
# Recomendação: Hetzner CCX33 (8 vCPUs, 32GB RAM, 500GB NVMe)
# Custo: €63.39/mês (~$70/mês)
# Localização: Falkenstein, Germany (baixa latência para Brasil)
```

### 2. Configurar Sistema
```bash
# Instalar Docker Swarm
curl -fsSL https://get.docker.com | sh
docker swarm init

# Configurar sysctl
sudo nano /etc/sysctl.conf
# (adicionar otimizações acima)
sudo sysctl -p

# Configurar limits
sudo nano /etc/security/limits.conf
# (adicionar limites acima)
```

### 3. Deploy Stack
```bash
# Criar .env
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 48)
FRONTEND_URL=https://app.chefwell.pro
EOF

# Deploy
docker stack deploy -c docker-stack-production.yml chefwell
```

### 4. Criar Empresas
```bash
# Script para criar 100 empresas
for i in {1..100}; do
  /root/restaurante/scripts/create-company.sh "Empresa $i" "empresa$i"
done
```

---

## 📊 Benchmarks Esperados

### Configuração Recomendada (8 vCPUs, 32GB RAM)

| Métrica | Valor Esperado |
|---------|----------------|
| Requisições/segundo | 200-400 req/s |
| Latência média | 50-100ms |
| Latência p95 | < 200ms |
| Usuários simultâneos | 500-1000 |
| Uptime | 99.9% |
| Tempo de resposta DB | < 10ms |

---

## 🔧 Troubleshooting

### CPU Alta (> 80%)
```bash
# Adicionar mais réplicas do backend
docker service scale chefwell_backend=6

# Verificar queries lentas no PostgreSQL
docker exec postgres_container psql -U postgres -d restaurante \
  -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### RAM Alta (> 90%)
```bash
# Aumentar limite de memória do PostgreSQL
docker service update --env-add POSTGRES_SHARED_BUFFERS=4GB chefwell_postgres

# Verificar consumo por container
docker stats
```

### Disco Cheio (> 80%)
```bash
# Limpar backups antigos
find /root/backups -name "*.dump.gz" -mtime +60 -delete

# Limpar logs do Docker
docker system prune -a --volumes -f
```

---

## ✅ Checklist de Deploy

- [ ] VPS provisionada (8 vCPUs, 32GB RAM, 500GB SSD)
- [ ] Sistema operacional atualizado (Ubuntu 22.04 LTS)
- [ ] Docker Swarm configurado
- [ ] Otimizações de sysctl aplicadas
- [ ] Firewall configurado (80, 443, 22 apenas)
- [ ] SSL/TLS configurado (Let's Encrypt)
- [ ] Backups automáticos rodando (cron job)
- [ ] Monitoramento configurado (Uptime Robot + /health)
- [ ] DNS configurado (app.chefwell.pro, api.chefwell.pro)
- [ ] Teste de carga realizado (100 empresas simuladas)
- [ ] Plano de escalabilidade documentado
- [ ] Alertas configurados (CPU > 80%, RAM > 90%, Disco > 80%)

---

**Documento criado em:** 16 de Novembro de 2025
**Versão:** 1.0.0
**Para:** ChefWell v2.5.0 - Sistema Multi-Tenant para 100+ Empresas

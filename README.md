# ChefWell - Multi-tenant Restaurant Management System

[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-tomautomations/app.chefwell-blue)](https://hub.docker.com/u/tomautomations)
[![GitHub](https://img.shields.io/badge/GitHub-TOMBRITO1979/app.chefwell-green)](https://github.com/TOMBRITO1979/app.chefwell)
[![Version](https://img.shields.io/badge/version-2.2.0-orange)](https://github.com/TOMBRITO1979/app.chefwell/releases)

Complete SaaS restaurant management system with multi-tenant architecture, supporting unlimited restaurants with schema-based isolation.

## 📋 Características

- ✅ **Multi-tenant**: Cada empresa tem seu próprio schema no PostgreSQL
- ✅ **Autenticação**: JWT com 3 níveis (SUPER_ADMIN, ADMIN, USER)
- ✅ **PDV Completo**: Sistema de vendas com comandas/tabs
- ✅ **Gestão de Produtos**: Catálogo completo com variações e adicionais
- ✅ **Relatórios**: Lucro, receita, tempo de entrega
- ✅ **Despesas**: Controle de despesas com recorrência automática
- ✅ **Export**: PDF e CSV de vendas e despesas
- ✅ **Multi-storage**: Local, AWS S3 ou MinIO
- ✅ **Docker Swarm**: Deploy escalável em produção
- ✅ **HTTPS**: SSL/TLS via Traefik + Let's Encrypt

## 🏗️ Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Frontend  │────▶│   Traefik    │────▶│  Backend   │
│   (React)   │     │  (Reverse    │     │  (Node.js) │
│             │     │   Proxy)     │     │  + Prisma  │
└─────────────┘     └──────────────┘     └──────┬─────┘
                                                 │
                    ┌────────────────────────────┼─────┐
                    ▼                            ▼     ▼
              ┌───────────┐              ┌────────┐ ┌───────┐
              │PostgreSQL │              │ Redis  │ │ S3/   │
              │  (Multi-  │              │        │ │MinIO  │
              │  tenant)  │              │        │ │       │
              └───────────┘              └────────┘ └───────┘
```

## 📦 Docker Images

### Docker Hub
- **Backend:** `tomautomations/app.chefwell-backend:latest` ou `tomautomations/app.chefwell-backend:v2.2.0`
- **Frontend:** `tomautomations/app.chefwell-frontend:latest` ou `tomautomations/app.chefwell-frontend:v2.2.0`

### GitHub Repository
- **Código Fonte:** [https://github.com/TOMBRITO1979/app.chefwell](https://github.com/TOMBRITO1979/app.chefwell)

## 🚀 Deploy Rápido

### Pré-requisitos

- Docker Swarm inicializado
- Traefik rodando com rede `network_public`
- Domínios configurados (DNS apontando para o servidor)

### Passo 1: Configurar Ambiente

```bash
# Clonar ou copiar os arquivos do projeto
cd /root/restaurante

# Copiar e editar variáveis de ambiente
cp .env.example .env
nano .env
```

**Variáveis OBRIGATÓRIAS no .env:**
```bash
FRONTEND_DOMAIN=app.seudominio.com
BACKEND_DOMAIN=api.seudominio.com
FRONTEND_URL=https://app.seudominio.com
POSTGRES_PASSWORD=sua-senha-forte-aqui
JWT_SECRET=sua-chave-jwt-super-secreta
```

### Passo 2: Build das Imagens

```bash
# Backend
cd backend
docker build -t r.chatwell.pro/restaurante-backend:latest .

# Frontend (IMPORTANTE: incluir a URL da API no build)
cd ../frontend
docker build --no-cache \
  --build-arg VITE_API_URL=https://api.seudominio.com \
  -t r.chatwell.pro/restaurante-frontend:latest .
```

### Passo 3: Deploy

```bash
cd /root/restaurante
./deploy.sh
```

### Passo 4: Inicializar Banco de Dados

```bash
# Aguardar os serviços subirem (30-60 segundos)
sleep 45

# Criar schema e super admin
./scripts/init-database.sh
```

Pronto! Acesse `https://app.seudominio.com` e faça login.

## 📚 Documentação Completa

- 📖 [DEPLOY-INSTRUCTIONS.md](./DEPLOY-INSTRUCTIONS.md) - Guia completo de deploy
- 📄 [docker-deploy.yml](./docker-deploy.yml) - Stack Docker Swarm
- 🔧 [.env.example](./.env.example) - Variáveis de ambiente

## 🔐 Acesso Padrão

Após executar o script de inicialização:

- **Email**: admin@seudominio.com
- **Senha**: Admin123! (MUDE IMEDIATAMENTE)

## 📊 Monitoramento

```bash
# Ver status dos serviços
docker service ls --filter name=restaurante

# Ver logs
docker service logs -f restaurante_backend
docker service logs -f restaurante_frontend
docker service logs -f restaurante_postgres

# Escalar serviços
docker service scale restaurante_backend=3
docker service scale restaurante_frontend=3
```

## 🛠️ Troubleshooting

### Backend não conecta ao PostgreSQL

**Solução**: O PostgreSQL DEVE usar `endpoint_mode: dnsrr` no docker-deploy.yml. Isso já está configurado.

### Frontend não carrega API

**Solução**: Rebuild do frontend com `--build-arg VITE_API_URL=https://api.seudominio.com`

### Erro de SSL/TLS

**Solução**: Aguardar alguns minutos para o Traefik emitir certificados Let's Encrypt.

## 📈 Escalabilidade

O sistema suporta escalabilidade horizontal:

- **Frontend**: 1-10+ réplicas
- **Backend**: 1-10+ réplicas  
- **PostgreSQL**: 1 réplica (master) - para HA, use replicação externa
- **Redis**: 1 réplica - para HA, use Redis Sentinel/Cluster

## 🔒 Segurança

- ✅ JWT com expiração configurável
- ✅ Bcrypt para hashing de senhas
- ✅ HTTPS obrigatório (Traefik + Let's Encrypt)
- ✅ Rate limiting habilitado
- ✅ Helmet.js para headers de segurança
- ✅ CORS configurado
- ✅ Isolamento multi-tenant por schema

## 📦 Backup

```bash
# Backup automático do banco
docker exec $(docker ps -q -f name=restaurante_postgres) \
  pg_dump -U postgres restaurante > backup-$(date +%Y%m%d).sql

# Backup dos uploads
docker run --rm -v restaurante_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-$(date +%Y%m%d).tar.gz /data
```

## 🤝 Contribuindo

Este é um projeto privado. Para modificações, consulte a equipe de desenvolvimento.

## 📞 Suporte

Para problemas técnicos, consulte a documentação em `DEPLOY-INSTRUCTIONS.md` ou entre em contato com o suporte técnico.

## 📝 Licença

Propriedade privada. Todos os direitos reservados.

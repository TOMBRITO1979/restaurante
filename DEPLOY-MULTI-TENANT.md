# Guia de Deploy Multi-Tenant

Este guia explica como implantar o sistema para múltiplas empresas, cada uma com seus próprios domínios.

## Arquitetura Multi-Tenant

O sistema usa **PostgreSQL schemas** para isolar dados de cada empresa:

- **Banco de dados único**: Todas as empresas compartilham o mesmo PostgreSQL
- **Schemas separados**: Cada empresa tem seu próprio schema (`tenant_xxxxx`)
- **Isolamento total**: Dados de uma empresa nunca são visíveis para outra
- **Aplicação compartilhada**: Mesma imagem Docker para todas as empresas

## Opções de Deploy

### Opção 1: Múltiplas Instâncias (Recomendado)

Cada empresa tem sua própria instância da aplicação com domínios dedicados.

**Vantagens:**
- Isolamento completo (aplicação + dados)
- Customização por empresa
- Escalabilidade independente
- Falhas isoladas

**Estrutura:**
```
Empresa A:
- Frontend: empresa-a.com
- Backend: api.empresa-a.com
- Schema: tenant_xxxxx

Empresa B:
- Frontend: empresa-b.com
- Backend: api.empresa-b.com
- Schema: tenant_yyyyy
```

### Opção 2: Instância Única com Subdomínios

Uma única instância serve múltiplas empresas através de subdomínios.

**Vantagens:**
- Menor uso de recursos
- Manutenção centralizada
- Deploy único

**Estrutura:**
```
Empresa A:
- Frontend: empresa-a.meurestaurante.com
- Backend: empresa-a-api.meurestaurante.com
- Schema: tenant_xxxxx

Empresa B:
- Frontend: empresa-b.meurestaurante.com
- Backend: empresa-b-api.meurestaurante.com
- Schema: tenant_yyyyy
```

## Deploy - Múltiplas Instâncias

### Passo 1: Preparar DNS

Configure DNS para apontar para o servidor:

```
# Empresa A
empresa-a.com           → IP_DO_SERVIDOR
api.empresa-a.com       → IP_DO_SERVIDOR

# Empresa B
empresa-b.com           → IP_DO_SERVIDOR
api.empresa-b.com       → IP_DO_SERVIDOR
```

### Passo 2: Criar Arquivo de Ambiente

Para cada empresa, crie um arquivo `.env.empresa-X`:

```bash
# .env.empresa-a
FRONTEND_DOMAIN=empresa-a.com
BACKEND_DOMAIN=api.empresa-a.com
FRONTEND_URL=https://empresa-a.com

POSTGRES_PASSWORD=senha-compartilhada-segura
JWT_SECRET=jwt-secret-unico-empresa-a

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=key-empresa-a
AWS_SECRET_ACCESS_KEY=secret-empresa-a
AWS_S3_BUCKET=bucket-empresa-a

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contato@empresa-a.com
SMTP_PASS=senha-app-gmail
SMTP_FROM=Empresa A <noreply@empresa-a.com>
```

### Passo 3: Criar Stack para Cada Empresa

Crie uma cópia do docker-stack.yml para cada empresa:

```bash
# Copiar stack base
cp docker-stack.yml docker-stack-empresa-a.yml
cp docker-stack.yml docker-stack-empresa-b.yml

# Editar cada stack para ajustar nomes dos serviços
# Exemplo: docker-stack-empresa-a.yml
```

**Modifique os nomes dos serviços em cada stack:**

```yaml
services:
  postgres_empresa_a:
    # ... (pode compartilhar o mesmo postgres)
  
  backend_empresa_a:
    # ...
    env_file:
      - .env.empresa-a
  
  frontend_empresa_a:
    # ...
    env_file:
      - .env.empresa-a
```

### Passo 4: Deploy

```bash
# Deploy Empresa A
docker stack deploy -c docker-stack-empresa-a.yml restaurante_empresa_a

# Deploy Empresa B
docker stack deploy -c docker-stack-empresa-b.yml restaurante_empresa_b

# Verificar status
docker stack ps restaurante_empresa_a
docker stack ps restaurante_empresa_b
```

### Passo 5: Criar Empresa no Sistema

Acesse o sistema como SUPER_ADMIN e crie a empresa:

1. Acesse qualquer instância (ou a instância principal)
2. Login com conta SUPER_ADMIN
3. Vá em "Empresas" > "Nova Empresa"
4. Preencha os dados da empresa
5. O sistema criará automaticamente o schema tenant

### Passo 6: Criar Usuário Admin da Empresa

1. Ainda logado como SUPER_ADMIN
2. Vá em "Usuários" > "Novo Usuário"
3. Selecione a empresa criada
4. Defina role como "ADMIN"
5. O admin poderá então gerenciar sua empresa

## Deploy - Instância Única (Alternativa)

Para usar uma única instância servindo múltiplas empresas:

### Modificar Traefik Labels

Edite `docker-stack.yml` para aceitar múltiplos hosts:

```yaml
frontend:
  deploy:
    labels:
      - traefik.enable=true
      - traefik.docker.network=network_public
      - traefik.http.routers.restaurante-frontend.rule=Host(`empresa-a.meurestaurante.com`) || Host(`empresa-b.meurestaurante.com`)
      - traefik.http.routers.restaurante-frontend.entrypoints=websecure
      - traefik.http.routers.restaurante-frontend.tls.certresolver=letsencrypt
      - traefik.http.services.restaurante-frontend.loadbalancer.server.port=80

backend:
  deploy:
    labels:
      - traefik.enable=true
      - traefik.docker.network=network_public
      - traefik.http.routers.restaurante-backend.rule=Host(`api.empresa-a.meurestaurante.com`) || Host(`api.empresa-b.meurestaurante.com`)
      - traefik.http.routers.restaurante-backend.entrypoints=websecure
      - traefik.http.routers.restaurante-backend.tls.certresolver=letsencrypt
      - traefik.http.services.restaurante-backend.loadbalancer.server.port=3000
```

**Nota:** Esta abordagem requer rebuild do frontend para cada nova empresa adicionada, pois a `VITE_API_URL` é embedada em build time.

## Recursos Compartilhados vs. Dedicados

### PostgreSQL

**Compartilhado (Recomendado):**
```yaml
# Usar o mesmo serviço postgres para todas as empresas
# Cada empresa terá seu schema separado
postgres:
  volumes:
    - restaurante_postgres_data:/var/lib/postgresql/data
```

**Dedicado:**
```yaml
# Cada empresa tem seu próprio PostgreSQL
postgres_empresa_a:
  volumes:
    - restaurante_postgres_data_empresa_a:/var/lib/postgresql/data
```

### S3 Bucket

**Compartilhado:**
```bash
# Mesmo bucket, prefixos diferentes
AWS_S3_BUCKET=restaurante-saas
# App salva em: s3://restaurante-saas/empresa-a/produtos/
```

**Dedicado:**
```bash
# Bucket por empresa
AWS_S3_BUCKET=restaurante-empresa-a
```

## Manutenção

### Atualizar Todas as Instâncias

```bash
#!/bin/bash

# Build das imagens
cd /root/restaurante/backend
docker build -t r.chatwell.pro/restaurante-backend:latest .

cd /root/restaurante/frontend
docker build --build-arg VITE_API_URL=https://api.empresa-a.com \
  -t r.chatwell.pro/restaurante-frontend:empresa-a .

docker build --build-arg VITE_API_URL=https://api.empresa-b.com \
  -t r.chatwell.pro/restaurante-frontend:empresa-b .

# Update dos serviços
docker service update --image r.chatwell.pro/restaurante-backend:latest \
  --force restaurante_empresa_a_backend

docker service update --image r.chatwell.pro/restaurante-frontend:empresa-a \
  --force restaurante_empresa_a_frontend

# Repetir para empresa B
```

### Backup

```bash
# Backup de schemas específicos
docker exec postgres_container \
  pg_dump -U postgres -d restaurante -n tenant_xxxxx \
  > backup-empresa-a.sql
```

### Migração de Dados

Para migrar uma empresa de uma instância para outra:

1. Fazer backup do schema tenant
2. Restaurar em outro servidor
3. Atualizar DNS
4. Deploy da nova instância

## Troubleshooting

### Frontend não conecta ao Backend

- Verifique se `VITE_API_URL` foi passada no build
- Confirme que CORS está configurado corretamente no backend
- Verifique DNS e certificados SSL

### Empresa não encontrada

- Confirme que a empresa foi criada via interface SUPER_ADMIN
- Verifique que o schema tenant existe no PostgreSQL
- Confira os logs do backend

### Certificado SSL não gerado

- Confirme que DNS aponta para o servidor
- Aguarde alguns minutos para Traefik processar
- Verifique logs do Traefik

## Custos Estimados

### Por Empresa (AWS)

- **EC2 (t3.medium)**: ~$30/mês
- **RDS PostgreSQL (db.t3.micro)**: ~$15/mês (compartilhado)
- **S3**: ~$1/mês por 10GB
- **Domínio**: ~$12/ano

**Total por empresa (dedicada):** ~$45-50/mês
**Total compartilhado (10 empresas):** ~$10-15/mês por empresa

## Segurança

1. **Isole JWT_SECRET** por empresa para evitar token sharing
2. **Use buckets S3 separados** para isolamento de arquivos
3. **Configure rate limiting** no Traefik por domínio
4. **Monitore acessos** entre schemas (não deve haver)
5. **Backups regulares** de cada schema tenant

## Conclusão

A arquitetura multi-tenant do sistema permite servir múltiplas empresas de forma eficiente e segura. Escolha a opção de deploy que melhor se adequa ao seu caso de uso e escala.

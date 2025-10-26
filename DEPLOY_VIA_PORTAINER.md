# 🚀 Deploy via Portainer - Restaurante SaaS

Guia completo para fazer deploy do sistema usando o Portainer já instalado.

---

## 📋 Pré-requisitos Concluídos

✅ Docker Swarm inicializado
✅ Traefik rodando
✅ Portainer instalado em https://port.chatwell.pro
✅ Rede network_public criada

---

## 🎯 Passo a Passo

### 1️⃣ Fazer Build das Imagens Docker

**Conecte no servidor VPS:**

```bash
ssh root@82.29.197.68
```

**Clone o repositório (se ainda não clonou):**

```bash
cd /opt
git clone https://github.com/TOMBRITO1979/restaurante.git
cd restaurante
```

**Execute o build das imagens:**

```bash
chmod +x build-images.sh
./build-images.sh
```

⏱️ **Tempo estimado:** 10-15 minutos

Isso vai:
- Fazer login no Docker Hub
- Build do backend
- Build do frontend
- Push das imagens para Docker Hub

---

### 2️⃣ Acessar o Portainer

1. Abra: **https://port.chatwell.pro**

2. Faça login:
   - User: `wasolutionscorp`
   - Senha: `g3TRUkWjQC41M6awusuzTppqaBhb48`

3. Clique em **"Primary"** (seu swarm manager)

---

### 3️⃣ Criar a Stack no Portainer

1. No menu lateral, clique em **"Stacks"**

2. Clique no botão **"+ Add stack"**

3. Preencha:
   - **Name:** `restaurante`
   - **Build method:** Escolha **"Web editor"**

4. **Cole o conteúdo da stack:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: restaurante
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  backend:
    image: tomautomations/restaurante-backend:latest
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/restaurante?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      AWS_REGION: ${AWS_REGION}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_S3_BUCKET: ${AWS_S3_BUCKET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_SECURE: ${SMTP_SECURE}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: ${SMTP_FROM}
      NODE_ENV: production
      PORT: 3000
      FRONTEND_URL: https://${FRONTEND_DOMAIN}
    networks:
      - network_public
      - internal
    depends_on:
      - postgres
    deploy:
      replicas: 1
      labels:
        - traefik.enable=true
        - traefik.docker.network=network_public
        - traefik.http.routers.restaurante-backend.rule=Host(`${BACKEND_DOMAIN}`)
        - traefik.http.routers.restaurante-backend.entrypoints=websecure
        - traefik.http.routers.restaurante-backend.tls.certresolver=letsencrypt
        - traefik.http.services.restaurante-backend.loadbalancer.server.port=3000
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

  frontend:
    image: tomautomations/restaurante-frontend:latest
    networks:
      - network_public
    depends_on:
      - backend
    deploy:
      replicas: 1
      labels:
        - traefik.enable=true
        - traefik.docker.network=network_public
        - traefik.http.routers.restaurante-frontend.rule=Host(`${FRONTEND_DOMAIN}`)
        - traefik.http.routers.restaurante-frontend.entrypoints=websecure
        - traefik.http.routers.restaurante-frontend.tls.certresolver=letsencrypt
        - traefik.http.services.restaurante-frontend.loadbalancer.server.port=80
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

networks:
  network_public:
    external: true
  internal:
    driver: overlay

volumes:
  postgres_data:
```

5. **Role até "Environment variables"** e clique em **"+ Add an environment variable"**

6. **Adicione TODAS estas variáveis** (uma por uma ou use "Advanced mode"):

```
FRONTEND_DOMAIN=r.chatwell.pro
BACKEND_DOMAIN=rapi.chatwell.pro
POSTGRES_PASSWORD=<sua-senha-postgres>
JWT_SECRET=<seu-jwt-secret>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<seu-access-key>
AWS_SECRET_ACCESS_KEY=<seu-secret-key>
AWS_S3_BUCKET=<seu-bucket>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<seu-email>
SMTP_PASS=<sua-senha-app>
SMTP_FROM=<seu-nome> <seu-email>
```

**NOTA:** Use o arquivo `portainer-env-variables.txt` que contém os valores reais já configurados.

7. Clique em **"Deploy the stack"**

---

### 4️⃣ Aguardar Deploy

⏱️ **Aguarde 2-3 minutos** para:
- PostgreSQL iniciar
- Backend fazer migrations
- Frontend iniciar
- Traefik gerar certificados SSL

**Verificar status:**
- No Portainer, vá em **Stacks > restaurante**
- Clique nos serviços para ver logs
- Todos devem mostrar **1/1** (running)

---

### 5️⃣ Criar Super Admin

**Via SSH no servidor:**

```bash
ssh root@82.29.197.68
cd /opt/restaurante
```

**Execute:**

```bash
cat > /tmp/create-admin.sh << 'EOF'
#!/bin/bash
UUID=$(cat /proc/sys/kernel/random/uuid)
EMAIL="admin@chatwell.pro"
PASS="Admin@2024Secure"

# Aguardar backend estar pronto
sleep 10
CONT=$(docker ps -q -f name=restaurante_backend | head -n1)
if [ -z "$CONT" ]; then
    echo "Aguardando backend..."
    sleep 20
    CONT=$(docker ps -q -f name=restaurante_backend | head -n1)
fi

# Gerar hash
HASH=$(docker exec $CONT node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('$PASS',10));")

# Inserir no banco
PG=$(docker ps -q -f name=restaurante_postgres)
docker exec -i $PG psql -U postgres restaurante <<SQL
INSERT INTO users (id,email,password,name,role,"isActive","createdAt","updatedAt")
VALUES ('$UUID','$EMAIL','$HASH','Administrador','SUPER_ADMIN',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;
SQL

echo ""
echo "✅ Super Admin criado!"
echo "📧 Email: $EMAIL"
echo "🔑 Senha: $PASS"
EOF

chmod +x /tmp/create-admin.sh
/tmp/create-admin.sh
```

---

### 6️⃣ Acessar o Sistema

🌐 **Acesse:** https://r.chatwell.pro

🔑 **Faça login:**
- Email: `admin@chatwell.pro`
- Senha: `Admin@2024Secure`

---

## ✅ Verificar se Está Funcionando

### Via Portainer:

1. **Stacks > restaurante** - Deve mostrar 3 serviços ativos
2. **Services** - Verificar logs de cada serviço
3. Todos devem estar **1/1** (verde)

### Via SSH:

```bash
# Ver serviços
docker service ls

# Ver logs
docker service logs -f restaurante_backend
docker service logs -f restaurante_frontend
docker service logs -f restaurante_postgres

# Testar API
curl https://rapi.chatwell.pro/health
```

### Via Browser:

- ✅ https://r.chatwell.pro - Frontend carrega
- ✅ https://rapi.chatwell.pro/health - Retorna {"status":"ok"}
- ✅ Login funciona

---

## 🎯 Primeiro Uso

1. **Login como Super Admin**
   - Email: admin@chatwell.pro
   - Senha: Admin@2024Secure

2. **Criar primeira empresa:**
   - Menu lateral → **Empresas**
   - Botão **"Nova Empresa"**
   - Preencher:
     - Nome da empresa: "Meu Restaurante"
     - Email: empresa@exemplo.com
     - Telefone: (opcional)
     - Nome do Admin: "Admin Restaurante"
     - Email do Admin: admin.restaurante@exemplo.com
     - Senha do Admin: SuaSenhaAqui123!
   - Clique **"Criar"**

3. **Logout e login como Admin da empresa**
   - Use as credenciais do admin que você criou

4. **Criar categorias de produtos:**
   - Menu → **Produtos** (ou criar no modal)
   - Exemplos: Lanches, Bebidas, Sobremesas, Porções

5. **Cadastrar produtos:**
   - Botão **"Novo Produto"**
   - Preencher todos os campos
   - Upload de imagem (AWS S3 configurado)
   - Adicionar variações (ex: P, M, G)
   - Adicionar adicionais (ex: Queijo extra, Bacon)

---

## 🔧 Comandos Úteis

### Atualizar Stack:

**Via Portainer:**
- Stacks > restaurante > Editor
- Fazer mudanças
- Botão "Update the stack"

**Via SSH:**
```bash
cd /opt/restaurante
git pull
./build-images.sh
# Depois atualizar via Portainer ou:
docker stack deploy -c restaurante-stack.yaml restaurante
```

### Ver Logs:

**Via Portainer:**
- Stacks > restaurante > [serviço] > Logs

**Via SSH:**
```bash
docker service logs -f restaurante_backend --tail 100
docker service logs -f restaurante_frontend --tail 100
docker service logs -f restaurante_postgres --tail 100
```

### Reiniciar Serviço:

**Via Portainer:**
- Services > [serviço] > Update > Force update

**Via SSH:**
```bash
docker service update --force restaurante_backend
docker service update --force restaurante_frontend
```

### Backup Banco de Dados:

```bash
# Fazer backup
docker exec $(docker ps -q -f name=restaurante_postgres) \
  pg_dump -U postgres restaurante > /opt/backup-restaurante-$(date +%Y%m%d).sql

# Restaurar backup
cat /opt/backup-restaurante-YYYYMMDD.sql | \
  docker exec -i $(docker ps -q -f name=restaurante_postgres) \
  psql -U postgres restaurante
```

---

## ⚠️ Troubleshooting

### Certificado SSL não gerado:

1. Verificar DNS:
   ```bash
   nslookup r.chatwell.pro
   nslookup rapi.chatwell.pro
   ```
   Devem apontar para 82.29.197.68

2. Verificar Traefik:
   ```bash
   docker service logs traefik_traefik | grep -i cert
   ```

3. Aguardar até 10 minutos

### Serviço não inicia:

1. **Via Portainer:**
   - Services > [serviço] > Ver logs
   - Verificar erros

2. **Verificar variáveis:**
   - Stacks > restaurante > Environment variables
   - Conferir se todas estão corretas

3. **Reiniciar:**
   ```bash
   docker service update --force restaurante_backend
   ```

### Erro no banco de dados:

```bash
# Ver logs
docker service logs restaurante_postgres

# Resetar (CUIDADO: apaga dados!)
docker stack rm restaurante
docker volume rm restaurante_postgres_data
# Depois fazer deploy novamente
```

### Upload de imagem não funciona:

1. Verificar variáveis AWS S3
2. Testar credenciais
3. Ver logs do backend

---

## 📊 Monitoramento

### Via Portainer Dashboard:

- **Home** - Ver recursos do cluster
- **Services** - Status dos serviços
- **Containers** - Containers rodando
- **Volumes** - Uso de volumes
- **Networks** - Redes configuradas

### Alertas Automáticos:

Configure no Portainer:
- Settings > Notifications
- Adicionar webhook ou email
- Configurar alertas de falha

---

## 🎉 Pronto!

O sistema está rodando em produção!

**URLs:**
- 🌐 Frontend: https://r.chatwell.pro
- 🔌 Backend API: https://rapi.chatwell.pro
- ⚙️ Portainer: https://port.chatwell.pro
- ❤️ Health Check: https://rapi.chatwell.pro/health

**Credenciais Padrão:**
- 📧 Email: admin@chatwell.pro
- 🔑 Senha: Admin@2024Secure
- ⚠️ **ALTERE A SENHA APÓS PRIMEIRO LOGIN!**

---

## 📚 Documentação Adicional

- `README.md` - Documentação completa do sistema
- `QUICK_START.md` - Guia rápido
- `DEPLOY_INSTRUCTIONS.md` - Instruções detalhadas

---

**Qualquer dúvida, estou à disposição! 🚀**

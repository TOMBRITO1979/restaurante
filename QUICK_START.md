# Guia Rápido de Inicialização

## Pré-requisitos

1. Servidor VPS com Docker e Docker Swarm inicializado
2. Traefik configurado e rodando
3. Domínios apontando para o servidor
4. Credenciais de acesso ao servidor

## Passo a Passo

### 1. Clonar o repositório no servidor

```bash
ssh root@82.29.197.68
cd /opt
git clone https://github.com/TOMBRITO1979/restaurante.git
cd restaurante
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Configure as seguintes variáveis **OBRIGATÓRIAS**:

```env
# Domains - ALTERE PARA SUAS URLs
FRONTEND_DOMAIN=app.seudominio.com
BACKEND_DOMAIN=api.seudominio.com
FRONTEND_URL=https://app.seudominio.com

# Database - ESCOLHA UMA SENHA FORTE
POSTGRES_PASSWORD=sua-senha-segura-postgres

# JWT - GERE UMA CHAVE ALEATÓRIA
JWT_SECRET=sua-chave-secreta-jwt-muito-segura
```

### 3. Configurar token do Docker Hub

```bash
export DOCKER_HUB_TOKEN='seu-docker-hub-token'
```

Ou adicione no arquivo `.env`:

```env
DOCKER_HUB_TOKEN=seu-docker-hub-token
```

### 4. Executar deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

O script irá:
- Fazer login no Docker Hub
- Buildar as imagens do backend e frontend
- Fazer push para o Docker Hub
- Criar a rede network_public (se não existir)
- Fazer deploy da stack no Docker Swarm

### 5. Verificar status

```bash
# Listar serviços
docker service ls

# Ver logs do backend
docker service logs -f restaurante_backend

# Ver logs do frontend
docker service logs -f restaurante_frontend

# Ver logs do PostgreSQL
docker service logs -f restaurante_postgres
```

### 6. Criar o primeiro Super Admin

```bash
chmod +x create-super-admin.sh
./create-super-admin.sh
```

Digite:
- Nome: Seu nome
- Email: seu@email.com
- Senha: sua senha segura

### 7. Acessar o sistema

Acesse: `https://app.seudominio.com` (substitua pela sua URL)

Faça login com as credenciais do Super Admin criadas no passo 5.

### 8. Criar sua primeira empresa

Como Super Admin, você pode:
1. Ir em "Empresas" no menu lateral
2. Clicar em "Nova Empresa"
3. Preencher os dados da empresa e do administrador
4. A empresa e o admin serão criados automaticamente

### 9. Fazer login como Admin da empresa

1. Sair da conta de Super Admin
2. Fazer login com o email e senha do Admin criado
3. Agora você pode:
   - Criar categorias de produtos
   - Cadastrar produtos
   - Criar usuários para sua empresa
   - Gerenciar permissões

## Configurações Opcionais (Podem ser feitas depois)

### AWS S3 (para upload de imagens)

Edite o arquivo `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=seu-access-key
AWS_SECRET_ACCESS_KEY=seu-secret-key
AWS_S3_BUCKET=seu-bucket
```

Depois execute:

```bash
docker stack deploy -c docker-stack.yml restaurante
```

### SMTP (para recuperação de senha)

Edite o arquivo `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@seudominio.com
```

**Para Gmail:**
1. Ative a verificação em 2 etapas
2. Gere uma "Senha de app" em: https://myaccount.google.com/apppasswords
3. Use essa senha no campo `SMTP_PASS`

Depois execute:

```bash
docker stack deploy -c docker-stack.yml restaurante
```

## Atualizar o sistema

Para atualizar após fazer mudanças:

```bash
git pull
./deploy.sh
```

## Troubleshooting

### Serviços não iniciam

```bash
docker service ps restaurante_backend --no-trunc
docker service ps restaurante_frontend --no-trunc
```

### Ver logs detalhados

```bash
docker service logs restaurante_backend --tail 100
```

### Resetar tudo

```bash
docker stack rm restaurante
docker volume rm restaurante_postgres_data
# Aguardar 10 segundos
./deploy.sh
```

### Traefik não gera certificados SSL

Verifique se:
1. Os domínios apontam para o IP do servidor
2. As portas 80 e 443 estão abertas
3. O Traefik está configurado corretamente

## URLs Importantes

- **Frontend**: `https://FRONTEND_DOMAIN`
- **Backend API**: `https://BACKEND_DOMAIN/api`
- **Health Check**: `https://BACKEND_DOMAIN/health`
- **Portainer**: Conforme sua configuração

## Próximos Passos

1. Criar categorias de produtos (Lanches, Bebidas, etc)
2. Cadastrar produtos com fotos
3. Configurar permissões dos usuários
4. Testar o sistema completo
5. Configurar backup automático do banco de dados

## Suporte

Para problemas ou dúvidas, consulte o README.md completo.

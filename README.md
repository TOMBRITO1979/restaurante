# Restaurante SaaS - Sistema Multitenant

Sistema SaaS completo para gestão de restaurantes e lanchonetes com arquitetura multitenant.

## Características

- Arquitetura Multitenant (cada empresa tem seu próprio schema no banco)
- Sistema de permissões granular
- Upload de imagens para AWS S3
- Recuperação de senha via email
- API RESTful com autenticação JWT
- Interface moderna e responsiva
- Docker Swarm com Traefik para SSL automático

## Estrutura de Usuários

- **Super Admin**: Gerencia empresas e pode ativar/desativar contas
- **Admin**: Gerencia sua empresa, cadastra usuários e define permissões
- **User**: Usa o sistema conforme permissões concedidas pelo Admin

## Tecnologias

### Backend
- Node.js + Express + TypeScript
- Prisma ORM com PostgreSQL
- JWT para autenticação
- AWS S3 para armazenamento de imagens
- Nodemailer para envio de emails

### Frontend
- React + TypeScript
- Vite
- React Router
- Zustand para state management
- React Hook Form + Zod para validação
- TailwindCSS (via classes inline)

### Infraestrutura
- Docker Swarm
- Traefik (reverse proxy com SSL automático)
- PostgreSQL
- Nginx (para servir o frontend)

## Configuração Inicial

### 1. Clonar o repositório

```bash
git clone https://github.com/TOMBRITO1979/restaurante.git
cd restaurante
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure suas variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Domains - ALTERE PARA SUAS URLs
FRONTEND_DOMAIN=app.seudominio.com
BACKEND_DOMAIN=api.seudominio.com
FRONTEND_URL=https://app.seudominio.com

# Database
POSTGRES_PASSWORD=sua-senha-segura

# JWT
JWT_SECRET=sua-chave-secreta-muito-segura

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=seu-access-key
AWS_SECRET_ACCESS_KEY=seu-secret-key
AWS_S3_BUCKET=seu-bucket

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@seudominio.com
```

### 3. Build das imagens Docker

```bash
# Backend
docker build -t tomautomations/restaurante-backend:latest ./backend

# Frontend (com variável de ambiente para API)
docker build \
  --build-arg VITE_API_URL=https://api.seudominio.com \
  -t tomautomations/restaurante-frontend:latest \
  ./frontend
```

### 4. Push para Docker Hub

```bash
docker login -u tomautomations
docker push tomautomations/restaurante-backend:latest
docker push tomautomations/restaurante-frontend:latest
```

### 5. Deploy no Docker Swarm

```bash
# Carregar variáveis de ambiente
export $(cat .env | xargs)

# Deploy da stack
docker stack deploy -c docker-stack.yml restaurante
```

## Desenvolvimento Local

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure o .env

# Gerar Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate dev

# Iniciar servidor
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Configure o .env com VITE_API_URL=http://localhost:3000

# Iniciar servidor de desenvolvimento
npm run dev
```

## Funcionalidades Implementadas

### Cadastro de Produtos

O sistema possui um módulo completo de cadastro de produtos com os seguintes campos:

- Nome do produto e nome de exibição
- Categoria
- Descrição
- Preço e custo de produção
- Upload de imagem (AWS S3)
- Disponibilidade
- SKU/Código interno
- Tempo de preparo estimado
- Controle de estoque
- Tags/palavras-chave
- Promoção/desconto
- Informações nutricionais e alérgenos
- Prioridade de exibição
- Horários específicos de disponibilidade
- Variações (tamanhos, tipos)
- Adicionais/complementos

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Solicitar recuperação de senha
- `POST /api/auth/reset-password` - Redefinir senha
- `GET /api/auth/me` - Dados do usuário logado

### Empresas (Super Admin)
- `GET /api/companies` - Listar empresas
- `POST /api/companies` - Criar empresa
- `PUT /api/companies/:id` - Atualizar empresa
- `DELETE /api/companies/:id` - Deletar empresa
- `PATCH /api/companies/:id/toggle-active` - Ativar/desativar empresa

### Usuários (Admin)
- `GET /api/users` - Listar usuários da empresa
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria
- `PUT /api/categories/:id` - Atualizar categoria
- `DELETE /api/categories/:id` - Deletar categoria

### Produtos
- `GET /api/products` - Listar produtos (com filtros)
- `GET /api/products/:id` - Buscar produto por ID
- `POST /api/products` - Criar produto (multipart/form-data)
- `PUT /api/products/:id` - Atualizar produto (multipart/form-data)
- `DELETE /api/products/:id` - Deletar produto

## Segurança

- Senhas hasheadas com bcrypt
- Autenticação JWT
- Rate limiting
- Helmet.js para headers de segurança
- CORS configurado
- Validação de dados com Zod
- Sanitização de inputs
- Multitenancy com isolamento de dados

## Monitoramento

### Verificar status dos serviços

```bash
docker service ls
docker service ps restaurante_backend
docker service ps restaurante_frontend
```

### Logs

```bash
docker service logs -f restaurante_backend
docker service logs -f restaurante_frontend
```

### Health checks

- Backend: `https://api.seudominio.com/health`
- Frontend: health check via nginx

## Backup

### Backup do banco de dados

```bash
docker exec $(docker ps -q -f name=restaurante_postgres) \
  pg_dump -U postgres restaurante > backup.sql
```

### Restaurar backup

```bash
cat backup.sql | docker exec -i $(docker ps -q -f name=restaurante_postgres) \
  psql -U postgres restaurante
```

## Troubleshooting

### Verificar redes Docker

```bash
docker network ls
docker network inspect network_public
```

### Recriar stack

```bash
docker stack rm restaurante
# Aguardar alguns segundos
docker stack deploy -c docker-stack.yml restaurante
```

## Próximos Passos

Após o deploy inicial, você pode:

1. Criar o primeiro Super Admin via API ou diretamente no banco
2. Criar empresas e administradores
3. Configurar categorias de produtos
4. Cadastrar produtos com imagens

## Licença

Proprietário

## Suporte

Para suporte, entre em contato com o desenvolvedor.

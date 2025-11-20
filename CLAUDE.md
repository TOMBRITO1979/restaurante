# CLAUDE.md

Este arquivo fornece orientação ao Claude Code ao trabalhar com o código deste repositório.

## Visão Geral do Projeto

Sistema SaaS multi-tenant de gestão para restaurantes com isolamento baseado em schemas PostgreSQL. Cada empresa possui seu próprio schema, garantindo separação completa de dados.

## Arquitetura Multi-Tenant

### Conceito: Isolamento por Schema

- **Schema público** (`schema=public`): Armazena tabelas `companies` e `users`
- **Schemas de tenant** (`tenant_xxxxx`): Cada empresa tem schema dedicado com produtos, categorias, pedidos, vendas, etc.

### Como Funciona

1. **Registro**: `createTenantSchema()` em `/backend/src/utils/database.ts` cria novo schema
2. **Autenticação**: JWT contém info do usuário; middleware define `req.tenantSchema`
3. **Queries**: Use `getTenantClient(schemaName)` para acesso ao schema do tenant
4. **SQL Raw**: Acesse tabelas via `"${tenantSchema}"."table_name"`

### Arquivos Chave

- `/backend/src/utils/database.ts` - Criação de schema e pool de clientes
- `/backend/src/middleware/auth.ts` - Define `req.tenantSchema`
- `/backend/src/types/index.ts` - Interface `AuthRequest`

## Comandos de Desenvolvimento

### Backend
```bash
cd backend
npm install                  # Instalar dependências
npx prisma generate         # Gerar Prisma client
npx prisma migrate dev      # Executar migrations
npm run dev                 # Servidor de desenvolvimento
npm run build              # Build para produção
```

### Frontend
```bash
cd frontend
npm install                # Instalar dependências
npm run dev               # Servidor de desenvolvimento
npm run build             # Build para produção
npm run lint             # Linting
```

## Docker Build & Deploy

### Build Frontend (IMPORTANTE)
O frontend **DEVE** ser construído com `VITE_API_URL` como argumento de build (Vite embute variáveis em tempo de build):

```bash
cd /root/restaurante/frontend
docker build --no-cache \
  --build-arg VITE_API_URL=https://api.chefwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
```

### Build Backend
```bash
cd /root/restaurante/backend
docker build --no-cache -t r.chatwell.pro/restaurante-backend:latest .
```

### Deploy Docker Swarm
```bash
# Backend
cd /root/restaurante/backend
docker build -t r.chatwell.pro/restaurante-backend:latest .
docker service update --image r.chatwell.pro/restaurante-backend:latest --force chefwell_backend

# Frontend
cd /root/restaurante/frontend
docker build --no-cache \
  --build-arg VITE_API_URL=https://api.chefwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
docker service update --image r.chatwell.pro/restaurante-frontend:latest --force chefwell_frontend

# Verificar status
docker service ps chefwell_backend --no-trunc
docker service ps chefwell_frontend --no-trunc

# Logs
docker service logs -f chefwell_backend
docker service logs -f chefwell_frontend
```

## Autenticação & Autorização

### Roles de Usuário

1. **SUPER_ADMIN**: Sem associação a empresa; gerencia todas as empresas
2. **ADMIN**: Pertence a uma empresa; gerencia usuários e permissões da empresa
3. **USER**: Pertence a uma empresa; permissões controladas via campo JSON `permissions`

### Sistema de Permissões

Estrutura JSON granular para controle de acesso:

```json
{
  "products": {"view": true, "edit": true, "delete": false},
  "categories": {"view": true, "edit": true, "delete": false},
  "sales": {"view": true, "edit": true, "delete": false},
  "reports": {"view": false},
  "expenses": {"view": false, "edit": false}
}
```

**Hierarquia:**
- SUPER_ADMIN: Acesso total ao sistema
- ADMIN: Acesso total à sua empresa
- USER: Requer permissões explícitas em `user.permissions[module][action]`

### Middleware
```typescript
router.post('/products', authenticate, checkPermission('products.edit'), ...);
```

## Operações de Banco de Dados

### Trabalhar com Dados de Tenant
```typescript
async listProducts(req: AuthRequest, res: Response) {
  const tenantSchema = req.tenantSchema!;
  const db = getTenantClient(tenantSchema);

  const products = await db.$queryRawUnsafe(`
    SELECT * FROM "${tenantSchema}"."products"
    WHERE "isAvailable" = true
  `);

  res.json(products);
}
```

### BigInt Serialization
PostgreSQL BIGINT retorna BigInt em JS - converta para Number antes de JSON:
```typescript
const results = await db.$queryRawUnsafe(`...`);
const converted = results.map(item => ({
  ...item,
  orderNumber: Number(item.orderNumber)
}));
```

## Funcionalidades Principais

### Sistema de Comandas/Tabs
- Controller: `/backend/src/controllers/TabsController.ts`
- Frontend: `/frontend/src/pages/Sales.tsx` (PDV) e `/frontend/src/pages/Orders.tsx`
- Fluxo: Criar/encontrar comanda → Adicionar pedidos → Marcar entregue → Fechar com pagamento

### Gestão de Produtos
Campos extensos incluindo variações, adicionais, info nutricional, promoções e horários de disponibilidade.

### Armazenamento Abstrato
Multi-provider (`/backend/src/utils/storage.ts`):
- **Local**: Desenvolvimento (`./uploads`)
- **AWS S3**: Produção cloud
- **MinIO**: S3-compatível self-hosted

```typescript
import { uploadFile, deleteFile } from '../utils/storage';
const fileUrl = await uploadFile(req.file.buffer, req.file.originalname);
```

### Relatórios (Admin)
- Controller: `/backend/src/controllers/ReportsController.ts`
- Tipos: Lucro, Receita, Tempo de Entrega, Consolidado
- Endpoints: `/api/reports/{profit,revenue,delivery-time,consolidated}`

### Despesas (Admin)
- Controllers: `ExpenseCategoriesController.ts`, `ExpensesController.ts`
- Serviço: `/backend/src/services/recurringExpensesService.ts`
- Cron: Diário às 6h para despesas recorrentes

## Frontend

- **State**: Zustand (`/frontend/src/stores/authStore.ts`)
- **Routing**: React Router v6 com `PrivateRoute`
- **Styling**: TailwindCSS inline
- **Forms**: React Hook Form + Zod
- **Notificações**: react-hot-toast
- **Ícones**: Lucide React

## Debugging

### Backend Logs
```bash
docker service logs -f chefwell_backend
docker service logs --tail 100 chefwell_backend | grep -i error
```

### Testar API
```bash
curl -k -X POST https://api.chefwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Acesso ao Banco
```bash
docker exec -it $(docker ps -q -f name=chefwell_postgres) psql -U postgres -d restaurante

# Listar schemas
\dn

# Trocar para schema de tenant
SET search_path TO tenant_xxxxx;

# Listar tabelas
\dt
```

### Reset de Senha Manual
```bash
# 1. Gerar hash bcrypt
docker exec $(docker ps -q -f name=chefwell_backend) node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"

# 2. Atualizar no banco (escape $ com \$)
docker exec $(docker ps -q -f name=chefwell_postgres) psql -U postgres -d restaurante \
  -c "UPDATE users SET password = '\$2a\$10\$...hash...', \"emailVerified\" = true WHERE email = 'user@example.com';"
```

## Integração Stripe

### Visão Geral
Pagamentos seguros com cartão de crédito/débito via Stripe.

### Fluxo
1. Click em "Pagar com Cartão" → Redirect `/checkout?tabId=xxx`
2. Backend cria Payment Intent
3. Cliente insere dados do cartão (Stripe Elements - PCI compliant)
4. Pagamento processado via Stripe
5. Webhook confirma sucesso → Backend fecha comanda
6. Registro salvo em `stripe_payments`

### Endpoints Backend
```typescript
GET  /api/payments/config           // Publishable key
POST /api/payments/create-intent    // Criar pagamento
GET  /api/payments/:id              // Status
POST /api/payments/:id/cancel       // Cancelar (Admin)
POST /api/payments/:id/refund       // Estornar (Admin)
POST /api/webhooks/stripe           // Webhook (verificado)
```

### Tabela Database
```sql
CREATE TABLE "tenant_xxx"."stripe_payments" (
  "id" TEXT PRIMARY KEY,
  "paymentIntentId" TEXT UNIQUE NOT NULL,
  "tabId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT DEFAULT 'brl',
  "status" TEXT NOT NULL,
  "metadata" JSONB,
  FOREIGN KEY ("tabId") REFERENCES "tenant_xxx"."tabs"("id")
);
```

### Variáveis de Ambiente (Backend)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=brl
```

### Cartões de Teste
- Sucesso: `4242 4242 4242 4242`
- Recusado: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

## Email System (SMTP)

### Configuração Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=appchefwell@gmail.com
SMTP_PASS=<gmail-app-password>
SMTP_FROM="ChefWell App <appchefwell@gmail.com>"
FRONTEND_URL=https://app.chefwell.pro
```

### Funcionalidades
- **Verificação de Email**: Obrigatória antes do primeiro login (24h de validade)
- **Recuperação de Senha**: Link com token (1h de validade)
- **Boas-vindas**: Email enviado para novos usuários

### Fluxos
**Verificação:**
1. Registro → `emailVerified = false`
2. Token UUID gerado e salvo
3. Email enviado com link
4. Usuário clica → `emailVerified = true`

**Recuperação:**
1. Request em `/login` → "Esqueci minha senha"
2. Token gerado (1h)
3. Email com link de reset
4. Usuário define nova senha

## URLs de Produção

- Frontend: https://app.chefwell.pro
- Backend: https://api.chefwell.pro

## Status Atual (v2.2.0)

### ✅ Funcionalidades
- Autenticação JWT com verificação de email
- Multi-tenant (schemas PostgreSQL)
- Gestão de produtos com descontos percentuais
- Sistema PDV com aplicação automática de descontos
- Comandas/Tabs
- Pagamentos (Dinheiro, Cartão, PIX, Stripe)
- **Integração Stripe** com customer tracking
- **Impressão de Recibos** (80mm térmico)
- Histórico de vendas com exportação PDF/CSV
- **Gestão de Despesas** com recorrência automática
- **Relatórios** (Lucro, Receita, Tempo de Entrega)
- Exportação PDF/CSV com filtros
- Configurações da empresa
- Sistema de permissões granular
- **UI Responsiva** (mobile/desktop)
- Storage multi-provider (Local/S3/MinIO)

### Histórico de Versões
- **v2.2.0** (Nov 15, 2025) - Stripe Customer + Layout Responsivo
- **v2.1.0** (Nov 13, 2025) - Impressão de Recibos
- **v2.0.0** (Nov 09, 2025) - Integração Stripe
- **v1.9.0** (Nov 03, 2025) - Fix Sistema de Descontos
- **v1.8.0** (Oct 31, 2025) - Exportação PDF/CSV

## Variáveis de Ambiente

### Backend (.env)
```bash
FRONTEND_DOMAIN=app.chefwell.pro
BACKEND_DOMAIN=api.chefwell.pro
FRONTEND_URL=https://app.chefwell.pro
DATABASE_URL=postgresql://postgres:<PASSWORD>@chefwell_postgres:5432/restaurante?schema=public
JWT_SECRET=<secret-key>

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=appchefwell@gmail.com
SMTP_PASS=<gmail-app-password>
SMTP_FROM="ChefWell App <appchefwell@gmail.com>"

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=brl

# Storage (escolher: local, s3, minio)
STORAGE_PROVIDER=local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

### Frontend (build-time)
```bash
VITE_API_URL=https://api.chefwell.pro
```

## Nginx Caching
- **Assets estáticos** (imagens, fontes): 1 ano
- **JS/CSS**: 10 minutos
- **index.html**: Sem cache

Config: `/root/restaurante/frontend/nginx.conf`

## Gotchas

1. Frontend env vars são embedadas no build - rebuild ao mudar `VITE_API_URL`
2. Tenant schemas criados uma vez no registro da empresa
3. Password hashing usa bcryptjs com formato `$2a$10`
4. BigInt deve ser convertido para Number antes de JSON
5. CORS: Backend aceita requests de `FRONTEND_URL`
6. Webhook Stripe usa `express.raw()` antes de `express.json()`

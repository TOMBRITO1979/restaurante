# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tenant SaaS restaurant management system** with schema-based tenant isolation. Each company gets its own PostgreSQL schema, ensuring complete data separation while sharing the same application infrastructure.

## Multi-Tenant Architecture

### Critical Concept: Schema-Based Isolation

The system uses **PostgreSQL schemas** (not separate databases) for multi-tenancy:

- **Public schema** (`schema=public`): Stores `companies` and `users` tables
- **Tenant schemas** (`tenant_xxxxx`): Each company has a dedicated schema with tables for products, categories, orders, tabs, sales, etc.

### How Tenant Isolation Works

1. **Company Registration**: When a company is created, `createTenantSchema()` in `/backend/src/utils/database.ts` creates a new PostgreSQL schema with all necessary tables
2. **Authentication**: JWT contains user info; middleware sets `req.tenantSchema` based on user's company
3. **Database Queries**: All tenant-specific queries use `getTenantClient(schemaName)` which returns a Prisma client connected to that schema
4. **Raw SQL**: Tenant tables are accessed via raw SQL with schema name interpolation: `"${tenantSchema}"."products"`

### Key Files for Multi-Tenancy

- `/backend/src/utils/database.ts`: Schema creation, tenant client pool
- `/backend/src/middleware/auth.ts`: Sets `req.tenantSchema` on authenticated requests
- `/backend/src/types/index.ts`: `AuthRequest` interface includes `tenantSchema`

## Development Commands

### Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client (after schema changes)
npx prisma generate

# Run migrations (public schema only - tenant schemas created at runtime)
npx prisma migrate dev

# Development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production (requires VITE_API_URL)
npm run build

# Preview production build
npm preview

# Lint
npm run lint
```

## Docker Build & Deploy

### Important: Frontend Environment Variables

The frontend **must** be built with `VITE_API_URL` as a build argument because Vite embeds environment variables at build time:

```bash
# Build with embedded API URL (using --build-arg)
cd /root/restaurante/frontend
docker build --no-cache \
  --build-arg VITE_API_URL=https://rapi.chatwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
```

### Backend Build

```bash
cd /root/restaurante/backend
docker build --no-cache -t r.chatwell.pro/restaurante-backend:latest .
```

### Deploy to Docker Swarm

**Note:** The Docker registry at `r.chatwell.pro` does not accept push operations (returns 405 Not Allowed). Deploy using local images directly:

```bash
# Backend - Build and update
cd /root/restaurante/backend
docker build -t r.chatwell.pro/restaurante-backend:latest .
docker service update --image r.chatwell.pro/restaurante-backend:latest --force restaurante_backend

# Frontend - Build with API URL and update
cd /root/restaurante/frontend
docker build --no-cache \
  --build-arg VITE_API_URL=https://rapi.chatwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
docker service update --image r.chatwell.pro/restaurante-frontend:latest --force restaurante_frontend

# Check service status
docker service ps restaurante_backend --no-trunc
docker service ps restaurante_frontend --no-trunc

# View logs
docker service logs -f restaurante_backend
docker service logs -f restaurante_frontend
```

## Authentication & Authorization

### Three User Roles

1. **SUPER_ADMIN**: No company association; manages all companies; can activate/deactivate companies
2. **ADMIN**: Belongs to a company; manages users and permissions within their company
3. **USER**: Belongs to a company; permissions controlled via `permissions` JSON field

### Permission System

- Admins can grant granular permissions to users via `permissions` JSON field
- Permissions checked with `checkPermission()` middleware: `checkPermission('products.create')`
- Common permissions: `products.{create,edit,delete}`, `categories.{create,edit,delete}`, `sales.{create,edit}`

### Middleware Chain

```typescript
// Public route
router.post('/auth/login', authController.login);

// Requires authentication
router.get('/auth/me', authenticate, authController.me);

// Requires specific role
router.get('/companies', authenticate, requireRole('SUPER_ADMIN'), ...);

// Requires permission (for ADMIN/USER)
router.post('/products', authenticate, checkPermission('products.create'), ...);
```

## Database Operations

### Working with Tenant Data

Always use `getTenantClient()` for tenant-specific operations:

```typescript
async listProducts(req: AuthRequest, res: Response) {
  const tenantSchema = req.tenantSchema!; // Set by auth middleware
  const db = getTenantClient(tenantSchema);

  const products = await db.$queryRawUnsafe(`
    SELECT * FROM "${tenantSchema}"."products"
    WHERE "isAvailable" = true
  `);

  res.json(products);
}
```

### Creating New Tenant Tables

When adding new tenant-scoped features, update `createTenantSchema()` in `/backend/src/utils/database.ts`:

```typescript
await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "${schemaName}"."your_new_table" (
    "id" TEXT PRIMARY KEY,
    "field1" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
  )
`);
```

### BigInt Serialization

PostgreSQL `SERIAL` and `BIGSERIAL` return BigInt in JavaScript, which can't be JSON serialized. Convert to Number:

```typescript
const results = await db.$queryRawUnsafe(`...`);
const converted = results.map(item => ({
  ...item,
  orderNumber: Number(item.orderNumber) // Convert BigInt
}));
```

## Key Features

### Tabs/Comandas System (Restaurant Orders)

The system uses a **tab-based ordering system** where multiple orders accumulate for a single table or delivery:

- **Tabs Controller** (`/backend/src/controllers/TabsController.ts`): Manages tabs (comandas)
- **Flow**: Create/find tab → Add orders to tab → Mark orders delivered → Close tab with payment
- **Frontend**: `/frontend/src/pages/Sales.tsx` (PDV) and `/frontend/src/pages/Orders.tsx` (manage tabs)

**Key operations**:
- `POST /api/tabs`: Find existing or create new tab (by table number or phone)
- `POST /api/tabs/:tabId/orders`: Add order with items to existing tab
- `PATCH /api/tabs/orders/:orderId/delivered`: Mark individual order as delivered
- `POST /api/tabs/:tabId/close`: Close tab with payment method and discount

### Product Management

Products have extensive fields including variations, additions, nutritional info, promotions, and availability schedules. Image uploads go to AWS S3 via multipart/form-data.

### Expense Management System (Admin Only)

A comprehensive expense tracking system with recurring expense automation:

- **Expense Categories Controller** (`/backend/src/controllers/ExpenseCategoriesController.ts`): CRUD for expense categories
- **Expenses Controller** (`/backend/src/controllers/ExpensesController.ts`): Full expense management with statistics
- **Recurring Expenses Service** (`/backend/src/services/recurringExpensesService.ts`): Automated monthly expense creation
- **Cron Job** (`/backend/src/jobs/recurringExpensesCron.ts`): Runs daily at 6:00 AM to process recurring expenses
- **Frontend**: `/frontend/src/pages/Expenses.tsx` (Admin only)

**Database Tables** (in tenant schema):
- `expense_categories`: Categories with customizable colors (Insumos, Contas, Salários, etc.)
- `expenses`: Full expense tracking with recurring support

**Key Features**:
- Create expense categories with custom colors
- Track expenses with supplier, amount, payment method, notes
- Mark expenses as recurring (monthly, specific day of month)
- Automated expense generation via cron job
- Each generated expense is independent (deleting doesn't affect history)
- Statistics: total by category, by payment method, time-based filtering
- Permissions: Admin-only access via `requireRole('ADMIN')`

**API Endpoints**:
- `GET/POST/PUT/DELETE /api/expense-categories`
- `GET/POST/PUT/DELETE /api/expenses`
- `GET /api/expenses/stats` - Get expense statistics

**Recurring Expense Flow**:
1. Admin creates expense marked as "recurring" with day of month (1-31)
2. Cron job runs daily at 6:00 AM
3. On specified day, creates new expense from template
4. New expense has `recurringTemplateId` referencing original
5. Each expense is independent - can be edited/deleted without affecting others

## State Management (Frontend)

Uses **Zustand** for global state. Main store:

- `/frontend/src/stores/authStore.ts`: Authentication state, login/logout, user info

## API Client Configuration

Frontend uses Axios with base URL from environment:

```typescript
// /frontend/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

Token automatically attached via interceptor.

## Common Debugging Tasks

### Check Backend Logs

```bash
docker service logs -f restaurante_backend
docker service logs --tail 100 restaurante_backend | grep -i error
```

### Test API Endpoint

```bash
# Login
curl -k -X POST https://rapi.chatwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"admin123"}'

# Use token
TOKEN="your-jwt-token"
curl -k -X GET https://rapi.chatwell.pro/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it $(docker ps -q -f name=restaurante_postgres) \
  psql -U postgres -d restaurante

# List schemas
\dn

# Switch to tenant schema
SET search_path TO tenant_xxxxx;

# List tables in current schema
\dt
```

### Check Environment Variables in Running Container

```bash
docker exec $(docker ps -q -f name=restaurante_backend) env | grep VITE
docker exec $(docker ps -q -f name=restaurante_frontend) cat /usr/share/nginx/html/assets/*.js | grep -o 'https://[^"]*' | head -1
```

## Important Gotchas

1. **Frontend env vars**: Must rebuild frontend image when changing `VITE_API_URL` - it's embedded at build time
2. **Tenant schema creation**: Only happens once when company is created; existing companies need manual schema updates
3. **Password hashing**: Backend uses `bcryptjs` with `$2a$10` format
4. **Order table structure**: Has both old sales fields (subtotal, total, paymentMethod) and new tab fields (tabId) - needed for backward compatibility
5. **BigInt handling**: Convert to Number before JSON response to avoid serialization errors
6. **CORS**: Backend accepts requests from `FRONTEND_URL` environment variable

## Production URLs

Current deployment:
- Frontend: https://r.chatwell.pro
- Backend: https://rapi.chatwell.pro

Test credentials:
- Email: `teste@teste.com` | Password: `admin123` | Role: ADMIN
- Email: `wrbs.alt@gmail.com` | Role: ADMIN
- Email: `admin@chatwell.pro` | Role: SUPER_ADMIN

## Recent Changes (Oct 2025)

### Payment System - Discount/Tip as Percentages

The payment system was updated to use **percentages** instead of fixed values (R$):

**Database Changes:**
- Added `discountRate` (DECIMAL 5,2) - stores discount percentage (e.g., 10.00 for 10%)
- Added `discountAmount` (DECIMAL 10,2) - calculated from percentage
- Added `tipRate` (DECIMAL 5,2) - stores tip percentage
- Added `tipAmount` (DECIMAL 10,2) - calculated from percentage
- Existing `taxRate` already stored as percentage

**Calculation Logic in `TabsController.closeTab()`:**
```typescript
const subtotal = parseFloat(tab.total || '0');
const discountAmount = subtotal * (discountRate / 100);
const tipAmount = subtotal * (tipRate / 100);
const taxAmount = subtotal * (taxRate / 100);
const total = subtotal - discountAmount + tipAmount + taxAmount;
```

**Sales History:**
- All sales data preserved in `sales` table with both rates and calculated amounts
- Frontend displays percentage values with calculated amounts
- Located at: `/frontend/src/pages/SalesHistory.tsx`

### Bug Fixes Applied

#### 1. Login Page Reload Issue (FIXED ✅)
**Problem:** Login page reloaded when clicking "Entrar", preventing login

**Root Cause:** Axios interceptor in `/frontend/src/services/api.ts` was redirecting to `/login` on ANY 401 error, including failed login attempts (invalid credentials)

**Fix:** Modified interceptor to skip redirect for `/auth/login` and `/auth/register` routes:
```typescript
const isLoginRoute = error.config?.url?.includes('/auth/login');
const isRegisterRoute = error.config?.url?.includes('/auth/register');

if (error.response?.status === 401 && !isLoginRoute && !isRegisterRoute) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

#### 2. SQL GROUP BY Error in Tabs Listing (FIXED ✅)
**Problem:** "Erro ao carregar comandas" - PostgreSQL error: `column "o.createdAt" must appear in the GROUP BY clause`

**Root Cause:** `ORDER BY` clause was incorrectly moved **outside** of `json_agg()` function. PostgreSQL requires `ORDER BY` to be **inside** the aggregate function when used with `json_agg()`.

**Fix:** Corrected SQL query in `/backend/src/controllers/TabsController.ts:48` to use proper PostgreSQL syntax:
```sql
-- CORRECT: ORDER BY inside json_agg()
json_agg(json_build_object(...) ORDER BY o."createdAt" ASC)

-- INCORRECT: ORDER BY outside would cause GROUP BY error
json_agg(json_build_object(...))
FROM ... ORDER BY o."createdAt" ASC
```

### Docker Deployment Process

Since the Docker registry at `r.chatwell.pro` doesn't allow push (405 Not Allowed), use local images:

```bash
# Backend
cd /root/restaurante/backend
docker build -t r.chatwell.pro/restaurante-backend:latest .
docker service update --image r.chatwell.pro/restaurante-backend:latest --force restaurante_backend

# Frontend (MUST include VITE_API_URL at build time)
cd /root/restaurante/frontend
docker build --no-cache --build-arg VITE_API_URL=https://rapi.chatwell.pro \
  -t r.chatwell.pro/restaurante-frontend:latest .
docker service update --image r.chatwell.pro/restaurante-frontend:latest --force restaurante_frontend
```

## Current Status (Oct 30, 2025)

### ✅ Working Features
- User authentication and login
- JWT token management
- Multi-tenant schema isolation
- Product management
- Category management
- Sales/PDV system with percentage-based discounts/tips
- Sales history with detailed breakdown
- Payment processing (cash, credit, debit, PIX)
- Dashboard (user-specific views)
- User management
- **Orders/Tabs management** (comandas) - List and manage open tabs
- **Expense Management** (Admin only) - Track expenses with recurring automation

### ⚠️ Known Issues

**No known critical issues at this time.** All major features are working correctly.

For minor issues or future improvements, check GitHub issues at the project repository.

### Environment Variables

**Backend (.env):**
```
FRONTEND_DOMAIN=r.chatwell.pro
BACKEND_DOMAIN=rapi.chatwell.pro
FRONTEND_URL=https://r.chatwell.pro
POSTGRES_PASSWORD=postgres123
JWT_SECRET=jwt-secret-key-muito-segura-change-me
```

**Frontend (build-time):**
```
VITE_API_URL=https://rapi.chatwell.pro
```

### Nginx Caching Configuration

Frontend nginx configured for optimal caching without stale content:
- **Static assets** (images, fonts): 1 year cache
- **JS/CSS files**: 10 minutes cache
- **index.html**: No cache (always fetch fresh)

Located at: `/root/restaurante/frontend/nginx.conf`

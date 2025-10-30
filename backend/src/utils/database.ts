import { PrismaClient } from '@prisma/client';

// Cliente Prisma para o schema público (empresas e usuários)
export const prisma = new PrismaClient();

// Pool de conexões para schemas de tenants
const tenantClients: Map<string, PrismaClient> = new Map();

export const getTenantClient = (schemaName: string): PrismaClient => {
  if (!tenantClients.has(schemaName)) {
    const databaseUrl = process.env.DATABASE_URL?.replace('schema=public', `schema=${schemaName}`);
    const client = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    tenantClients.set(schemaName, client);
  }
  return tenantClients.get(schemaName)!;
};

export const createTenantSchema = async (schemaName: string): Promise<void> => {
  // Criar schema no PostgreSQL
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  // Criar tabelas do tenant
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."categories" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "priority" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."products" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "displayName" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "description" TEXT,
      "price" DECIMAL(10,2) NOT NULL,
      "imageUrl" TEXT,
      "isAvailable" BOOLEAN DEFAULT true,
      "sku" TEXT UNIQUE,
      "prepTime" INTEGER,
      "cost" DECIMAL(10,2),
      "stock" INTEGER,
      "tags" TEXT[],
      "hasPromotion" BOOLEAN DEFAULT false,
      "promotionDiscount" DECIMAL(5,2),
      "nutritionalInfo" TEXT,
      "allergens" TEXT,
      "priority" INTEGER DEFAULT 0,
      "availableSchedule" JSONB,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "${schemaName}"."categories"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."product_variations" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "priceAdjust" DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY ("productId") REFERENCES "${schemaName}"."products"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."product_additions" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "price" DECIMAL(10,2) NOT NULL,
      FOREIGN KEY ("productId") REFERENCES "${schemaName}"."products"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."tabs" (
      "id" TEXT PRIMARY KEY,
      "tableNumber" TEXT,
      "deliveryType" TEXT DEFAULT 'dine_in',
      "customerName" TEXT,
      "customerPhone" TEXT,
      "status" TEXT DEFAULT 'open',
      "total" DECIMAL(10,2) DEFAULT 0,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "closedAt" TIMESTAMP(3),
      "paymentMethod" TEXT,
      "discount" DECIMAL(10,2) DEFAULT 0
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."orders" (
      "id" TEXT PRIMARY KEY,
      "tabId" TEXT,
      "orderNumber" SERIAL,
      "status" TEXT DEFAULT 'pending',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tabId") REFERENCES "${schemaName}"."tabs"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."order_items" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitPrice" DECIMAL(10,2) NOT NULL,
      "totalPrice" DECIMAL(10,2) NOT NULL,
      "notes" TEXT,
      FOREIGN KEY ("orderId") REFERENCES "${schemaName}"."orders"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "${schemaName}"."products"("id") ON DELETE RESTRICT
    )
  `);

  // Tabela de vendas fechadas
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."sales" (
      "id" TEXT PRIMARY KEY,
      "saleNumber" SERIAL,
      "tabId" TEXT,
      "tableNumber" TEXT,
      "deliveryType" TEXT,
      "customerName" TEXT,
      "customerPhone" TEXT,
      "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "discountRate" DECIMAL(5,2) DEFAULT 0,
      "discountAmount" DECIMAL(10,2) DEFAULT 0,
      "tipRate" DECIMAL(5,2) DEFAULT 0,
      "tipAmount" DECIMAL(10,2) DEFAULT 0,
      "taxRate" DECIMAL(5,2) DEFAULT 0,
      "taxAmount" DECIMAL(10,2) DEFAULT 0,
      "total" DECIMAL(10,2) NOT NULL,
      "amountPaid" DECIMAL(10,2) DEFAULT 0,
      "changeAmount" DECIMAL(10,2) DEFAULT 0,
      "paymentMethod" TEXT NOT NULL,
      "items" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "closedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_sales_created_at" ON "${schemaName}"."sales"("createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_sales_payment_method" ON "${schemaName}"."sales"("paymentMethod")`);

  // Tabela de categorias de despesas
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."expense_categories" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "color" TEXT DEFAULT '#6B7280',
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de despesas
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."expenses" (
      "id" TEXT PRIMARY KEY,
      "categoryId" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "supplier" TEXT,
      "isRecurring" BOOLEAN DEFAULT false,
      "recurringDayOfMonth" INTEGER,
      "recurringTemplateId" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "${schemaName}"."expense_categories"("id") ON DELETE RESTRICT,
      FOREIGN KEY ("recurringTemplateId") REFERENCES "${schemaName}"."expenses"("id") ON DELETE SET NULL
    )
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_date" ON "${schemaName}"."expenses"("date")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_category" ON "${schemaName}"."expenses"("categoryId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_recurring" ON "${schemaName}"."expenses"("isRecurring")`);
};

export const deleteTenantSchema = async (schemaName: string): Promise<void> => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  tenantClients.delete(schemaName);
};

export const disconnectAll = async (): Promise<void> => {
  await prisma.$disconnect();
  for (const client of tenantClients.values()) {
    await client.$disconnect();
  }
  tenantClients.clear();
};

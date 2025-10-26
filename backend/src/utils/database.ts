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

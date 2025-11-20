const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createTenantSchema = async (schemaName) => {
  console.log(`Creating schema: ${schemaName}`);

  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

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
      "sku" TEXT,
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
      "discountRate" DECIMAL(5,2) DEFAULT 0,
      "discountAmount" DECIMAL(10,2) DEFAULT 0,
      "tipRate" DECIMAL(5,2) DEFAULT 0,
      "tipAmount" DECIMAL(10,2) DEFAULT 0,
      "taxRate" DECIMAL(5,2) DEFAULT 0,
      "taxAmount" DECIMAL(10,2) DEFAULT 0
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."orders" (
      "id" TEXT PRIMARY KEY,
      "tabId" TEXT NOT NULL,
      "items" JSONB NOT NULL,
      "subtotal" DECIMAL(10,2) NOT NULL,
      "status" TEXT DEFAULT 'pending',
      "notes" TEXT,
      "deliveredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tabId") REFERENCES "${schemaName}"."tabs"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."sales" (
      "id" TEXT PRIMARY KEY,
      "tabId" TEXT NOT NULL,
      "orderNumber" SERIAL,
      "customerName" TEXT,
      "customerPhone" TEXT,
      "deliveryType" TEXT NOT NULL,
      "tableNumber" TEXT,
      "items" JSONB NOT NULL,
      "subtotal" DECIMAL(10,2) NOT NULL,
      "taxRate" DECIMAL(5,2) DEFAULT 0,
      "taxAmount" DECIMAL(10,2) DEFAULT 0,
      "discountRate" DECIMAL(5,2) DEFAULT 0,
      "discountAmount" DECIMAL(10,2) DEFAULT 0,
      "tipRate" DECIMAL(5,2) DEFAULT 0,
      "tipAmount" DECIMAL(10,2) DEFAULT 0,
      "total" DECIMAL(10,2) NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "closedAt" TIMESTAMP(3),
      FOREIGN KEY ("tabId") REFERENCES "${schemaName}"."tabs"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."expense_categories" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "color" TEXT DEFAULT '#3B82F6',
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."expenses" (
      "id" TEXT PRIMARY KEY,
      "categoryId" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "supplier" TEXT,
      "paymentMethod" TEXT,
      "notes" TEXT,
      "isRecurring" BOOLEAN DEFAULT false,
      "recurringDay" INTEGER,
      "recurringTemplateId" TEXT,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "${schemaName}"."expense_categories"("id") ON DELETE CASCADE
    )
  `);

  console.log(`Schema ${schemaName} created successfully!`);
};

const main = async () => {
  const schemas = [
    'tenant_sabor_arte',
    'tenant_bella_napoli',
    'tenant_top_burger',
    'tenant_sushi_house',
    'tenant_churrascaria_gaucha'
  ];

  for (const schema of schemas) {
    await createTenantSchema(schema);
  }

  console.log('All tenant schemas created successfully!');
  await prisma.$disconnect();
};

main().catch((error) => {
  console.error('Error creating tenant schemas:', error);
  process.exit(1);
});

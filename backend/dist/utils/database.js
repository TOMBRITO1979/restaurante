"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectAll = exports.deleteTenantSchema = exports.createTenantSchema = exports.getTenantClient = exports.prisma = void 0;
exports.validateSchemaName = validateSchemaName;
const client_1 = require("@prisma/client");
// Cliente Prisma para o schema público (empresas e usuários)
exports.prisma = new client_1.PrismaClient();
// Pool de conexões para schemas de tenants
const tenantClients = new Map();
// ✅ SECURITY: Validação de schema name para prevenir SQL Injection
const SCHEMA_NAME_REGEX = /^tenant_[a-z0-9_]+$/;
const MAX_SCHEMA_NAME_LENGTH = 63; // Limite do PostgreSQL
function validateSchemaName(schemaName) {
    // Verificar se schema name é uma string
    if (typeof schemaName !== 'string') {
        throw new Error('Schema name deve ser uma string');
    }
    // Verificar comprimento
    if (schemaName.length === 0) {
        throw new Error('Schema name não pode ser vazio');
    }
    if (schemaName.length > MAX_SCHEMA_NAME_LENGTH) {
        throw new Error(`Schema name muito longo (máximo ${MAX_SCHEMA_NAME_LENGTH} caracteres)`);
    }
    // Verificar formato: deve começar com tenant_ e conter apenas a-z, 0-9, _
    if (!SCHEMA_NAME_REGEX.test(schemaName)) {
        throw new Error('Schema name inválido. Deve começar com "tenant_" e conter apenas letras minúsculas, números e underscores');
    }
    // Prevenir nomes reservados do PostgreSQL
    const reservedNames = ['public', 'pg_catalog', 'information_schema', 'pg_toast'];
    if (reservedNames.includes(schemaName.toLowerCase())) {
        throw new Error('Schema name é reservado pelo PostgreSQL');
    }
}
const getTenantClient = (schemaName) => {
    // ✅ SECURITY: Validar schema name antes de usar
    validateSchemaName(schemaName);
    if (!tenantClients.has(schemaName)) {
        const databaseUrl = process.env.DATABASE_URL?.replace('schema=public', `schema=${schemaName}`);
        const client = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
        });
        tenantClients.set(schemaName, client);
    }
    return tenantClients.get(schemaName);
};
exports.getTenantClient = getTenantClient;
const createTenantSchema = async (schemaName) => {
    // ✅ SECURITY: Validar schema name antes de criar
    validateSchemaName(schemaName);
    // Criar schema no PostgreSQL
    await exports.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    // Criar tabelas do tenant
    await exports.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."categories" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "priority" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await exports.prisma.$executeRawUnsafe(`
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
    await exports.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."product_variations" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "priceAdjust" DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY ("productId") REFERENCES "${schemaName}"."products"("id") ON DELETE CASCADE
    )
  `);
    await exports.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."product_additions" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "price" DECIMAL(10,2) NOT NULL,
      FOREIGN KEY ("productId") REFERENCES "${schemaName}"."products"("id") ON DELETE CASCADE
    )
  `);
    await exports.prisma.$executeRawUnsafe(`
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
    await exports.prisma.$executeRawUnsafe(`
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
    await exports.prisma.$executeRawUnsafe(`
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
    await exports.prisma.$executeRawUnsafe(`
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
      "stripePaymentId" TEXT,
      "items" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "closedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_sales_created_at" ON "${schemaName}"."sales"("createdAt")`);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_sales_payment_method" ON "${schemaName}"."sales"("paymentMethod")`);
    // Tabela de categorias de despesas
    await exports.prisma.$executeRawUnsafe(`
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
    await exports.prisma.$executeRawUnsafe(`
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
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_date" ON "${schemaName}"."expenses"("date")`);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_category" ON "${schemaName}"."expenses"("categoryId")`);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_recurring" ON "${schemaName}"."expenses"("isRecurring")`);
    // Tabela de pagamentos Stripe
    await exports.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."stripe_payments" (
      "id" TEXT PRIMARY KEY,
      "paymentIntentId" TEXT UNIQUE NOT NULL,
      "tabId" TEXT,
      "orderId" TEXT,
      "amount" DECIMAL(10,2) NOT NULL,
      "currency" TEXT DEFAULT 'brl',
      "status" TEXT NOT NULL,
      "paymentMethod" TEXT,
      "metadata" JSONB,
      "stripeResponse" JSONB,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("tabId") REFERENCES "${schemaName}"."tabs"("id") ON DELETE SET NULL
    )
  `);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_intent" ON "${schemaName}"."stripe_payments"("paymentIntentId")`);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_tab" ON "${schemaName}"."stripe_payments"("tabId")`);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_status" ON "${schemaName}"."stripe_payments"("status")`);
    await exports.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_created" ON "${schemaName}"."stripe_payments"("createdAt")`);
    // Tabela de configurações da empresa
    await exports.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."company_settings" (
      "id" TEXT PRIMARY KEY DEFAULT 'default',
      "companyName" TEXT NOT NULL DEFAULT 'Minha Empresa',
      "address" TEXT,
      "city" TEXT,
      "state" TEXT,
      "zipCode" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "website" TEXT,
      "cnpj" TEXT,
      "logo" TEXT,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Inserir configuração padrão se não existir
    await exports.prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}"."company_settings" ("id", "companyName")
    VALUES ('default', 'Minha Empresa')
    ON CONFLICT ("id") DO NOTHING
  `);
    // Criar tabela de clientes (customers)
    await exports.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."customers" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "street" TEXT,
      "number" TEXT,
      "complement" TEXT,
      "neighborhood" TEXT,
      "city" TEXT,
      "state" TEXT,
      "zipCode" TEXT,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Criar índices para busca de clientes
    await exports.prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_customers_name"
    ON "${schemaName}"."customers" ("name")
  `);
    await exports.prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_customers_email"
    ON "${schemaName}"."customers" ("email")
  `);
    await exports.prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_customers_phone"
    ON "${schemaName}"."customers" ("phone")
  `);
    await exports.prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_customers_city"
    ON "${schemaName}"."customers" ("city")
  `);
};
exports.createTenantSchema = createTenantSchema;
const deleteTenantSchema = async (schemaName) => {
    // ✅ SECURITY: Validar schema name antes de deletar
    validateSchemaName(schemaName);
    await exports.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    tenantClients.delete(schemaName);
};
exports.deleteTenantSchema = deleteTenantSchema;
const disconnectAll = async () => {
    await exports.prisma.$disconnect();
    for (const client of tenantClients.values()) {
        await client.$disconnect();
    }
    tenantClients.clear();
};
exports.disconnectAll = disconnectAll;
//# sourceMappingURL=database.js.map
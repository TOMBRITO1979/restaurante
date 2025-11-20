"use strict";
/**
 * Script de migração para adicionar tabelas de despesas em schemas de tenants existentes
 *
 * Este script adiciona as tabelas expense_categories e expenses em todos os schemas
 * de empresas que já existem no sistema.
 *
 * Execute com: npx tsx src/migrations/addExpensesTables.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = require("../utils/database");
async function addExpensesTablesToTenant(schemaName) {
    const db = (0, database_1.getTenantClient)(schemaName);
    console.log(`[Migration] Adicionando tabelas de despesas no schema: ${schemaName}`);
    try {
        // Tabela de categorias de despesas
        await db.$executeRawUnsafe(`
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
        await db.$executeRawUnsafe(`
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
        // Índices
        await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_date" ON "${schemaName}"."expenses"("date")`);
        await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_category" ON "${schemaName}"."expenses"("categoryId")`);
        await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_expenses_recurring" ON "${schemaName}"."expenses"("isRecurring")`);
        console.log(`[Migration] ✓ Tabelas adicionadas com sucesso no schema: ${schemaName}`);
    }
    catch (error) {
        console.error(`[Migration] ✗ Erro ao adicionar tabelas no schema ${schemaName}:`, error);
        throw error;
    }
}
async function main() {
    try {
        console.log('[Migration] Iniciando migração de despesas...\n');
        // Buscar todas as empresas ativas
        const companies = await database_1.prisma.company.findMany({
            where: { isActive: true },
            select: { id: true, name: true, schemaName: true },
        });
        console.log(`[Migration] Encontradas ${companies.length} empresas ativas\n`);
        for (const company of companies) {
            try {
                await addExpensesTablesToTenant(company.schemaName);
            }
            catch (error) {
                console.error(`[Migration] Erro ao processar empresa ${company.name}:`, error);
                // Continuar com as outras empresas
            }
        }
        console.log('\n[Migration] Migração concluída com sucesso!');
    }
    catch (error) {
        console.error('[Migration] Erro fatal na migração:', error);
        process.exit(1);
    }
    finally {
        await database_1.prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=addExpensesTables.js.map
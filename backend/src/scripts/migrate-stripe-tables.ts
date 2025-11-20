/**
 * Migration Script: Add Stripe Payment Tables to Existing Tenant Schemas
 *
 * This script adds the stripe_payments table and stripePaymentId column
 * to all existing tenant schemas in the database.
 *
 * Usage: npx tsx src/scripts/migrate-stripe-tables.ts
 */

import { prisma } from '../utils/database';
import dotenv from 'dotenv';

dotenv.config();

async function migrateStripeTables() {
  try {
    console.log('🚀 Starting Stripe tables migration...\n');

    // Get all tenant schemas
    const schemasResult: any[] = await prisma.$queryRawUnsafe(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `);

    if (schemasResult.length === 0) {
      console.log('ℹ️  No tenant schemas found. Migration not needed.');
      return;
    }

    console.log(`Found ${schemasResult.length} tenant schema(s) to migrate:\n`);

    for (const row of schemasResult) {
      const schemaName = row.schema_name;
      console.log(`📦 Migrating schema: ${schemaName}`);

      try {
        // Add stripe_payments table
        await prisma.$executeRawUnsafe(`
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

        // Add indexes
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_intent" ON "${schemaName}"."stripe_payments"("paymentIntentId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_tab" ON "${schemaName}"."stripe_payments"("tabId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_status" ON "${schemaName}"."stripe_payments"("status")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stripe_payments_created" ON "${schemaName}"."stripe_payments"("createdAt")`);

        console.log(`   ✅ Created stripe_payments table`);

        // Add stripePaymentId column to sales table (if not exists)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${schemaName}"."sales"
          ADD COLUMN IF NOT EXISTS "stripePaymentId" TEXT
        `);

        console.log(`   ✅ Added stripePaymentId column to sales table`);
        console.log(`   ✅ Schema ${schemaName} migrated successfully\n`);
      } catch (error: any) {
        console.error(`   ❌ Error migrating ${schemaName}:`, error.message);
        console.log('   Continuing with next schema...\n');
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateStripeTables();

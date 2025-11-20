"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const slugify_1 = __importDefault(require("slugify"));
const prisma = new client_1.PrismaClient();
/**
 * Generate unique s3Folder name for a company
 * Format: {company-slug}-{4-random-digits}
 */
function generateS3Folder(companyName) {
    const slug = (0, slugify_1.default)(companyName, { lower: true, strict: true });
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    return `${slug}-${randomDigits}`;
}
/**
 * Ensure s3Folder is unique across all companies
 */
async function ensureUniqueS3Folder(companyName) {
    let attempt = 0;
    const maxAttempts = 10;
    while (attempt < maxAttempts) {
        const s3Folder = generateS3Folder(companyName);
        // Check if this folder already exists
        const existing = await prisma.$queryRawUnsafe(`
      SELECT id FROM "public"."companies" WHERE "s3Folder" = $1
    `, s3Folder);
        if (!existing || existing.length === 0) {
            return s3Folder;
        }
        attempt++;
    }
    throw new Error(`Failed to generate unique s3Folder for company: ${companyName}`);
}
async function addS3FolderColumn() {
    try {
        console.log('🚀 Starting S3 Folder Migration...\n');
        // Step 1: Add column if not exists
        console.log('📝 Step 1: Adding s3Folder column to companies table...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."companies"
      ADD COLUMN IF NOT EXISTS "s3Folder" TEXT UNIQUE;
    `);
        console.log('✅ Column added successfully!\n');
        // Step 2: Create index if not exists
        console.log('📝 Step 2: Creating index on s3Folder...');
        await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_companies_s3_folder
      ON "public"."companies"("s3Folder");
    `);
        console.log('✅ Index created successfully!\n');
        // Step 3: Generate s3Folder for existing companies
        console.log('📝 Step 3: Generating s3Folder for existing companies...\n');
        const companies = await prisma.$queryRawUnsafe(`
      SELECT id, name, "s3Folder"
      FROM "public"."companies"
      WHERE "s3Folder" IS NULL OR "s3Folder" = ''
    `);
        if (companies.length === 0) {
            console.log('ℹ️  All companies already have s3Folder assigned.');
            console.log('✅ Migration completed!\n');
            return;
        }
        console.log(`Found ${companies.length} companies without s3Folder:\n`);
        for (const company of companies) {
            try {
                const s3Folder = await ensureUniqueS3Folder(company.name);
                await prisma.$executeRawUnsafe(`
          UPDATE "public"."companies"
          SET "s3Folder" = $1
          WHERE id = $2
        `, s3Folder, company.id);
                console.log(`✅ Company: ${company.name}`);
                console.log(`   s3Folder: ${s3Folder}\n`);
            }
            catch (error) {
                console.error(`❌ Error processing company ${company.name}:`, error);
            }
        }
        console.log('\n✅ Migration completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   Total companies processed: ${companies.length}`);
        console.log(`   All companies now have unique s3Folder values\n`);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run migration
addS3FolderColumn()
    .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=add-s3-folder-to-companies.js.map
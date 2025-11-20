"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function addCustomerFields() {
    try {
        console.log('🔄 Iniciando migração: Adicionando campos tag e birthDate aos clientes...\n');
        // Buscar todos os schemas de tenants
        const tenants = await prisma.$queryRaw `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `;
        console.log(`📊 Encontrados ${tenants.length} schemas de tenants\n`);
        for (const tenant of tenants) {
            const schemaName = tenant.schema_name;
            try {
                console.log(`⏳ Processando ${schemaName}...`);
                // Verificar se a coluna 'tag' já existe
                const tagColumnExists = await prisma.$queryRawUnsafe(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = $1
          AND table_name = 'customers'
          AND column_name = 'tag'
        `, schemaName);
                // Verificar se a coluna 'birthDate' já existe
                const birthDateColumnExists = await prisma.$queryRawUnsafe(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = $1
          AND table_name = 'customers'
          AND column_name = 'birthDate'
        `, schemaName);
                // Adicionar coluna 'tag' se não existir
                if (tagColumnExists.length === 0) {
                    await prisma.$executeRawUnsafe(`
            ALTER TABLE "${schemaName}"."customers"
            ADD COLUMN "tag" TEXT
          `);
                    console.log(`  ✅ Coluna 'tag' adicionada`);
                }
                else {
                    console.log(`  ⏭️  Coluna 'tag' já existe`);
                }
                // Adicionar coluna 'birthDate' se não existir
                if (birthDateColumnExists.length === 0) {
                    await prisma.$executeRawUnsafe(`
            ALTER TABLE "${schemaName}"."customers"
            ADD COLUMN "birthDate" DATE
          `);
                    console.log(`  ✅ Coluna 'birthDate' adicionada`);
                }
                else {
                    console.log(`  ⏭️  Coluna 'birthDate' já existe`);
                }
                console.log(`✅ ${schemaName} concluído\n`);
            }
            catch (error) {
                console.error(`❌ Erro ao processar ${schemaName}:`, error);
            }
        }
        console.log('✅ Migração concluída com sucesso!');
        console.log('📝 Os seguintes campos foram adicionados à tabela customers:');
        console.log('   - tag: TEXT (opcional) - Para marcar/categorizar clientes');
        console.log('   - birthDate: DATE (opcional) - Data de nascimento do cliente');
    }
    catch (error) {
        console.error('❌ Erro durante a migração:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
addCustomerFields()
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=add-customer-fields.js.map
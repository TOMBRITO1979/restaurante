"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const database_1 = require("../utils/database");
class SettingsController {
    // Obter configurações da empresa
    async get(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const settings = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."company_settings"
        WHERE "id" = 'default'
        LIMIT 1
      `);
            if (settings.length === 0) {
                // Criar configuração padrão se não existir
                await db.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}"."company_settings" ("id", "companyName")
          VALUES ('default', 'Minha Empresa')
          ON CONFLICT ("id") DO NOTHING
        `);
                const newSettings = await db.$queryRawUnsafe(`
          SELECT * FROM "${tenantSchema}"."company_settings"
          WHERE "id" = 'default'
          LIMIT 1
        `);
                res.json(newSettings[0]);
                return;
            }
            res.json(settings[0]);
        }
        catch (error) {
            console.error('Erro ao buscar configurações:', error);
            res.status(500).json({ error: 'Erro ao buscar configurações' });
        }
    }
    // Atualizar configurações da empresa
    async update(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { companyName, address, city, state, zipCode, phone, email, website, cnpj, logo, } = req.body;
            if (!companyName) {
                res.status(400).json({ error: 'Nome da empresa é obrigatório' });
                return;
            }
            const now = new Date();
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."company_settings"
        SET
          "companyName" = $1,
          "address" = $2,
          "city" = $3,
          "state" = $4,
          "zipCode" = $5,
          "phone" = $6,
          "email" = $7,
          "website" = $8,
          "cnpj" = $9,
          "logo" = $10,
          "updatedAt" = $11
        WHERE "id" = 'default'
      `, companyName, address || null, city || null, state || null, zipCode || null, phone || null, email || null, website || null, cnpj || null, logo || null, now);
            const settings = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."company_settings"
        WHERE "id" = 'default'
        LIMIT 1
      `);
            res.json(settings[0]);
        }
        catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            res.status(500).json({ error: 'Erro ao atualizar configurações' });
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=SettingsController.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseCategoriesController = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../utils/database");
class ExpenseCategoriesController {
    // Listar categorias de despesas
    async list(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const categories = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."expense_categories"
        ORDER BY "name" ASC
      `);
            res.json(categories);
        }
        catch (error) {
            console.error('Erro ao listar categorias de despesas:', error);
            res.status(500).json({ error: 'Erro ao listar categorias de despesas' });
        }
    }
    // Criar categoria
    async create(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { name, description, color } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Nome é obrigatório' });
                return;
            }
            const id = (0, uuid_1.v4)();
            const now = new Date();
            await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."expense_categories"
        ("id", "name", "description", "color", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, id, name, description || null, color || '#6B7280', now, now);
            const category = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."expense_categories"
        WHERE "id" = $1
      `, id);
            res.status(201).json(category[0]);
        }
        catch (error) {
            console.error('Erro ao criar categoria de despesa:', error);
            res.status(500).json({ error: 'Erro ao criar categoria de despesa' });
        }
    }
    // Atualizar categoria
    async update(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { id } = req.params;
            const { name, description, color } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Nome é obrigatório' });
                return;
            }
            const now = new Date();
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."expense_categories"
        SET "name" = $1, "description" = $2, "color" = $3, "updatedAt" = $4
        WHERE "id" = $5
      `, name, description || null, color || '#6B7280', now, id);
            const category = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."expense_categories"
        WHERE "id" = $1
      `, id);
            if (category.length === 0) {
                res.status(404).json({ error: 'Categoria não encontrada' });
                return;
            }
            res.json(category[0]);
        }
        catch (error) {
            console.error('Erro ao atualizar categoria de despesa:', error);
            res.status(500).json({ error: 'Erro ao atualizar categoria de despesa' });
        }
    }
    // Deletar categoria
    async delete(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { id } = req.params;
            // Verificar se existem despesas usando esta categoria
            const expenses = await db.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."expenses"
        WHERE "categoryId" = $1
      `, id);
            if (parseInt(expenses[0].count) > 0) {
                res.status(400).json({ error: 'Não é possível deletar categoria com despesas associadas' });
                return;
            }
            await db.$executeRawUnsafe(`
        DELETE FROM "${tenantSchema}"."expense_categories"
        WHERE "id" = $1
      `, id);
            res.status(204).send();
        }
        catch (error) {
            console.error('Erro ao deletar categoria de despesa:', error);
            res.status(500).json({ error: 'Erro ao deletar categoria de despesa' });
        }
    }
}
exports.ExpenseCategoriesController = ExpenseCategoriesController;
//# sourceMappingURL=ExpenseCategoriesController.js.map
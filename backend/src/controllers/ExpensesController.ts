import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';

export class ExpensesController {
  // Listar despesas com filtros
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, categoryId, supplier, isRecurring } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`e."date" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        whereConditions.push(`e."date" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      }

      if (categoryId) {
        whereConditions.push(`e."categoryId" = $${params.length + 1}`);
        params.push(categoryId);
      }

      if (supplier) {
        whereConditions.push(`e."supplier" ILIKE $${params.length + 1}`);
        params.push(`%${supplier}%`);
      }

      if (isRecurring !== undefined) {
        whereConditions.push(`e."isRecurring" = $${params.length + 1}`);
        params.push(isRecurring === 'true');
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const expenses = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        ${whereClause}
        ORDER BY e."date" DESC, e."createdAt" DESC
      `, ...params);

      // Converter BigInt para Number se necessário
      const converted = (expenses as any[]).map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));

      res.json(converted);
    } catch (error) {
      console.error('Erro ao listar despesas:', error);
      res.status(500).json({ error: 'Erro ao listar despesas' });
    }
  }

  // Buscar despesa por ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { id } = req.params;

      const expense = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        WHERE e."id" = $1
      `, id);

      if ((expense as any[]).length === 0) {
        res.status(404).json({ error: 'Despesa não encontrada' });
        return;
      }

      const converted = {
        ...(expense as any[])[0],
        amount: parseFloat((expense as any[])[0].amount),
      };

      res.json(converted);
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      res.status(500).json({ error: 'Erro ao buscar despesa' });
    }
  }

  // Criar despesa
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const {
        categoryId,
        description,
        amount,
        date,
        paymentMethod,
        supplier,
        isRecurring,
        recurringDayOfMonth,
        notes,
      } = req.body;

      if (!categoryId || !description || !amount || !date || !paymentMethod) {
        res.status(400).json({ error: 'Campos obrigatórios faltando' });
        return;
      }

      if (isRecurring && (!recurringDayOfMonth || recurringDayOfMonth < 1 || recurringDayOfMonth > 31)) {
        res.status(400).json({ error: 'Dia do mês para recorrência inválido (1-31)' });
        return;
      }

      const id = uuidv4();
      const now = new Date();

      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."expenses"
        ("id", "categoryId", "description", "amount", "date", "paymentMethod",
         "supplier", "isRecurring", "recurringDayOfMonth", "notes", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        id,
        categoryId,
        description,
        amount,
        new Date(date),
        paymentMethod,
        supplier || null,
        isRecurring || false,
        isRecurring ? recurringDayOfMonth : null,
        notes || null,
        now,
        now
      );

      const expense = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        WHERE e."id" = $1
      `, id);

      const converted = {
        ...(expense as any[])[0],
        amount: parseFloat((expense as any[])[0].amount),
      };

      res.status(201).json(converted);
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      res.status(500).json({ error: 'Erro ao criar despesa' });
    }
  }

  // Atualizar despesa
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { id } = req.params;

      const {
        categoryId,
        description,
        amount,
        date,
        paymentMethod,
        supplier,
        isRecurring,
        recurringDayOfMonth,
        notes,
      } = req.body;

      if (!categoryId || !description || !amount || !date || !paymentMethod) {
        res.status(400).json({ error: 'Campos obrigatórios faltando' });
        return;
      }

      if (isRecurring && (!recurringDayOfMonth || recurringDayOfMonth < 1 || recurringDayOfMonth > 31)) {
        res.status(400).json({ error: 'Dia do mês para recorrência inválido (1-31)' });
        return;
      }

      const now = new Date();

      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."expenses"
        SET
          "categoryId" = $1,
          "description" = $2,
          "amount" = $3,
          "date" = $4,
          "paymentMethod" = $5,
          "supplier" = $6,
          "isRecurring" = $7,
          "recurringDayOfMonth" = $8,
          "notes" = $9,
          "updatedAt" = $10
        WHERE "id" = $11
      `,
        categoryId,
        description,
        amount,
        new Date(date),
        paymentMethod,
        supplier || null,
        isRecurring || false,
        isRecurring ? recurringDayOfMonth : null,
        notes || null,
        now,
        id
      );

      const expense = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        WHERE e."id" = $1
      `, id);

      if ((expense as any[]).length === 0) {
        res.status(404).json({ error: 'Despesa não encontrada' });
        return;
      }

      const converted = {
        ...(expense as any[])[0],
        amount: parseFloat((expense as any[])[0].amount),
      };

      res.json(converted);
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      res.status(500).json({ error: 'Erro ao atualizar despesa' });
    }
  }

  // Deletar despesa
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { id } = req.params;

      await db.$executeRawUnsafe(`
        DELETE FROM "${tenantSchema}"."expenses"
        WHERE "id" = $1
      `, id);

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      res.status(500).json({ error: 'Erro ao deletar despesa' });
    }
  }

  // Obter estatísticas de despesas
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"date" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        whereConditions.push(`"date" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Total de despesas
      const totalResult = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM("amount"), 0) as total
        FROM "${tenantSchema}"."expenses"
        ${whereClause}
      `, ...params);

      // Despesas por categoria
      const byCategory = await db.$queryRawUnsafe(`
        SELECT
          c.id,
          c.name,
          c.color,
          COALESCE(SUM(e."amount"), 0) as total,
          COUNT(e.id) as count
        FROM "${tenantSchema}"."expense_categories" c
        LEFT JOIN "${tenantSchema}"."expenses" e ON c.id = e."categoryId"
          ${whereConditions.length > 0 ? `AND ${whereConditions.map((cond, i) => cond.replace(`$${i + 1}`, `$${i + 1}`)).join(' AND ')}` : ''}
        GROUP BY c.id, c.name, c.color
        ORDER BY total DESC
      `, ...params);

      // Despesas por método de pagamento
      const byPaymentMethod = await db.$queryRawUnsafe(`
        SELECT
          "paymentMethod",
          COALESCE(SUM("amount"), 0) as total,
          COUNT(id) as count
        FROM "${tenantSchema}"."expenses"
        ${whereClause}
        GROUP BY "paymentMethod"
        ORDER BY total DESC
      `, ...params);

      const stats = {
        total: parseFloat((totalResult as any[])[0].total),
        byCategory: (byCategory as any[]).map(item => ({
          ...item,
          total: parseFloat(item.total),
          count: parseInt(item.count),
        })),
        byPaymentMethod: (byPaymentMethod as any[]).map(item => ({
          ...item,
          total: parseFloat(item.total),
          count: parseInt(item.count),
        })),
      };

      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas de despesas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  }
}

import { Response } from 'express';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';

export class SalesController {
  // Listar histórico de vendas (da tabela sales)
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, paymentMethod, page = '1', limit = '50' } = req.query;

      const whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"createdAt" >= $${params.length + 1}`);
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`"createdAt" <= $${params.length + 1}`);
        params.push(endDate);
      }

      if (paymentMethod) {
        whereConditions.push(`"paymentMethod" = $${params.length + 1}`);
        params.push(paymentMethod);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const sales = await db.$queryRawUnsafe(`
        SELECT
          id,
          "saleNumber",
          "tabId",
          "tableNumber",
          "deliveryType",
          "customerName",
          "customerPhone",
          subtotal,
          "discountRate",
          "discountAmount",
          "tipRate",
          "tipAmount",
          "taxRate",
          "taxAmount",
          total,
          "amountPaid",
          "changeAmount",
          "paymentMethod",
          items,
          "createdAt",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        ORDER BY "closedAt" DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, ...params, parseInt(limit as string), offset);

      // Contar total de registros
      const countResult = await db.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
      `, ...params) as any[];

      const total = countResult[0]?.total || 0;

      // Converter BigInt para Number
      const salesConverted = (sales as any[]).map(sale => ({
        ...sale,
        saleNumber: Number(sale.saleNumber)
      }));

      res.json({
        sales: salesConverted,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Erro ao listar vendas:', error);
      res.status(500).json({ error: 'Erro ao listar vendas' });
    }
  }

  // Buscar venda por ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const sales = await db.$queryRawUnsafe(`
        SELECT
          id,
          "saleNumber",
          "tabId",
          "tableNumber",
          "deliveryType",
          "customerName",
          "customerPhone",
          subtotal,
          "discountRate",
          "discountAmount",
          "tipRate",
          "tipAmount",
          "taxRate",
          "taxAmount",
          total,
          "amountPaid",
          "changeAmount",
          "paymentMethod",
          items,
          "createdAt",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        WHERE id = $1
      `, id) as any[];

      if (!sales || sales.length === 0) {
        res.status(404).json({ error: 'Venda não encontrada' });
        return;
      }

      const sale = sales[0];
      sale.saleNumber = Number(sale.saleNumber);

      res.json(sale);
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      res.status(500).json({ error: 'Erro ao buscar venda' });
    }
  }

  // Obter estatísticas de vendas
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      const whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"closedAt" >= $${params.length + 1}`);
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`"closedAt" <= $${params.length + 1}`);
        params.push(endDate);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const stats = await db.$queryRawUnsafe(`
        SELECT
          COUNT(*)::int as "totalSales",
          COALESCE(SUM(total), 0)::decimal as "totalRevenue",
          COALESCE(AVG(total), 0)::decimal as "averageTicket",
          COALESCE(SUM(discount), 0)::decimal as "totalDiscounts"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
      `, ...params) as any[];

      // Vendas por forma de pagamento
      const paymentStats = await db.$queryRawUnsafe(`
        SELECT
          "paymentMethod",
          COUNT(*)::int as count,
          COALESCE(SUM(total), 0)::decimal as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        GROUP BY "paymentMethod"
        ORDER BY total DESC
      `, ...params);

      res.json({
        overall: stats[0],
        byPaymentMethod: paymentStats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

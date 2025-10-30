import { Response } from 'express';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';

export class ReportsController {
  /**
   * Relatório de Lucro
   * Calcula: Receitas (vendas) - Despesas = Lucro
   */
  async getProfitReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`$${params.length + 1}`);
        params.push(new Date(startDate as string));
      } else {
        // Default: início do mês atual
        const firstDay = new Date();
        firstDay.setDate(1);
        firstDay.setHours(0, 0, 0, 0);
        whereConditions.push(`$${params.length + 1}`);
        params.push(firstDay);
      }

      if (endDate) {
        whereConditions.push(`$${params.length + 1}`);
        params.push(new Date(endDate as string));
      } else {
        // Default: agora
        whereConditions.push(`$${params.length + 1}`);
        params.push(new Date());
      }

      // Total de receitas (vendas)
      const revenueResult = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM("total"), 0) as total_revenue
        FROM "${tenantSchema}"."sales"
        WHERE "closedAt" >= $1 AND "closedAt" <= $2
      `, ...params);

      // Total de despesas
      const expensesResult = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM("amount"), 0) as total_expenses
        FROM "${tenantSchema}"."expenses"
        WHERE "date" >= $1 AND "date" <= $2
      `, ...params);

      const revenue = parseFloat((revenueResult as any[])[0]?.total_revenue || 0);
      const expenses = parseFloat((expensesResult as any[])[0]?.total_expenses || 0);
      const profit = revenue - expenses;

      res.json({
        revenue,
        expenses,
        profit,
        profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de lucro:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório de lucro' });
    }
  }

  /**
   * Relatório de Receitas
   * Total faturado, subtotais por forma de pagamento, impostos, gorjetas
   */
  async getRevenueReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"closedAt" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      } else {
        const firstDay = new Date();
        firstDay.setDate(1);
        firstDay.setHours(0, 0, 0, 0);
        whereConditions.push(`"closedAt" >= $${params.length + 1}`);
        params.push(firstDay);
      }

      if (endDate) {
        whereConditions.push(`"closedAt" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      } else {
        whereConditions.push(`"closedAt" <= $${params.length + 1}`);
        params.push(new Date());
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Total geral
      const totalsResult = await db.$queryRawUnsafe(`
        SELECT
          COUNT(*) as total_sales,
          COALESCE(SUM("subtotal"), 0) as total_subtotal,
          COALESCE(SUM("discountAmount"), 0) as total_discount,
          COALESCE(SUM("tipAmount"), 0) as total_tips,
          COALESCE(SUM("taxAmount"), 0) as total_tax,
          COALESCE(SUM("total"), 0) as total_revenue
        FROM "${tenantSchema}"."sales"
        ${whereClause}
      `, ...params);

      // Por forma de pagamento
      const byPaymentMethod = await db.$queryRawUnsafe(`
        SELECT
          "paymentMethod",
          COUNT(*) as count,
          COALESCE(SUM("total"), 0) as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        GROUP BY "paymentMethod"
        ORDER BY total DESC
      `, ...params);

      // Por tipo de entrega
      const byDeliveryType = await db.$queryRawUnsafe(`
        SELECT
          "deliveryType",
          COUNT(*) as count,
          COALESCE(SUM("total"), 0) as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        GROUP BY "deliveryType"
        ORDER BY total DESC
      `, ...params);

      const totals = (totalsResult as any[])[0];

      res.json({
        summary: {
          totalSales: parseInt(totals.total_sales),
          subtotal: parseFloat(totals.total_subtotal),
          discounts: parseFloat(totals.total_discount),
          tips: parseFloat(totals.total_tips),
          taxes: parseFloat(totals.total_tax),
          totalRevenue: parseFloat(totals.total_revenue),
        },
        byPaymentMethod: (byPaymentMethod as any[]).map(item => ({
          paymentMethod: item.paymentMethod,
          count: parseInt(item.count),
          total: parseFloat(item.total),
        })),
        byDeliveryType: (byDeliveryType as any[]).map(item => ({
          deliveryType: item.deliveryType,
          count: parseInt(item.count),
          total: parseFloat(item.total),
        })),
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de receitas:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório de receitas' });
    }
  }

  /**
   * Relatório de Tempo Médio de Entrega
   * Calcula o tempo entre criação do pedido e marcação como entregue
   */
  async getDeliveryTimeReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      let whereConditions: string[] = ['o."status" = \'delivered\''];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`o."createdAt" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      } else {
        const firstDay = new Date();
        firstDay.setDate(1);
        firstDay.setHours(0, 0, 0, 0);
        whereConditions.push(`o."createdAt" >= $${params.length + 1}`);
        params.push(firstDay);
      }

      if (endDate) {
        whereConditions.push(`o."createdAt" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      } else {
        whereConditions.push(`o."createdAt" <= $${params.length + 1}`);
        params.push(new Date());
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Calcular tempo médio de entrega em minutos
      const deliveryTimeResult = await db.$queryRawUnsafe(`
        SELECT
          COUNT(*) as total_orders,
          AVG(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60) as avg_delivery_time_minutes,
          MIN(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60) as min_delivery_time_minutes,
          MAX(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60) as max_delivery_time_minutes
        FROM "${tenantSchema}"."orders" o
        ${whereClause}
      `, ...params);

      // Distribuição por faixas de tempo
      const distributionResult = await db.$queryRawUnsafe(`
        SELECT
          CASE
            WHEN EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60 <= 15 THEN '0-15 min'
            WHEN EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60 <= 30 THEN '15-30 min'
            WHEN EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60 <= 45 THEN '30-45 min'
            WHEN EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60 <= 60 THEN '45-60 min'
            ELSE '60+ min'
          END as time_range,
          COUNT(*) as count
        FROM "${tenantSchema}"."orders" o
        ${whereClause}
        GROUP BY time_range
        ORDER BY
          CASE time_range
            WHEN '0-15 min' THEN 1
            WHEN '15-30 min' THEN 2
            WHEN '30-45 min' THEN 3
            WHEN '45-60 min' THEN 4
            ELSE 5
          END
      `, ...params);

      const stats = (deliveryTimeResult as any[])[0];

      res.json({
        totalOrders: parseInt(stats.total_orders || 0),
        averageDeliveryTime: parseFloat(stats.avg_delivery_time_minutes || 0).toFixed(2),
        minDeliveryTime: parseFloat(stats.min_delivery_time_minutes || 0).toFixed(2),
        maxDeliveryTime: parseFloat(stats.max_delivery_time_minutes || 0).toFixed(2),
        distribution: (distributionResult as any[]).map(item => ({
          timeRange: item.time_range,
          count: parseInt(item.count),
        })),
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de tempo de entrega:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório de tempo de entrega' });
    }
  }

  /**
   * Relatório Consolidado
   * Retorna todos os relatórios em uma única chamada
   */
  async getConsolidatedReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      // Reusar lógica dos outros métodos
      // Para simplificar, vou chamar os métodos internamente
      const profitData = await this.getProfitDataInternal(db, tenantSchema, startDate as string, endDate as string);
      const revenueData = await this.getRevenueDataInternal(db, tenantSchema, startDate as string, endDate as string);
      const deliveryTimeData = await this.getDeliveryTimeDataInternal(db, tenantSchema, startDate as string, endDate as string);

      res.json({
        profit: profitData,
        revenue: revenueData,
        deliveryTime: deliveryTimeData,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório consolidado:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório consolidado' });
    }
  }

  // Métodos internos auxiliares para reutilizar lógica
  private async getProfitDataInternal(db: any, tenantSchema: string, startDate?: string, endDate?: string) {
    const params: any[] = [];

    if (startDate) {
      params.push(new Date(startDate));
    } else {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      params.push(firstDay);
    }

    if (endDate) {
      params.push(new Date(endDate));
    } else {
      params.push(new Date());
    }

    const revenueResult = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM("total"), 0) as total_revenue
      FROM "${tenantSchema}"."sales"
      WHERE "closedAt" >= $1 AND "closedAt" <= $2
    `, ...params);

    const expensesResult = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM("amount"), 0) as total_expenses
      FROM "${tenantSchema}"."expenses"
      WHERE "date" >= $1 AND "date" <= $2
    `, ...params);

    const revenue = parseFloat((revenueResult as any[])[0]?.total_revenue || 0);
    const expenses = parseFloat((expensesResult as any[])[0]?.total_expenses || 0);
    const profit = revenue - expenses;

    return {
      revenue,
      expenses,
      profit,
      profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0,
    };
  }

  private async getRevenueDataInternal(db: any, tenantSchema: string, startDate?: string, endDate?: string) {
    let whereConditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      whereConditions.push(`"closedAt" >= $${params.length + 1}`);
      params.push(new Date(startDate));
    } else {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      whereConditions.push(`"closedAt" >= $${params.length + 1}`);
      params.push(firstDay);
    }

    if (endDate) {
      whereConditions.push(`"closedAt" <= $${params.length + 1}`);
      params.push(new Date(endDate));
    } else {
      whereConditions.push(`"closedAt" <= $${params.length + 1}`);
      params.push(new Date());
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const totalsResult = await db.$queryRawUnsafe(`
      SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM("subtotal"), 0) as total_subtotal,
        COALESCE(SUM("discountAmount"), 0) as total_discount,
        COALESCE(SUM("tipAmount"), 0) as total_tips,
        COALESCE(SUM("taxAmount"), 0) as total_tax,
        COALESCE(SUM("total"), 0) as total_revenue
      FROM "${tenantSchema}"."sales"
      ${whereClause}
    `, ...params);

    const byPaymentMethod = await db.$queryRawUnsafe(`
      SELECT
        "paymentMethod",
        COUNT(*) as count,
        COALESCE(SUM("total"), 0) as total
      FROM "${tenantSchema}"."sales"
      ${whereClause}
      GROUP BY "paymentMethod"
      ORDER BY total DESC
    `, ...params);

    const totals = (totalsResult as any[])[0];

    return {
      summary: {
        totalSales: parseInt(totals.total_sales),
        subtotal: parseFloat(totals.total_subtotal),
        discounts: parseFloat(totals.total_discount),
        tips: parseFloat(totals.total_tips),
        taxes: parseFloat(totals.total_tax),
        totalRevenue: parseFloat(totals.total_revenue),
      },
      byPaymentMethod: (byPaymentMethod as any[]).map((item: any) => ({
        paymentMethod: item.paymentMethod,
        count: parseInt(item.count),
        total: parseFloat(item.total),
      })),
    };
  }

  private async getDeliveryTimeDataInternal(db: any, tenantSchema: string, startDate?: string, endDate?: string) {
    let whereConditions: string[] = ['o."status" = \'delivered\''];
    const params: any[] = [];

    if (startDate) {
      whereConditions.push(`o."createdAt" >= $${params.length + 1}`);
      params.push(new Date(startDate));
    } else {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      whereConditions.push(`o."createdAt" >= $${params.length + 1}`);
      params.push(firstDay);
    }

    if (endDate) {
      whereConditions.push(`o."createdAt" <= $${params.length + 1}`);
      params.push(new Date(endDate));
    } else {
      whereConditions.push(`o."createdAt" <= $${params.length + 1}`);
      params.push(new Date());
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const deliveryTimeResult = await db.$queryRawUnsafe(`
      SELECT
        COUNT(*) as total_orders,
        AVG(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60) as avg_delivery_time_minutes,
        MIN(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60) as min_delivery_time_minutes,
        MAX(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")) / 60) as max_delivery_time_minutes
      FROM "${tenantSchema}"."orders" o
      ${whereClause}
    `, ...params);

    const stats = (deliveryTimeResult as any[])[0];

    return {
      totalOrders: parseInt(stats.total_orders || 0),
      averageDeliveryTime: parseFloat(stats.avg_delivery_time_minutes || 0).toFixed(2),
      minDeliveryTime: parseFloat(stats.min_delivery_time_minutes || 0).toFixed(2),
      maxDeliveryTime: parseFloat(stats.max_delivery_time_minutes || 0).toFixed(2),
    };
  }
}

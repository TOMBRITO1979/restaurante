import { Response } from 'express';
import { AuthRequest } from '@/types';
import { getTenantClient, prisma } from '@/utils/database';

export class DashboardController {
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantSchema = req.tenantSchema;

      // Estatísticas base
      const stats: any = {};

      // 1. Total de produtos (tenant schema)
      if (tenantSchema) {
        const db = getTenantClient(tenantSchema);

        const productCount = await db.$queryRawUnsafe(`
          SELECT COUNT(*)::int as total
          FROM "${tenantSchema}"."products"
        `) as any[];

        stats.totalProducts = productCount[0]?.total || 0;

        // 2. Vendas de hoje (tenant schema)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const salesStats = await db.$queryRawUnsafe(`
          SELECT
            COUNT(*)::int as "totalSales",
            COALESCE(SUM(total), 0)::decimal as "totalRevenue"
          FROM "${tenantSchema}"."sales"
          WHERE "closedAt" >= $1
        `, today) as any[];

        stats.salesToday = {
          count: salesStats[0]?.totalSales || 0,
          revenue: parseFloat(salesStats[0]?.totalRevenue || '0')
        };
      } else {
        stats.totalProducts = 0;
        stats.salesToday = { count: 0, revenue: 0 };
      }

      // 3. Usuários ativos (public schema)
      if (user.role === 'SUPER_ADMIN') {
        // Super admin vê total de todas as empresas
        const totalUsers = await prisma.user.count({
          where: { isActive: true }
        });
        stats.totalUsers = totalUsers;

        // 4. Total de empresas (apenas super admin)
        const totalCompanies = await prisma.company.count();
        stats.totalCompanies = totalCompanies;
      } else {
        // Admin e User veem apenas da sua empresa
        const totalUsers = await prisma.user.count({
          where: {
            companyId: user.companyId,
            isActive: true
          }
        });
        stats.totalUsers = totalUsers;
        stats.totalCompanies = null; // Não visível para não super admin
      }

      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

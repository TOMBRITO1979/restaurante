"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
class DashboardController {
    async getStats(req, res) {
        try {
            const user = req.user;
            const tenantSchema = req.tenantSchema;
            // ✅ CACHE: Tentar buscar do cache primeiro
            const cacheKey = (0, redis_1.getCacheKey)(tenantSchema || 'global', 'dashboard:stats', user.id);
            const cachedStats = await (0, redis_1.getCache)(cacheKey);
            if (cachedStats) {
                console.log(`📦 Cache HIT: Dashboard stats para ${user.email}`);
                res.json(cachedStats);
                return;
            }
            console.log(`🔍 Cache MISS: Buscando dashboard stats do banco para ${user.email}`);
            // Estat�sticas base
            const stats = {};
            // 1. Total de produtos (tenant schema)
            if (tenantSchema) {
                const db = (0, database_1.getTenantClient)(tenantSchema);
                const productCount = await db.$queryRawUnsafe(`
          SELECT COUNT(*)::int as total
          FROM "${tenantSchema}"."products"
        `);
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
        `, today);
                stats.salesToday = {
                    count: salesStats[0]?.totalSales || 0,
                    revenue: parseFloat(salesStats[0]?.totalRevenue || '0')
                };
            }
            else {
                stats.totalProducts = 0;
                stats.salesToday = { count: 0, revenue: 0 };
            }
            // 3. Usu�rios ativos (public schema)
            if (user.role === 'SUPER_ADMIN') {
                // Super admin v� total de todas as empresas
                const totalUsers = await database_1.prisma.user.count({
                    where: { isActive: true }
                });
                stats.totalUsers = totalUsers;
                // 4. Total de empresas (apenas super admin)
                const totalCompanies = await database_1.prisma.company.count();
                stats.totalCompanies = totalCompanies;
            }
            else {
                // Admin e User veem apenas da sua empresa
                const totalUsers = await database_1.prisma.user.count({
                    where: {
                        companyId: user.companyId,
                        isActive: true
                    }
                });
                stats.totalUsers = totalUsers;
                stats.totalCompanies = null; // Não visível para não super admin
            }
            // ✅ CACHE: Salvar no cache por 5 minutos (300 segundos)
            await (0, redis_1.setCache)(cacheKey, stats, 300);
            console.log(`💾 Cache SAVED: Dashboard stats para ${user.email} (TTL: 5 min)`);
            res.json(stats);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas do dashboard:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map
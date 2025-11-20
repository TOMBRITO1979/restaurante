"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const database_1 = require("../utils/database");
const logger_1 = require("../utils/logger");
class HealthController {
    /**
     * Health check básico - rápido
     * GET /health
     */
    async check(req, res) {
        try {
            const health = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
            };
            res.status(200).json(health);
        }
        catch (error) {
            logger_1.log.error('Health check failed', { error });
            res.status(503).json({
                status: 'error',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Health check detalhado com verificação de dependências
     * GET /health/detailed
     */
    async detailed(req, res) {
        const startTime = Date.now();
        const checks = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            checks: {},
        };
        try {
            // 1. Verificar conexão com banco de dados (public schema)
            try {
                const dbStart = Date.now();
                await database_1.prisma.$queryRaw `SELECT 1`;
                checks.checks.database = {
                    status: 'ok',
                    responseTime: Date.now() - dbStart,
                };
            }
            catch (error) {
                checks.checks.database = {
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
                checks.status = 'degraded';
            }
            // 2. Verificar schemas de tenants (sample)
            try {
                const tenantStart = Date.now();
                const companies = await database_1.prisma.company.findMany({
                    where: { isActive: true },
                    select: { schemaName: true },
                    take: 1, // Testar apenas 1 tenant
                });
                if (companies.length > 0) {
                    const tenantSchema = companies[0].schemaName;
                    const db = (0, database_1.getTenantClient)(tenantSchema);
                    await db.$queryRaw `SELECT 1`;
                    checks.checks.tenantSchemas = {
                        status: 'ok',
                        responseTime: Date.now() - tenantStart,
                        sampleTenant: tenantSchema,
                    };
                }
                else {
                    checks.checks.tenantSchemas = {
                        status: 'ok',
                        message: 'No active companies',
                    };
                }
            }
            catch (error) {
                checks.checks.tenantSchemas = {
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
                checks.status = 'degraded';
            }
            // 3. Verificar memória
            const memUsage = process.memoryUsage();
            const memUsageMB = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
            };
            checks.checks.memory = {
                status: memUsageMB.heapUsed < 512 ? 'ok' : 'warning',
                usage: memUsageMB,
                unit: 'MB',
            };
            // 4. Verificar variáveis de ambiente críticas
            const requiredEnvVars = [
                'DATABASE_URL',
                'JWT_SECRET',
                'FRONTEND_URL',
            ];
            const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
            checks.checks.environment = {
                status: missingEnvVars.length === 0 ? 'ok' : 'error',
                missing: missingEnvVars,
            };
            if (missingEnvVars.length > 0) {
                checks.status = 'error';
            }
            // 5. Tempo total de resposta
            checks.responseTime = Date.now() - startTime;
            // Status HTTP baseado no status geral
            const statusCode = checks.status === 'ok' ? 200 : checks.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(checks);
        }
        catch (error) {
            logger_1.log.error('Detailed health check failed', { error });
            res.status(503).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Liveness probe - verifica se o processo está vivo
     * GET /health/live
     */
    async liveness(req, res) {
        res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Readiness probe - verifica se o serviço está pronto para receber tráfego
     * GET /health/ready
     */
    async readiness(req, res) {
        try {
            // Verificar conexão com banco
            await database_1.prisma.$queryRaw `SELECT 1`;
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.log.error('Readiness check failed', { error });
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Métricas básicas do sistema
     * GET /health/metrics
     */
    async metrics(req, res) {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                uptime: {
                    seconds: Math.floor(process.uptime()),
                    formatted: this.formatUptime(process.uptime()),
                },
                memory: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024),
                    unit: 'MB',
                },
                cpu: {
                    user: process.cpuUsage().user,
                    system: process.cpuUsage().system,
                },
                process: {
                    pid: process.pid,
                    version: process.version,
                    platform: process.platform,
                    arch: process.arch,
                },
            };
            res.status(200).json(metrics);
        }
        catch (error) {
            logger_1.log.error('Metrics check failed', { error });
            res.status(500).json({
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Helper para formatar uptime
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const parts = [];
        if (days > 0)
            parts.push(`${days}d`);
        if (hours > 0)
            parts.push(`${hours}h`);
        if (minutes > 0)
            parts.push(`${minutes}m`);
        parts.push(`${secs}s`);
        return parts.join(' ');
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=HealthController.js.map
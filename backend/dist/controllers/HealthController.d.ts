import { Request, Response } from 'express';
export declare class HealthController {
    /**
     * Health check básico - rápido
     * GET /health
     */
    check(req: Request, res: Response): Promise<void>;
    /**
     * Health check detalhado com verificação de dependências
     * GET /health/detailed
     */
    detailed(req: Request, res: Response): Promise<void>;
    /**
     * Liveness probe - verifica se o processo está vivo
     * GET /health/live
     */
    liveness(req: Request, res: Response): Promise<void>;
    /**
     * Readiness probe - verifica se o serviço está pronto para receber tráfego
     * GET /health/ready
     */
    readiness(req: Request, res: Response): Promise<void>;
    /**
     * Métricas básicas do sistema
     * GET /health/metrics
     */
    metrics(req: Request, res: Response): Promise<void>;
    /**
     * Helper para formatar uptime
     */
    private formatUptime;
}
//# sourceMappingURL=HealthController.d.ts.map
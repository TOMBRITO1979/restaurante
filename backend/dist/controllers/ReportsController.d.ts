import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class ReportsController {
    /**
     * Relatório de Lucro
     * Calcula: Receitas (vendas) - Despesas = Lucro
     */
    getProfitReport(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Relatório de Receitas
     * Total faturado, subtotais por forma de pagamento, impostos, gorjetas
     */
    getRevenueReport(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Relatório de Tempo Médio de Entrega
     * Calcula o tempo entre criação do pedido e marcação como entregue
     */
    getDeliveryTimeReport(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Relatório Consolidado
     * Retorna todos os relatórios em uma única chamada
     */
    getConsolidatedReport(req: AuthRequest, res: Response): Promise<void>;
    private getProfitDataInternal;
    private getRevenueDataInternal;
    private getDeliveryTimeDataInternal;
}
//# sourceMappingURL=ReportsController.d.ts.map
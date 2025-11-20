/**
 * Serviço para processar despesas recorrentes
 * Roda diariamente para criar novas despesas baseadas em templates recorrentes
 */
export declare class RecurringExpensesService {
    /**
     * Processa despesas recorrentes para todas as empresas
     */
    processAllTenants(): Promise<void>;
    /**
     * Processa despesas recorrentes para um tenant específico
     */
    private processTenantExpenses;
    /**
     * Método auxiliar para testar o serviço manualmente
     */
    testRun(): Promise<void>;
}
export declare const recurringExpensesService: RecurringExpensesService;
//# sourceMappingURL=recurringExpensesService.d.ts.map
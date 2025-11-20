"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRecurringExpensesJob = exports.startRecurringExpensesCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const recurringExpensesService_1 = require("../services/recurringExpensesService");
/**
 * Cron job para processar despesas recorrentes
 * Roda todos os dias às 6:00 AM
 */
const startRecurringExpensesCron = () => {
    // Executar todos os dias às 6:00 AM
    // Formato: segundo minuto hora dia mês dia-da-semana
    node_cron_1.default.schedule('0 6 * * *', async () => {
        try {
            console.log('[Cron] Iniciando job de despesas recorrentes...');
            await recurringExpensesService_1.recurringExpensesService.processAllTenants();
            console.log('[Cron] Job de despesas recorrentes concluído com sucesso');
        }
        catch (error) {
            console.error('[Cron] Erro ao executar job de despesas recorrentes:', error);
        }
    }, {
        timezone: 'America/Sao_Paulo' // Ajuste conforme necessário
    });
    console.log('[Cron] Job de despesas recorrentes agendado (diariamente às 6:00 AM)');
};
exports.startRecurringExpensesCron = startRecurringExpensesCron;
/**
 * Função para testar o job manualmente
 * Útil para desenvolvimento e testes
 */
const testRecurringExpensesJob = async () => {
    console.log('[Test] Executando job de despesas recorrentes manualmente...');
    try {
        await recurringExpensesService_1.recurringExpensesService.processAllTenants();
        console.log('[Test] Job executado com sucesso');
    }
    catch (error) {
        console.error('[Test] Erro ao executar job:', error);
    }
};
exports.testRecurringExpensesJob = testRecurringExpensesJob;
//# sourceMappingURL=recurringExpensesCron.js.map
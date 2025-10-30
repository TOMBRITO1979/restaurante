import cron from 'node-cron';
import { recurringExpensesService } from '@/services/recurringExpensesService';

/**
 * Cron job para processar despesas recorrentes
 * Roda todos os dias às 6:00 AM
 */
export const startRecurringExpensesCron = (): void => {
  // Executar todos os dias às 6:00 AM
  // Formato: segundo minuto hora dia mês dia-da-semana
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log('[Cron] Iniciando job de despesas recorrentes...');
      await recurringExpensesService.processAllTenants();
      console.log('[Cron] Job de despesas recorrentes concluído com sucesso');
    } catch (error) {
      console.error('[Cron] Erro ao executar job de despesas recorrentes:', error);
    }
  }, {
    timezone: 'America/Sao_Paulo' // Ajuste conforme necessário
  });

  console.log('[Cron] Job de despesas recorrentes agendado (diariamente às 6:00 AM)');
};

/**
 * Função para testar o job manualmente
 * Útil para desenvolvimento e testes
 */
export const testRecurringExpensesJob = async (): Promise<void> => {
  console.log('[Test] Executando job de despesas recorrentes manualmente...');
  try {
    await recurringExpensesService.processAllTenants();
    console.log('[Test] Job executado com sucesso');
  } catch (error) {
    console.error('[Test] Erro ao executar job:', error);
  }
};

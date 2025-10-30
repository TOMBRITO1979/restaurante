import { v4 as uuidv4 } from 'uuid';
import { prisma, getTenantClient } from '@/utils/database';

/**
 * Serviço para processar despesas recorrentes
 * Roda diariamente para criar novas despesas baseadas em templates recorrentes
 */
export class RecurringExpensesService {
  /**
   * Processa despesas recorrentes para todas as empresas
   */
  async processAllTenants(): Promise<void> {
    try {
      console.log('[RecurringExpenses] Iniciando processamento de despesas recorrentes...');

      // Buscar todas as empresas ativas
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true, schemaName: true },
      });

      console.log(`[RecurringExpenses] Encontradas ${companies.length} empresas ativas`);

      for (const company of companies) {
        try {
          await this.processTenantExpenses(company.schemaName, company.name);
        } catch (error) {
          console.error(
            `[RecurringExpenses] Erro ao processar empresa ${company.name} (${company.schemaName}):`,
            error
          );
          // Continuar processando outras empresas mesmo se uma falhar
        }
      }

      console.log('[RecurringExpenses] Processamento concluído');
    } catch (error) {
      console.error('[RecurringExpenses] Erro ao processar despesas recorrentes:', error);
      throw error;
    }
  }

  /**
   * Processa despesas recorrentes para um tenant específico
   */
  private async processTenantExpenses(schemaName: string, companyName: string): Promise<void> {
    const db = getTenantClient(schemaName);
    const today = new Date();
    const currentDay = today.getDate();

    console.log(`[RecurringExpenses] Processando ${companyName} (${schemaName}) - Dia: ${currentDay}`);

    // Buscar despesas recorrentes que devem ser criadas hoje
    const recurringExpenses = await db.$queryRawUnsafe(`
      SELECT * FROM "${schemaName}"."expenses"
      WHERE "isRecurring" = true
        AND "recurringDayOfMonth" = $1
        AND "recurringTemplateId" IS NULL
    `, currentDay) as any[];

    if (recurringExpenses.length === 0) {
      console.log(`[RecurringExpenses] Nenhuma despesa recorrente para processar em ${companyName}`);
      return;
    }

    console.log(`[RecurringExpenses] Encontradas ${recurringExpenses.length} despesas recorrentes em ${companyName}`);

    // Verificar se já existe uma despesa criada este mês para cada template
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    for (const template of recurringExpenses) {
      try {
        // Verificar se já foi criada uma despesa este mês a partir deste template
        const existing = await db.$queryRawUnsafe(`
          SELECT id FROM "${schemaName}"."expenses"
          WHERE "recurringTemplateId" = $1
            AND "date" >= $2
            AND "date" <= $3
          LIMIT 1
        `, template.id, startOfMonth, endOfMonth) as any[];

        if (existing.length > 0) {
          console.log(
            `[RecurringExpenses] Despesa já criada este mês para template ${template.id} em ${companyName}`
          );
          continue;
        }

        // Criar nova despesa baseada no template
        const newExpenseId = uuidv4();
        const newDate = new Date(currentYear, currentMonth, currentDay);
        const now = new Date();

        await db.$executeRawUnsafe(`
          INSERT INTO "${schemaName}"."expenses"
          ("id", "categoryId", "description", "amount", "date", "paymentMethod",
           "supplier", "isRecurring", "recurringDayOfMonth", "recurringTemplateId",
           "notes", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
          newExpenseId,
          template.categoryId,
          template.description,
          template.amount,
          newDate,
          template.paymentMethod,
          template.supplier,
          false, // Nova despesa não é recorrente
          null,
          template.id, // Referência ao template original
          template.notes,
          now,
          now
        );

        console.log(
          `[RecurringExpenses] Despesa criada: ${template.description} (R$ ${template.amount}) em ${companyName}`
        );
      } catch (error) {
        console.error(
          `[RecurringExpenses] Erro ao criar despesa para template ${template.id} em ${companyName}:`,
          error
        );
        // Continuar processando outras despesas
      }
    }
  }

  /**
   * Método auxiliar para testar o serviço manualmente
   */
  async testRun(): Promise<void> {
    console.log('[RecurringExpenses] Executando teste manual...');
    await this.processAllTenants();
  }
}

// Instância singleton do serviço
export const recurringExpensesService = new RecurringExpensesService();

import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';

export class ExpensesController {
  // Listar despesas com filtros
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, categoryId, supplier, isRecurring } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`e."date" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        whereConditions.push(`e."date" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      }

      if (categoryId) {
        whereConditions.push(`e."categoryId" = $${params.length + 1}`);
        params.push(categoryId);
      }

      if (supplier) {
        whereConditions.push(`e."supplier" ILIKE $${params.length + 1}`);
        params.push(`%${supplier}%`);
      }

      if (isRecurring !== undefined) {
        whereConditions.push(`e."isRecurring" = $${params.length + 1}`);
        params.push(isRecurring === 'true');
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const expenses = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        ${whereClause}
        ORDER BY e."date" DESC, e."createdAt" DESC
      `, ...params);

      // Converter BigInt para Number se necessário
      const converted = (expenses as any[]).map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));

      res.json(converted);
    } catch (error) {
      console.error('Erro ao listar despesas:', error);
      res.status(500).json({ error: 'Erro ao listar despesas' });
    }
  }

  // Buscar despesa por ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { id } = req.params;

      const expense = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        WHERE e."id" = $1
      `, id);

      if ((expense as any[]).length === 0) {
        res.status(404).json({ error: 'Despesa não encontrada' });
        return;
      }

      const converted = {
        ...(expense as any[])[0],
        amount: parseFloat((expense as any[])[0].amount),
      };

      res.json(converted);
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      res.status(500).json({ error: 'Erro ao buscar despesa' });
    }
  }

  // Criar despesa
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const {
        categoryId,
        description,
        amount,
        date,
        paymentMethod,
        supplier,
        isRecurring,
        recurringDayOfMonth,
        notes,
      } = req.body;

      if (!categoryId || !description || !amount || !date || !paymentMethod) {
        res.status(400).json({ error: 'Campos obrigatórios faltando' });
        return;
      }

      if (isRecurring && (!recurringDayOfMonth || recurringDayOfMonth < 1 || recurringDayOfMonth > 31)) {
        res.status(400).json({ error: 'Dia do mês para recorrência inválido (1-31)' });
        return;
      }

      const id = uuidv4();
      const now = new Date();

      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."expenses"
        ("id", "categoryId", "description", "amount", "date", "paymentMethod",
         "supplier", "isRecurring", "recurringDayOfMonth", "notes", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        id,
        categoryId,
        description,
        amount,
        new Date(date),
        paymentMethod,
        supplier || null,
        isRecurring || false,
        isRecurring ? recurringDayOfMonth : null,
        notes || null,
        now,
        now
      );

      const expense = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        WHERE e."id" = $1
      `, id);

      const converted = {
        ...(expense as any[])[0],
        amount: parseFloat((expense as any[])[0].amount),
      };

      res.status(201).json(converted);
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      res.status(500).json({ error: 'Erro ao criar despesa' });
    }
  }

  // Atualizar despesa
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { id } = req.params;

      const {
        categoryId,
        description,
        amount,
        date,
        paymentMethod,
        supplier,
        isRecurring,
        recurringDayOfMonth,
        notes,
      } = req.body;

      if (!categoryId || !description || !amount || !date || !paymentMethod) {
        res.status(400).json({ error: 'Campos obrigatórios faltando' });
        return;
      }

      if (isRecurring && (!recurringDayOfMonth || recurringDayOfMonth < 1 || recurringDayOfMonth > 31)) {
        res.status(400).json({ error: 'Dia do mês para recorrência inválido (1-31)' });
        return;
      }

      const now = new Date();

      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."expenses"
        SET
          "categoryId" = $1,
          "description" = $2,
          "amount" = $3,
          "date" = $4,
          "paymentMethod" = $5,
          "supplier" = $6,
          "isRecurring" = $7,
          "recurringDayOfMonth" = $8,
          "notes" = $9,
          "updatedAt" = $10
        WHERE "id" = $11
      `,
        categoryId,
        description,
        amount,
        new Date(date),
        paymentMethod,
        supplier || null,
        isRecurring || false,
        isRecurring ? recurringDayOfMonth : null,
        notes || null,
        now,
        id
      );

      const expense = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        WHERE e."id" = $1
      `, id);

      if ((expense as any[]).length === 0) {
        res.status(404).json({ error: 'Despesa não encontrada' });
        return;
      }

      const converted = {
        ...(expense as any[])[0],
        amount: parseFloat((expense as any[])[0].amount),
      };

      res.json(converted);
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      res.status(500).json({ error: 'Erro ao atualizar despesa' });
    }
  }

  // Deletar despesa
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);
      const { id } = req.params;

      await db.$executeRawUnsafe(`
        DELETE FROM "${tenantSchema}"."expenses"
        WHERE "id" = $1
      `, id);

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      res.status(500).json({ error: 'Erro ao deletar despesa' });
    }
  }

  // Obter estatísticas de despesas
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"date" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        whereConditions.push(`"date" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Total de despesas
      const totalResult = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM("amount"), 0) as total
        FROM "${tenantSchema}"."expenses"
        ${whereClause}
      `, ...params);

      // Despesas por categoria
      const byCategory = await db.$queryRawUnsafe(`
        SELECT
          c.id,
          c.name,
          c.color,
          COALESCE(SUM(e."amount"), 0) as total,
          COUNT(e.id) as count
        FROM "${tenantSchema}"."expense_categories" c
        LEFT JOIN "${tenantSchema}"."expenses" e ON c.id = e."categoryId"
          ${whereConditions.length > 0 ? `AND ${whereConditions.map((cond, i) => cond.replace(`$${i + 1}`, `$${i + 1}`)).join(' AND ')}` : ''}
        GROUP BY c.id, c.name, c.color
        ORDER BY total DESC
      `, ...params);

      // Despesas por método de pagamento
      const byPaymentMethod = await db.$queryRawUnsafe(`
        SELECT
          "paymentMethod",
          COALESCE(SUM("amount"), 0) as total,
          COUNT(id) as count
        FROM "${tenantSchema}"."expenses"
        ${whereClause}
        GROUP BY "paymentMethod"
        ORDER BY total DESC
      `, ...params);

      const stats = {
        total: parseFloat((totalResult as any[])[0].total),
        byCategory: (byCategory as any[]).map(item => ({
          ...item,
          total: parseFloat(item.total),
          count: parseInt(item.count),
        })),
        byPaymentMethod: (byPaymentMethod as any[]).map(item => ({
          ...item,
          total: parseFloat(item.total),
          count: parseInt(item.count),
        })),
      };

      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas de despesas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  }

  // Exportar despesas para PDF
  async exportPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, categoryId, supplier } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`e."date" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        whereConditions.push(`e."date" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      }

      if (categoryId) {
        whereConditions.push(`e."categoryId" = $${params.length + 1}`);
        params.push(categoryId);
      }

      if (supplier) {
        whereConditions.push(`e."supplier" ILIKE $${params.length + 1}`);
        params.push(`%${supplier}%`);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const expenses = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        ${whereClause}
        ORDER BY e."date" DESC, e."createdAt" DESC
      `, ...params);

      // Converter valores
      const converted = (expenses as any[]).map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));

      // Criar PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="despesas_${Date.now()}.pdf"`);

      // Pipe do PDF para a resposta
      doc.pipe(res);

      // Título
      doc.fontSize(20).text('Relatório de Despesas', { align: 'center' });
      doc.moveDown();

      // Período
      if (startDate || endDate) {
        doc.fontSize(12).text(
          `Período: ${startDate ? new Date(startDate as string).toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(endDate as string).toLocaleDateString('pt-BR') : 'Hoje'}`,
          { align: 'center' }
        );
        doc.moveDown();
      }

      // Data de geração
      doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.moveDown(2);

      // Total
      const total = converted.reduce((sum, exp) => sum + exp.amount, 0);
      doc.fontSize(14).font('Helvetica-Bold').text(`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`);
      doc.moveDown();

      // Tabela de despesas
      doc.fontSize(10);
      const tableTop = doc.y;
      const colWidths = {
        date: 70,
        description: 150,
        category: 80,
        supplier: 100,
        payment: 70,
        amount: 80,
      };

      // Cabeçalho da tabela
      doc.font('Helvetica-Bold');
      let x = 50;
      doc.text('Data', x, tableTop, { width: colWidths.date });
      x += colWidths.date;
      doc.text('Descrição', x, tableTop, { width: colWidths.description });
      x += colWidths.description;
      doc.text('Categoria', x, tableTop, { width: colWidths.category });
      x += colWidths.category;
      doc.text('Fornecedor', x, tableTop, { width: colWidths.supplier });
      x += colWidths.supplier;
      doc.text('Pagamento', x, tableTop, { width: colWidths.payment });
      x += colWidths.payment;
      doc.text('Valor', x, tableTop, { width: colWidths.amount });

      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown();

      // Dados
      doc.font('Helvetica');
      const paymentMethodLabels: Record<string, string> = {
        cash: 'Dinheiro',
        credit: 'Crédito',
        debit: 'Débito',
        pix: 'PIX',
        bank_transfer: 'Transfer.',
        check: 'Cheque',
      };

      for (const expense of converted) {
        const y = doc.y;

        // Verificar se precisa de nova página
        if (y > 700) {
          doc.addPage();
        }

        x = 50;
        doc.text(new Date(expense.date).toLocaleDateString('pt-BR'), x, y, { width: colWidths.date });
        x += colWidths.date;
        doc.text(expense.description.substring(0, 25), x, y, { width: colWidths.description });
        x += colWidths.description;
        doc.text(expense.category?.name || '-', x, y, { width: colWidths.category });
        x += colWidths.category;
        doc.text((expense.supplier || '-').substring(0, 15), x, y, { width: colWidths.supplier });
        x += colWidths.supplier;
        doc.text(paymentMethodLabels[expense.paymentMethod] || expense.paymentMethod, x, y, { width: colWidths.payment });
        x += colWidths.payment;
        doc.text(
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount),
          x,
          y,
          { width: colWidths.amount }
        );

        doc.moveDown(0.8);
      }

      // Finalizar PDF
      doc.end();
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      res.status(500).json({ error: 'Erro ao exportar PDF' });
    }
  }

  // Exportar despesas para CSV
  async exportCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, categoryId, supplier } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`e."date" >= $${params.length + 1}`);
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        whereConditions.push(`e."date" <= $${params.length + 1}`);
        params.push(new Date(endDate as string));
      }

      if (categoryId) {
        whereConditions.push(`e."categoryId" = $${params.length + 1}`);
        params.push(categoryId);
      }

      if (supplier) {
        whereConditions.push(`e."supplier" ILIKE $${params.length + 1}`);
        params.push(`%${supplier}%`);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const expenses = await db.$queryRawUnsafe(`
        SELECT
          e.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color
          ) as category
        FROM "${tenantSchema}"."expenses" e
        LEFT JOIN "${tenantSchema}"."expense_categories" c ON e."categoryId" = c.id
        ${whereClause}
        ORDER BY e."date" DESC, e."createdAt" DESC
      `, ...params);

      // Converter valores
      const converted = (expenses as any[]).map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));

      // Labels de pagamento
      const paymentMethodLabels: Record<string, string> = {
        cash: 'Dinheiro',
        credit: 'Crédito',
        debit: 'Débito',
        pix: 'PIX',
        bank_transfer: 'Transferência',
        check: 'Cheque',
      };

      // Construir CSV manualmente
      let csv = 'Data,Descrição,Categoria,Fornecedor,Forma de Pagamento,Valor,Recorrente,Observações\n';

      for (const expense of converted) {
        const row = [
          new Date(expense.date).toLocaleDateString('pt-BR'),
          `"${expense.description.replace(/"/g, '""')}"`,
          `"${expense.category?.name || ''}"`,
          `"${expense.supplier || ''}"`,
          paymentMethodLabels[expense.paymentMethod] || expense.paymentMethod,
          expense.amount.toFixed(2).replace('.', ','),
          expense.isRecurring ? 'Sim' : 'Não',
          `"${(expense.notes || '').replace(/"/g, '""')}"`,
        ];
        csv += row.join(',') + '\n';
      }

      // Adicionar BOM para UTF-8
      const bom = '\uFEFF';
      const csvWithBom = bom + csv;

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="despesas_${Date.now()}.csv"`);

      res.send(csvWithBom);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar CSV' });
    }
  }
}

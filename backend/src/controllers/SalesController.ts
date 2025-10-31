import { Response } from 'express';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';
import PDFDocument from 'pdfkit';

export class SalesController {
  // Listar histórico de vendas (da tabela sales)
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, paymentMethod, page = '1', limit = '50' } = req.query;

      const whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
        params.push(startDate);
      }

      if (endDate) {
        // Add 1 day to include the entire end date
        const endDateTime = new Date(endDate as string);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereConditions.push(`"closedAt" < $${params.length + 1}::timestamp`);
        params.push(endDateTime.toISOString());
      }

      if (paymentMethod) {
        whereConditions.push(`"paymentMethod" = $${params.length + 1}`);
        params.push(paymentMethod);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const sales = await db.$queryRawUnsafe(`
        SELECT
          id,
          "saleNumber",
          "tabId",
          "tableNumber",
          "deliveryType",
          "customerName",
          "customerPhone",
          subtotal,
          "discountRate",
          "discountAmount",
          "tipRate",
          "tipAmount",
          "taxRate",
          "taxAmount",
          total,
          "amountPaid",
          "changeAmount",
          "paymentMethod",
          items,
          "createdAt",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        ORDER BY "closedAt" DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, ...params, parseInt(limit as string), offset);

      // Contar total de registros
      const countResult = await db.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
      `, ...params) as any[];

      const total = countResult[0]?.total || 0;

      // Converter BigInt para Number
      const salesConverted = (sales as any[]).map(sale => ({
        ...sale,
        saleNumber: Number(sale.saleNumber)
      }));

      res.json({
        sales: salesConverted,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Erro ao listar vendas:', error);
      res.status(500).json({ error: 'Erro ao listar vendas' });
    }
  }

  // Buscar venda por ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const sales = await db.$queryRawUnsafe(`
        SELECT
          id,
          "saleNumber",
          "tabId",
          "tableNumber",
          "deliveryType",
          "customerName",
          "customerPhone",
          subtotal,
          "discountRate",
          "discountAmount",
          "tipRate",
          "tipAmount",
          "taxRate",
          "taxAmount",
          total,
          "amountPaid",
          "changeAmount",
          "paymentMethod",
          items,
          "createdAt",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        WHERE id = $1
      `, id) as any[];

      if (!sales || sales.length === 0) {
        res.status(404).json({ error: 'Venda não encontrada' });
        return;
      }

      const sale = sales[0];
      sale.saleNumber = Number(sale.saleNumber);

      res.json(sale);
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      res.status(500).json({ error: 'Erro ao buscar venda' });
    }
  }

  // Obter estatísticas de vendas
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate } = req.query;

      const whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
        params.push(startDate);
      }

      if (endDate) {
        // Add 1 day to include the entire end date
        const endDateTime = new Date(endDate as string);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereConditions.push(`"closedAt" < $${params.length + 1}::timestamp`);
        params.push(endDateTime.toISOString());
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const stats = await db.$queryRawUnsafe(`
        SELECT
          COUNT(*)::int as "totalSales",
          COALESCE(SUM(total), 0)::decimal as "totalRevenue",
          COALESCE(AVG(total), 0)::decimal as "averageTicket",
          COALESCE(SUM("discountAmount"), 0)::decimal as "totalDiscounts"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
      `, ...params) as any[];

      // Vendas por forma de pagamento
      const paymentStats = await db.$queryRawUnsafe(`
        SELECT
          "paymentMethod",
          COUNT(*)::int as count,
          COALESCE(SUM(total), 0)::decimal as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        GROUP BY "paymentMethod"
        ORDER BY total DESC
      `, ...params);

      res.json({
        overall: stats[0],
        byPaymentMethod: paymentStats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  // Exportar vendas para PDF
  async exportPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, paymentMethod } = req.query;

      const whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
        params.push(startDate);
      }

      if (endDate) {
        // Add 1 day to include the entire end date
        const endDateTime = new Date(endDate as string);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereConditions.push(`"closedAt" < $${params.length + 1}::timestamp`);
        params.push(endDateTime.toISOString());
      }

      if (paymentMethod) {
        whereConditions.push(`"paymentMethod" = $${params.length + 1}`);
        params.push(paymentMethod);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const sales = await db.$queryRawUnsafe(`
        SELECT
          id,
          "saleNumber",
          "tableNumber",
          "deliveryType",
          "customerName",
          "customerPhone",
          subtotal,
          "discountRate",
          "discountAmount",
          "tipRate",
          "tipAmount",
          total,
          "paymentMethod",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        ORDER BY "closedAt" DESC
      `, ...params);

      // Converter valores
      const converted = (sales as any[]).map(sale => ({
        ...sale,
        saleNumber: Number(sale.saleNumber),
        subtotal: parseFloat(sale.subtotal),
        discountRate: parseFloat(sale.discountRate),
        discountAmount: parseFloat(sale.discountAmount),
        tipRate: parseFloat(sale.tipRate),
        tipAmount: parseFloat(sale.tipAmount),
        total: parseFloat(sale.total),
      }));

      // Criar PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="vendas_${Date.now()}.pdf"`);

      // Pipe do PDF para a resposta
      doc.pipe(res);

      // Título
      doc.fontSize(20).text('Relatório de Vendas', { align: 'center' });
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

      // Estatísticas
      const totalVendas = converted.length;
      const totalReceita = converted.reduce((sum, sale) => sum + sale.total, 0);
      const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Resumo:', { underline: true });
      doc.font('Helvetica');
      doc.text(`Total de Vendas: ${totalVendas}`);
      doc.text(`Receita Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceita)}`);
      doc.text(`Ticket Médio: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}`);
      doc.moveDown(2);

      // Tabela de vendas
      doc.fontSize(10);
      const tableTop = doc.y;
      const colWidths = {
        number: 50,
        date: 80,
        type: 80,
        customer: 100,
        payment: 70,
        total: 80,
      };

      // Cabeçalho da tabela
      doc.font('Helvetica-Bold');
      let x = 50;
      doc.text('Nº', x, tableTop, { width: colWidths.number });
      x += colWidths.number;
      doc.text('Data/Hora', x, tableTop, { width: colWidths.date });
      x += colWidths.date;
      doc.text('Tipo', x, tableTop, { width: colWidths.type });
      x += colWidths.type;
      doc.text('Cliente', x, tableTop, { width: colWidths.customer });
      x += colWidths.customer;
      doc.text('Pagamento', x, tableTop, { width: colWidths.payment });
      x += colWidths.payment;
      doc.text('Total', x, tableTop, { width: colWidths.total });

      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown();

      // Dados
      doc.font('Helvetica');
      const deliveryTypeLabels: Record<string, string> = {
        dine_in: 'Mesa',
        delivery: 'Delivery',
        takeout: 'Viagem',
      };

      const paymentMethodLabels: Record<string, string> = {
        cash: 'Dinheiro',
        credit_card: 'Crédito',
        debit_card: 'Débito',
        pix: 'PIX',
      };

      for (const sale of converted) {
        const y = doc.y;

        // Verificar se precisa de nova página
        if (y > 700) {
          doc.addPage();
        }

        x = 50;
        doc.text(`#${sale.saleNumber}`, x, y, { width: colWidths.number });
        x += colWidths.number;
        doc.text(new Date(sale.closedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }), x, y, { width: colWidths.date });
        x += colWidths.date;
        doc.text(deliveryTypeLabels[sale.deliveryType] || sale.deliveryType, x, y, { width: colWidths.type });
        x += colWidths.type;
        doc.text((sale.customerName || sale.tableNumber ? `Mesa ${sale.tableNumber}` : '-').substring(0, 15), x, y, { width: colWidths.customer });
        x += colWidths.customer;
        doc.text(paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod, x, y, { width: colWidths.payment });
        x += colWidths.payment;
        doc.text(
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total),
          x,
          y,
          { width: colWidths.total }
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

  // Exportar vendas para CSV
  async exportCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { startDate, endDate, paymentMethod } = req.query;

      const whereConditions: string[] = [];
      const params: any[] = [];

      if (startDate) {
        whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
        params.push(startDate);
      }

      if (endDate) {
        // Add 1 day to include the entire end date
        const endDateTime = new Date(endDate as string);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereConditions.push(`"closedAt" < $${params.length + 1}::timestamp`);
        params.push(endDateTime.toISOString());
      }

      if (paymentMethod) {
        whereConditions.push(`"paymentMethod" = $${params.length + 1}`);
        params.push(paymentMethod);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const sales = await db.$queryRawUnsafe(`
        SELECT
          "saleNumber",
          "tableNumber",
          "deliveryType",
          "customerName",
          "customerPhone",
          subtotal,
          "discountRate",
          "discountAmount",
          "tipRate",
          "tipAmount",
          "taxRate",
          "taxAmount",
          total,
          "amountPaid",
          "changeAmount",
          "paymentMethod",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        ORDER BY "closedAt" DESC
      `, ...params);

      // Converter valores
      const converted = (sales as any[]).map(sale => ({
        ...sale,
        saleNumber: Number(sale.saleNumber),
        subtotal: parseFloat(sale.subtotal),
        discountRate: parseFloat(sale.discountRate),
        discountAmount: parseFloat(sale.discountAmount),
        tipRate: parseFloat(sale.tipRate),
        tipAmount: parseFloat(sale.tipAmount),
        taxRate: parseFloat(sale.taxRate),
        taxAmount: parseFloat(sale.taxAmount),
        total: parseFloat(sale.total),
        amountPaid: parseFloat(sale.amountPaid),
        changeAmount: parseFloat(sale.changeAmount),
      }));

      // Labels
      const deliveryTypeLabels: Record<string, string> = {
        dine_in: 'Mesa/Salão',
        delivery: 'Delivery',
        takeout: 'Para Viagem',
      };

      const paymentMethodLabels: Record<string, string> = {
        cash: 'Dinheiro',
        credit_card: 'Cartão de Crédito',
        debit_card: 'Cartão de Débito',
        pix: 'PIX',
      };

      // Construir CSV manualmente
      let csv = 'Número da Venda,Data/Hora,Tipo de Entrega,Mesa,Cliente,Telefone,Subtotal,Taxa Desconto (%),Desconto (R$),Taxa Gorjeta (%),Gorjeta (R$),Taxa Imposto (%),Imposto (R$),Total,Valor Pago,Troco,Forma de Pagamento\n';

      for (const sale of converted) {
        const row = [
          sale.saleNumber,
          new Date(sale.closedAt).toLocaleString('pt-BR'),
          deliveryTypeLabels[sale.deliveryType] || sale.deliveryType,
          sale.tableNumber || '',
          `"${(sale.customerName || '').replace(/"/g, '""')}"`,
          sale.customerPhone || '',
          sale.subtotal.toFixed(2).replace('.', ','),
          sale.discountRate.toFixed(2).replace('.', ','),
          sale.discountAmount.toFixed(2).replace('.', ','),
          sale.tipRate.toFixed(2).replace('.', ','),
          sale.tipAmount.toFixed(2).replace('.', ','),
          sale.taxRate.toFixed(2).replace('.', ','),
          sale.taxAmount.toFixed(2).replace('.', ','),
          sale.total.toFixed(2).replace('.', ','),
          sale.amountPaid.toFixed(2).replace('.', ','),
          sale.changeAmount.toFixed(2).replace('.', ','),
          paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod,
        ];
        csv += row.join(',') + '\n';
      }

      // Adicionar BOM para UTF-8
      const bom = '\uFEFF';
      const csvWithBom = bom + csv;

      // Configurar headers de resposta
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="vendas_${Date.now()}.csv"`);

      res.send(csvWithBom);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar CSV' });
    }
  }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const database_1 = require("../utils/database");
const pdfkit_1 = __importDefault(require("pdfkit"));
class SalesController {
    // Listar histórico de vendas (da tabela sales)
    async list(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { startDate, endDate, paymentMethod, page = '1', limit = '50' } = req.query;
            const whereConditions = [];
            const params = [];
            if (startDate) {
                whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
                params.push(startDate);
            }
            if (endDate) {
                // Add 1 day to include the entire end date
                const endDateTime = new Date(endDate);
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
            const offset = (parseInt(page) - 1) * parseInt(limit);
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
          "paymentMethod",
          items,
          "createdAt",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        ORDER BY "closedAt" DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, ...params, parseInt(limit), offset);
            // Contar total de registros
            const countResult = await db.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total
        FROM "${tenantSchema}"."sales"
        ${whereClause}
      `, ...params);
            const total = countResult[0]?.total || 0;
            // Convert BigInt saleNumber to Number
            const convertedSales = sales.map(sale => ({
                ...sale,
                saleNumber: Number(sale.saleNumber)
            }));
            res.json({
                sales: convertedSales,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        }
        catch (error) {
            console.error('Erro ao listar vendas:', error);
            res.status(500).json({ error: 'Erro ao listar vendas' });
        }
    }
    // Buscar venda por ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
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
          "paymentMethod",
          items,
          "createdAt",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        WHERE id = $1
      `, id);
            if (!sales || sales.length === 0) {
                res.status(404).json({ error: 'Venda não encontrada' });
                return;
            }
            const sale = sales[0];
            // Convert BigInt saleNumber to Number
            const convertedSale = {
                ...sale,
                saleNumber: Number(sale.saleNumber)
            };
            res.json(convertedSale);
        }
        catch (error) {
            console.error('Erro ao buscar venda:', error);
            res.status(500).json({ error: 'Erro ao buscar venda' });
        }
    }
    // Obter estatísticas de vendas
    async getStats(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { startDate, endDate } = req.query;
            const whereConditions = [];
            const params = [];
            if (startDate) {
                whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
                params.push(startDate);
            }
            if (endDate) {
                // Add 1 day to include the entire end date
                const endDateTime = new Date(endDate);
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
      `, ...params);
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
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    }
    // Exportar vendas para PDF
    async exportPDF(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { startDate, endDate, paymentMethod } = req.query;
            // Buscar configurações da empresa
            const settingsResult = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."company_settings"
        WHERE "id" = 'default'
        LIMIT 1
      `);
            const settings = settingsResult[0] || {
                companyName: 'Minha Empresa',
                address: '',
                phone: '',
                email: '',
            };
            const whereConditions = [];
            const params = [];
            if (startDate) {
                whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
                params.push(startDate);
            }
            if (endDate) {
                // Add 1 day to include the entire end date
                const endDateTime = new Date(endDate);
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
            const converted = sales.map(sale => ({
                ...sale,
                subtotal: parseFloat(sale.subtotal),
                discountRate: parseFloat(sale.discountRate),
                discountAmount: parseFloat(sale.discountAmount),
                tipRate: parseFloat(sale.tipRate),
                tipAmount: parseFloat(sale.tipAmount),
                total: parseFloat(sale.total),
            }));
            // Criar PDF
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            // Configurar headers de resposta
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="vendas_${Date.now()}.pdf"`);
            // Pipe do PDF para a resposta
            doc.pipe(res);
            // Cabeçalho da empresa
            doc.fontSize(16).font('Helvetica-Bold').text(settings.companyName, { align: 'center' });
            doc.moveDown(0.5);
            if (settings.address || settings.city || settings.state) {
                const addressParts = [];
                if (settings.address)
                    addressParts.push(settings.address);
                if (settings.city)
                    addressParts.push(settings.city);
                if (settings.state)
                    addressParts.push(settings.state);
                doc.fontSize(9).font('Helvetica').text(addressParts.join(', '), { align: 'center' });
            }
            if (settings.phone || settings.email) {
                const contactParts = [];
                if (settings.phone)
                    contactParts.push(`Tel: ${settings.phone}`);
                if (settings.email)
                    contactParts.push(`Email: ${settings.email}`);
                doc.fontSize(9).text(contactParts.join(' | '), { align: 'center' });
            }
            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(1);
            // Título
            doc.fontSize(20).font('Helvetica-Bold').text('Relatório de Vendas', { align: 'center' });
            doc.moveDown();
            // Período
            if (startDate || endDate) {
                doc.fontSize(12).text(`Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'}`, { align: 'center' });
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
            const deliveryTypeLabels = {
                dine_in: 'Mesa',
                delivery: 'Delivery',
                takeout: 'Viagem',
            };
            const paymentMethodLabels = {
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
                doc.text(`#${sale.id.substring(0, 8)}`, x, y, { width: colWidths.number });
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
                doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total), x, y, { width: colWidths.total });
                doc.moveDown(0.8);
            }
            // Finalizar PDF
            doc.end();
        }
        catch (error) {
            console.error('Erro ao exportar PDF:', error);
            res.status(500).json({ error: 'Erro ao exportar PDF' });
        }
    }
    // Exportar vendas para CSV
    async exportCSV(req, res) {
        try {
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            const { startDate, endDate, paymentMethod } = req.query;
            const whereConditions = [];
            const params = [];
            if (startDate) {
                whereConditions.push(`"closedAt" >= $${params.length + 1}::timestamp`);
                params.push(startDate);
            }
            if (endDate) {
                // Add 1 day to include the entire end date
                const endDateTime = new Date(endDate);
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
          "paymentMethod",
          "closedAt"
        FROM "${tenantSchema}"."sales"
        ${whereClause}
        ORDER BY "closedAt" DESC
      `, ...params);
            // Converter valores
            const converted = sales.map(sale => ({
                ...sale,
                subtotal: parseFloat(sale.subtotal),
                discountRate: parseFloat(sale.discountRate),
                discountAmount: parseFloat(sale.discountAmount),
                tipRate: parseFloat(sale.tipRate),
                tipAmount: parseFloat(sale.tipAmount),
                taxRate: parseFloat(sale.taxRate),
                taxAmount: parseFloat(sale.taxAmount),
                total: parseFloat(sale.total),
            }));
            // Labels
            const deliveryTypeLabels = {
                dine_in: 'Mesa/Salão',
                delivery: 'Delivery',
                takeout: 'Para Viagem',
            };
            const paymentMethodLabels = {
                cash: 'Dinheiro',
                credit_card: 'Cartão de Crédito',
                debit_card: 'Cartão de Débito',
                pix: 'PIX',
            };
            // Construir CSV manualmente
            let csv = 'ID,Data/Hora,Tipo de Entrega,Mesa,Cliente,Telefone,Subtotal,Taxa Desconto (%),Desconto (R$),Taxa Gorjeta (%),Gorjeta (R$),Taxa Imposto (%),Imposto (R$),Total,Forma de Pagamento\n';
            for (const sale of converted) {
                const row = [
                    sale.id.substring(0, 8),
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
        }
        catch (error) {
            console.error('Erro ao exportar CSV:', error);
            res.status(500).json({ error: 'Erro ao exportar CSV' });
        }
    }
    // Imprimir recibo individual de uma venda (estilo nota fiscal)
    async printReceipt(req, res) {
        try {
            const { id } = req.params;
            const tenantSchema = req.tenantSchema;
            const db = (0, database_1.getTenantClient)(tenantSchema);
            // Buscar configurações da empresa
            const settingsResult = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."company_settings"
        WHERE "id" = 'default'
        LIMIT 1
      `);
            const settings = settingsResult[0] || {
                companyName: 'Minha Empresa',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                phone: '',
                email: '',
                cnpj: '',
            };
            // Buscar venda com itens
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
      `, id);
            if (!sales || sales.length === 0) {
                res.status(404).json({ error: 'Venda não encontrada' });
                return;
            }
            const sale = sales[0];
            // Converter valores
            const converted = {
                ...sale,
                saleNumber: Number(sale.saleNumber),
                subtotal: parseFloat(sale.subtotal || 0),
                discountRate: parseFloat(sale.discountRate || 0),
                discountAmount: parseFloat(sale.discountAmount || 0),
                tipRate: parseFloat(sale.tipRate || 0),
                tipAmount: parseFloat(sale.tipAmount || 0),
                taxRate: parseFloat(sale.taxRate || 0),
                taxAmount: parseFloat(sale.taxAmount || 0),
                total: parseFloat(sale.total),
                amountPaid: parseFloat(sale.amountPaid || 0),
                changeAmount: parseFloat(sale.changeAmount || 0),
            };
            // Criar PDF
            const doc = new pdfkit_1.default({
                size: [226.77, 841.89], // 80mm width (thermal printer), variable height
                margins: { top: 10, bottom: 10, left: 10, right: 10 },
            });
            // Configurar headers de resposta
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="recibo_${converted.saleNumber}.pdf"`);
            // Pipe do PDF para a resposta
            doc.pipe(res);
            const pageWidth = 226.77;
            const centerX = pageWidth / 2;
            // Cabeçalho da empresa
            doc.fontSize(12).font('Helvetica-Bold').text(settings.companyName, { align: 'center' });
            doc.moveDown(0.3);
            if (settings.cnpj) {
                doc.fontSize(8).font('Helvetica').text(`CNPJ: ${settings.cnpj}`, { align: 'center' });
            }
            if (settings.address) {
                doc.fontSize(8).text(settings.address, { align: 'center' });
            }
            if (settings.city || settings.state || settings.zipCode) {
                const locationParts = [];
                if (settings.city)
                    locationParts.push(settings.city);
                if (settings.state)
                    locationParts.push(settings.state);
                if (settings.zipCode)
                    locationParts.push(`CEP: ${settings.zipCode}`);
                doc.fontSize(8).text(locationParts.join(' - '), { align: 'center' });
            }
            if (settings.phone) {
                doc.fontSize(8).text(`Tel: ${settings.phone}`, { align: 'center' });
            }
            if (settings.email) {
                doc.fontSize(8).text(settings.email, { align: 'center' });
            }
            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(pageWidth - 10, doc.y).stroke();
            doc.moveDown(0.5);
            // Título
            doc.fontSize(11).font('Helvetica-Bold').text('RECIBO DE VENDA', { align: 'center' });
            doc.moveDown(0.5);
            // Informações da venda
            doc.fontSize(8).font('Helvetica');
            doc.text(`Nº: ${converted.saleNumber}`, { align: 'center' });
            doc.text(`Data: ${new Date(converted.closedAt).toLocaleString('pt-BR')}`, { align: 'center' });
            if (converted.tableNumber) {
                doc.text(`Mesa: ${converted.tableNumber}`, { align: 'center' });
            }
            if (converted.customerName) {
                doc.text(`Cliente: ${converted.customerName}`, { align: 'center' });
            }
            if (converted.customerPhone) {
                doc.text(`Telefone: ${converted.customerPhone}`, { align: 'center' });
            }
            const deliveryTypeLabels = {
                dine_in: 'Mesa/Salão',
                delivery: 'Delivery',
                takeout: 'Para Viagem',
            };
            doc.text(`Tipo: ${deliveryTypeLabels[converted.deliveryType] || converted.deliveryType}`, { align: 'center' });
            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(pageWidth - 10, doc.y).stroke();
            doc.moveDown(0.5);
            // Itens
            doc.fontSize(9).font('Helvetica-Bold').text('ITENS', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(7).font('Helvetica');
            // Parse items (can be array of orders or simple items)
            const items = converted.items || [];
            // If stripe payment, items is simple array
            if (converted.paymentMethod === 'stripe_card') {
                for (const item of items) {
                    const qty = item.quantity || 1;
                    const unitPrice = parseFloat(item.unitPrice || 0);
                    const totalPrice = parseFloat(item.totalPrice || 0);
                    doc.font('Helvetica-Bold').text(item.productName, { align: 'left' });
                    doc.font('Helvetica').text(`  ${qty} x R$ ${unitPrice.toFixed(2)} = R$ ${totalPrice.toFixed(2)}`, { align: 'left' });
                    if (item.notes) {
                        doc.fontSize(6).text(`  Obs: ${item.notes}`, { align: 'left' });
                        doc.fontSize(7);
                    }
                    doc.moveDown(0.2);
                }
            }
            else {
                // Regular payment - items is array of orders
                for (const order of items) {
                    if (order.items && Array.isArray(order.items)) {
                        for (const item of order.items) {
                            const qty = item.quantity || 1;
                            const unitPrice = parseFloat(item.unitPrice || 0);
                            const totalPrice = parseFloat(item.totalPrice || 0);
                            doc.font('Helvetica-Bold').text(item.productName, { align: 'left' });
                            doc.font('Helvetica').text(`  ${qty} x R$ ${unitPrice.toFixed(2)} = R$ ${totalPrice.toFixed(2)}`, { align: 'left' });
                            if (item.notes) {
                                doc.fontSize(6).text(`  Obs: ${item.notes}`, { align: 'left' });
                                doc.fontSize(7);
                            }
                            doc.moveDown(0.2);
                        }
                    }
                }
            }
            doc.moveDown(0.3);
            doc.moveTo(10, doc.y).lineTo(pageWidth - 10, doc.y).stroke();
            doc.moveDown(0.3);
            // Totais
            doc.fontSize(8).font('Helvetica');
            doc.text(`Subtotal: R$ ${converted.subtotal.toFixed(2)}`, { align: 'right' });
            if (converted.discountAmount > 0) {
                doc.text(`Desconto (${converted.discountRate.toFixed(2)}%): -R$ ${converted.discountAmount.toFixed(2)}`, { align: 'right' });
            }
            if (converted.tipAmount > 0) {
                doc.text(`Gorjeta (${converted.tipRate.toFixed(2)}%): +R$ ${converted.tipAmount.toFixed(2)}`, { align: 'right' });
            }
            if (converted.taxAmount > 0) {
                doc.text(`Imposto (${converted.taxRate.toFixed(2)}%): +R$ ${converted.taxAmount.toFixed(2)}`, { align: 'right' });
            }
            doc.moveDown(0.3);
            doc.moveTo(10, doc.y).lineTo(pageWidth - 10, doc.y).stroke();
            doc.moveDown(0.3);
            // Total
            doc.fontSize(11).font('Helvetica-Bold');
            doc.text(`TOTAL: R$ ${converted.total.toFixed(2)}`, { align: 'center' });
            doc.moveDown(0.3);
            // Forma de pagamento
            const paymentMethodLabels = {
                cash: 'Dinheiro',
                credit_card: 'Cartão de Crédito',
                debit_card: 'Cartão de Débito',
                pix: 'PIX',
                stripe_card: 'Cartão (Stripe)',
                transfer: 'Transferência',
            };
            doc.fontSize(8).font('Helvetica');
            doc.text(`Pagamento: ${paymentMethodLabels[converted.paymentMethod] || converted.paymentMethod}`, { align: 'center' });
            if (converted.amountPaid > 0) {
                doc.moveDown(0.2);
                doc.text(`Valor Pago: R$ ${converted.amountPaid.toFixed(2)}`, { align: 'center' });
                doc.text(`Troco: R$ ${converted.changeAmount.toFixed(2)}`, { align: 'center' });
            }
            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(pageWidth - 10, doc.y).stroke();
            doc.moveDown(0.5);
            // Rodapé
            doc.fontSize(7).font('Helvetica').text('Obrigado pela preferência!', { align: 'center' });
            doc.fontSize(6).text('Este não é um documento fiscal', { align: 'center' });
            doc.moveDown(0.3);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
            // Finalizar PDF
            doc.end();
        }
        catch (error) {
            console.error('Erro ao imprimir recibo:', error);
            res.status(500).json({ error: 'Erro ao imprimir recibo' });
        }
    }
}
exports.SalesController = SalesController;
//# sourceMappingURL=SalesController.js.map
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { getTenantClient } from '@/utils/database';

export class TabsController {
  // Listar comandas abertas
  async listOpen(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { deliveryType } = req.query;

      const whereConditions: string[] = [`t.status = 'open'`];
      const params: any[] = [];

      if (deliveryType) {
        whereConditions.push(`t."deliveryType" = $${params.length + 1}`);
        params.push(deliveryType);
      }

      const tabs = await db.$queryRawUnsafe(`
        SELECT t.*,
          (
            SELECT json_agg(
              json_build_object(
                'id', o.id,
                'orderNumber', o."orderNumber",
                'status', o.status,
                'notes', o.notes,
                'createdAt', o."createdAt",
                'items', (
                  SELECT json_agg(
                    json_build_object(
                      'id', oi.id,
                      'productId', oi."productId",
                      'productName', oi."productName",
                      'quantity', oi.quantity,
                      'unitPrice', oi."unitPrice",
                      'totalPrice', oi."totalPrice",
                      'notes', oi.notes
                    )
                  )
                  FROM "${tenantSchema}"."order_items" oi
                  WHERE oi."orderId" = o.id
                )
              ) ORDER BY o."createdAt" ASC
            )
            FROM "${tenantSchema}"."orders" o
            WHERE o."tabId" = t.id
          ) as orders
        FROM "${tenantSchema}"."tabs" t
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY t."createdAt" DESC
      `, ...params);

      // Converter BigInt para Number
      const tabsConverted = (tabs as any[]).map(tab => ({
        ...tab,
        orders: tab.orders?.map((order: any) => ({
          ...order,
          orderNumber: Number(order.orderNumber)
        })) || []
      }));

      res.json(tabsConverted);
    } catch (error) {
      console.error('Erro ao listar comandas:', error);
      res.status(500).json({ error: 'Erro ao listar comandas' });
    }
  }

  // Buscar ou criar comanda
  async findOrCreate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const { tableNumber, deliveryType, customerName, customerPhone } = req.body;

      // Verificar se já existe comanda aberta para a mesa/delivery
      let existingTabs;
      if (deliveryType === 'dine_in' && tableNumber) {
        existingTabs = await db.$queryRawUnsafe(`
          SELECT * FROM "${tenantSchema}"."tabs"
          WHERE "tableNumber" = $1 AND "deliveryType" = $2 AND status = 'open'
          LIMIT 1
        `, tableNumber, deliveryType);
      } else if (deliveryType === 'delivery' && customerPhone) {
        existingTabs = await db.$queryRawUnsafe(`
          SELECT * FROM "${tenantSchema}"."tabs"
          WHERE "customerPhone" = $1 AND "deliveryType" = $2 AND status = 'open'
          LIMIT 1
        `, customerPhone, deliveryType);
      }

      if (existingTabs && (existingTabs as any[]).length > 0) {
        res.json((existingTabs as any[])[0]);
        return;
      }

      // Criar nova comanda
      const tabId = uuidv4();
      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."tabs" (
          id, "tableNumber", "deliveryType", "customerName", "customerPhone", status, total,
          "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 'open', 0,
          CURRENT_TIMESTAMP
        )
      `,
        tabId,
        tableNumber || null,
        deliveryType || 'dine_in',
        customerName || null,
        customerPhone || null
      );

      const newTabs = await db.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."tabs" WHERE id = $1
      `, tabId);

      res.status(201).json((newTabs as any[])[0]);
    } catch (error) {
      console.error('Erro ao buscar/criar comanda:', error);
      res.status(500).json({ error: 'Erro ao buscar/criar comanda' });
    }
  }

  // Adicionar pedido à comanda
  async addOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tabId } = req.params;
      const { items, notes } = req.body;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      if (!items || items.length === 0) {
        res.status(400).json({ error: 'O pedido deve ter pelo menos um item' });
        return;
      }

      const orderId = uuidv4();

      // Criar pedido
      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."orders" (
          id, "tabId", status, notes, subtotal, total, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, 'pending', $3, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, orderId, tabId, notes || null);

      // Inserir itens
      let orderTotal = 0;
      for (const item of items) {
        const totalPrice = parseFloat(item.unitPrice) * parseInt(item.quantity);
        orderTotal += totalPrice;

        await db.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}"."order_items" (
            id, "orderId", "productId", "productName", quantity,
            "unitPrice", "totalPrice", notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          uuidv4(),
          orderId,
          item.productId,
          item.productName,
          parseInt(item.quantity),
          parseFloat(item.unitPrice),
          totalPrice,
          item.notes || null
        );
      }

      // Atualizar total da comanda
      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."tabs"
        SET total = total + $1
        WHERE id = $2
      `, orderTotal, tabId);

      res.status(201).json({ success: true, orderId });
    } catch (error) {
      console.error('Erro ao adicionar pedido:', error);
      res.status(500).json({ error: 'Erro ao adicionar pedido' });
    }
  }

  // Marcar pedido como entregue
  async markOrderDelivered(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."orders"
        SET status = 'delivered', "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $1
      `, orderId);

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao marcar pedido como entregue:', error);
      res.status(500).json({ error: 'Erro ao marcar pedido como entregue' });
    }
  }

  // Fechar conta
  async closeTab(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tabId } = req.params;
      const { paymentMethod, discount, tip, taxRate, amountPaid } = req.body;
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      if (!paymentMethod) {
        res.status(400).json({ error: 'Forma de pagamento é obrigatória' });
        return;
      }

      const discountRate = discount ? parseFloat(discount) : 0;
      const tipRate = tip ? parseFloat(tip) : 0;
      const taxRateValue = taxRate ? parseFloat(taxRate) : 0;
      const amountPaidValue = amountPaid ? parseFloat(amountPaid) : 0;

      // Buscar dados completos da comanda antes de fechar
      const tabData = await db.$queryRawUnsafe(`
        SELECT t.*,
          (
            SELECT json_agg(
              json_build_object(
                'id', o.id,
                'orderNumber', o."orderNumber",
                'status', o.status,
                'notes', o.notes,
                'createdAt', o."createdAt",
                'items', (
                  SELECT json_agg(
                    json_build_object(
                      'id', oi.id,
                      'productId', oi."productId",
                      'productName', oi."productName",
                      'quantity', oi.quantity,
                      'unitPrice', oi."unitPrice",
                      'totalPrice', oi."totalPrice",
                      'notes', oi.notes
                    )
                  )
                  FROM "${tenantSchema}"."order_items" oi
                  WHERE oi."orderId" = o.id
                )
              ) ORDER BY o."createdAt" ASC
            )
            FROM "${tenantSchema}"."orders" o
            WHERE o."tabId" = t.id
          ) as orders
        FROM "${tenantSchema}"."tabs" t
        WHERE t.id = $1
      `, tabId) as any[];

      if (!tabData || tabData.length === 0) {
        res.status(404).json({ error: 'Comanda não encontrada' });
        return;
      }

      const tab = tabData[0];
      const subtotal = parseFloat(tab.total || '0');

      // Calcular valores baseados em porcentagens
      const discountAmount = subtotal * (discountRate / 100);
      const tipAmount = subtotal * (tipRate / 100);
      const taxAmount = subtotal * (taxRateValue / 100);

      // Calcular total: subtotal - desconto + gorjeta + imposto
      const total = subtotal - discountAmount + tipAmount + taxAmount;

      // Calcular troco
      const changeAmount = amountPaidValue > 0 ? amountPaidValue - total : 0;

      // Salvar venda no histórico
      const saleId = uuidv4();
      await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."sales" (
          id, "tabId", "tableNumber", "deliveryType", "customerName", "customerPhone",
          subtotal, "discountRate", "discountAmount", "tipRate", "tipAmount", "taxRate", "taxAmount",
          total, "amountPaid", "changeAmount", "paymentMethod", items, "createdAt", "closedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19, CURRENT_TIMESTAMP
        )
      `,
        saleId,
        tabId,
        tab.tableNumber || null,
        tab.deliveryType || 'dine_in',
        tab.customerName || null,
        tab.customerPhone || null,
        subtotal,
        discountRate,
        discountAmount,
        tipRate,
        tipAmount,
        taxRateValue,
        taxAmount,
        total,
        amountPaidValue,
        changeAmount,
        paymentMethod,
        JSON.stringify(tab.orders || []),
        tab.createdAt
      );

      // Fechar comanda
      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."tabs"
        SET status = 'closed',
            "closedAt" = CURRENT_TIMESTAMP,
            "paymentMethod" = $1,
            discount = $2
        WHERE id = $3
      `, paymentMethod, discountAmount, tabId);

      res.json({ success: true, saleId });
    } catch (error) {
      console.error('Erro ao fechar conta:', error);
      res.status(500).json({ error: 'Erro ao fechar conta' });
    }
  }
}

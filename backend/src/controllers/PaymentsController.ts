import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import { AuthRequest } from '../types';
import { z } from 'zod';
import { getTenantClient } from '../utils/database';

// Validation schemas
const createPaymentIntentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  tabId: z.string().optional(),
  orderId: z.string().optional(),
  description: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  tableNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
  paymentMethodId: z.string().optional(),
});

export class PaymentsController {
  /**
   * Create a new Payment Intent
   * POST /api/payments/create-intent
   */
  async createPaymentIntent(req: AuthRequest, res: Response) {
    try {
      // Validate request body
      const validatedData = createPaymentIntentSchema.parse(req.body);

      // Get user info from auth middleware
      const userId = req.user!.id;
      const tenantSchema = req.tenantSchema!;

      // Convert amount to cents (Stripe uses cents)
      const amountInCents = Math.round(validatedData.amount * 100);

      // Build description with order items if tabId is provided
      let enhancedDescription = validatedData.description || 'ChefWell - Pagamento de Pedido';

      if (validatedData.tabId) {
        try {
          const db = getTenantClient(tenantSchema);

          // Fetch tab with orders and items
          const tabData: any = await db.$queryRawUnsafe(`
            SELECT t.*,
              (
                SELECT json_agg(
                  json_build_object(
                    'items', (
                      SELECT json_agg(
                        json_build_object(
                          'productName', oi."productName",
                          'quantity', oi.quantity,
                          'unitPrice', oi."unitPrice"
                        )
                      )
                      FROM "${tenantSchema}"."order_items" oi
                      WHERE oi."orderId" = o.id
                    )
                  )
                )
                FROM "${tenantSchema}"."orders" o
                WHERE o."tabId" = t.id
              ) as orders
            FROM "${tenantSchema}"."tabs" t
            WHERE t.id = $1
            LIMIT 1
          `, validatedData.tabId);

          if (tabData && tabData.length > 0 && tabData[0].orders) {
            // Extract all items from all orders
            const allItems: any[] = [];
            tabData[0].orders.forEach((order: any) => {
              if (order.items && order.items.length > 0) {
                allItems.push(...order.items);
              }
            });

            // Group items by product name and sum quantities
            const itemsMap = new Map<string, { quantity: number; unitPrice: number }>();
            allItems.forEach(item => {
              const existing = itemsMap.get(item.productName);
              if (existing) {
                existing.quantity += item.quantity;
              } else {
                itemsMap.set(item.productName, {
                  quantity: item.quantity,
                  unitPrice: parseFloat(item.unitPrice)
                });
              }
            });

            // Build items description (limit to avoid Stripe's description length limit of 500 chars)
            if (itemsMap.size > 0) {
              const itemsDesc = Array.from(itemsMap.entries())
                .map(([name, data]) => `${data.quantity}x ${name}`)
                .join(', ');

              // Stripe description has a 500 character limit
              const baseDesc = validatedData.description || `Mesa ${validatedData.tableNumber || ''}`;
              const fullDesc = `${baseDesc} - ${itemsDesc}`;

              enhancedDescription = fullDesc.length > 500
                ? fullDesc.substring(0, 497) + '...'
                : fullDesc;

              console.log(`📝 Payment description enhanced with ${itemsMap.size} item(s): ${enhancedDescription}`);
            }
          }
        } catch (itemsError) {
          // If fetching items fails, just log and continue with original description
          console.warn('⚠️ Could not fetch tab items for description:', itemsError);
        }
      }

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: amountInCents,
        currency: 'brl',
        metadata: {
          userId,
          tenantSchema,
          tabId: validatedData.tabId,
          orderId: validatedData.orderId,
          customerEmail: validatedData.customerEmail,
          customerName: validatedData.customerName,
          tableNumber: validatedData.tableNumber,
          phoneNumber: validatedData.phoneNumber,
        },
        description: enhancedDescription,
        customerEmail: validatedData.customerEmail,
      }, tenantSchema);

      // Save payment intent to database
      const db = getTenantClient(tenantSchema);
      await db.$executeRawUnsafe(
        `
        INSERT INTO "${tenantSchema}"."stripe_payments"
        ("id", "paymentIntentId", "tabId", "amount", "currency", "status", "metadata", "stripeResponse", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW(), NOW())
        `,
        crypto.randomUUID(),
        paymentIntent.id,
        validatedData.tabId || null,
        validatedData.amount,
        paymentIntent.currency,
        stripeService.convertStatus(paymentIntent.status),
        JSON.stringify(paymentIntent.metadata),
        JSON.stringify({
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
        })
      );

      res.json({
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          amount: validatedData.amount,
          currency: paymentIntent.currency,
        },
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment intent',
      });
    }
  }

  /**
   * Get Payment Intent details
   * GET /api/payments/:paymentIntentId
   */
  async getPaymentIntent(req: AuthRequest, res: Response) {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Intent ID is required',
        });
      }

      // Get tenant schema
      const tenantSchema = req.tenantSchema!;

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId, tenantSchema);

      // Get payment record from database
      const db = getTenantClient(tenantSchema);

      const paymentRecords: any[] = await db.$queryRawUnsafe(
        `
        SELECT * FROM "${tenantSchema}"."stripe_payments"
        WHERE "paymentIntentId" = $1
        LIMIT 1
        `,
        paymentIntentId
      );

      res.json({
        success: true,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents to currency
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: paymentIntent.metadata,
          paymentMethod: paymentIntent.payment_method,
          dbRecord: paymentRecords.length > 0 ? paymentRecords[0] : null,
        },
      });
    } catch (error: any) {
      console.error('Error retrieving payment intent:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve payment intent',
      });
    }
  }

  /**
   * Confirm a Payment Intent (backend confirmation)
   * POST /api/payments/confirm
   */
  async confirmPayment(req: AuthRequest, res: Response) {
    try {
      // Validate request body
      const validatedData = confirmPaymentSchema.parse(req.body);

      // Get tenant schema
      const tenantSchema = req.tenantSchema!;

      // Confirm payment intent
      const paymentIntent = await stripeService.confirmPaymentIntent(
        validatedData.paymentIntentId,
        tenantSchema,
        validatedData.paymentMethodId
      );

      // Update database record
      const db = getTenantClient(tenantSchema);

      await db.$executeRawUnsafe(
        `
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = $1,
            "paymentMethod" = $2,
            "stripeResponse" = $3::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $4
        `,
        stripeService.convertStatus(paymentIntent.status),
        paymentIntent.payment_method?.toString() || null,
        JSON.stringify(paymentIntent),
        paymentIntent.id
      );

      res.json({
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
        },
      });
    } catch (error: any) {
      console.error('Error confirming payment:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to confirm payment',
      });
    }
  }

  /**
   * Cancel a Payment Intent
   * POST /api/payments/:paymentIntentId/cancel
   */
  async cancelPayment(req: AuthRequest, res: Response) {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Intent ID is required',
        });
      }

      // Get tenant schema
      const tenantSchema = req.tenantSchema!;

      // Cancel payment intent
      const paymentIntent = await stripeService.cancelPaymentIntent(paymentIntentId, tenantSchema);

      // Update database record
      const db = getTenantClient(tenantSchema);

      await db.$executeRawUnsafe(
        `
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = $1,
            "stripeResponse" = $2::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $3
        `,
        'canceled',
        JSON.stringify(paymentIntent),
        paymentIntent.id
      );

      res.json({
        success: true,
        message: 'Payment canceled successfully',
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      });
    } catch (error: any) {
      console.error('Error canceling payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel payment',
      });
    }
  }

  /**
   * Create a refund
   * POST /api/payments/:paymentIntentId/refund
   */
  async createRefund(req: AuthRequest, res: Response) {
    try {
      const { paymentIntentId } = req.params;
      const { amount, reason } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Intent ID is required',
        });
      }

      // Get tenant schema
      const tenantSchema = req.tenantSchema!;

      // Convert amount to cents if provided
      const amountInCents = amount ? Math.round(amount * 100) : undefined;

      // Create refund
      const refund = await stripeService.createRefund(
        paymentIntentId,
        tenantSchema,
        amountInCents,
        reason
      );

      // Update database record
      const db = getTenantClient(tenantSchema);

      await db.$executeRawUnsafe(
        `
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = 'refunded',
            "stripeResponse" = $1::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $2
        `,
        JSON.stringify({ refund }),
        paymentIntentId
      );

      res.json({
        success: true,
        message: 'Refund created successfully',
        data: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
        },
      });
    } catch (error: any) {
      console.error('Error creating refund:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create refund',
      });
    }
  }

  /**
   * Complete payment and close tab
   * POST /api/payments/complete
   */
  async completePayment(req: AuthRequest, res: Response) {
    try {
      const { paymentIntentId, tabId } = req.body;

      if (!paymentIntentId || !tabId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Intent ID and Tab ID are required',
        });
      }

      // Get tenant schema
      const tenantSchema = req.tenantSchema!;

      // Retrieve payment intent from Stripe to verify status
      const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId, tenantSchema);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: `Payment status is ${paymentIntent.status}, not succeeded`,
        });
      }
      const db = getTenantClient(tenantSchema);

      // Get tab details
      const tabs: any[] = await db.$queryRawUnsafe(
        `SELECT * FROM "${tenantSchema}"."tabs" WHERE "id" = $1 LIMIT 1`,
        tabId
      );

      if (tabs.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tab not found',
        });
      }

      const tab = tabs[0];

      if (tab.status === 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Tab is already closed',
        });
      }

      const totalAmount = parseFloat(tab.total || '0');
      const amountPaid = paymentIntent.amount / 100; // Convert from cents

      // Update payment record in database
      await db.$executeRawUnsafe(
        `
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = 'succeeded',
            "paymentMethod" = $1,
            "stripeResponse" = $2::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $3
        `,
        paymentIntent.payment_method?.toString() || null,
        JSON.stringify(paymentIntent),
        paymentIntentId
      );

      // Create sale record
      await db.$executeRawUnsafe(
        `
        INSERT INTO "${tenantSchema}"."sales"
        ("id", "total", "subtotal", "paymentMethod", "status", "deliveryType", "tableNumber", "phoneNumber", "discountRate", "discountAmount", "tipRate", "tipAmount", "taxRate", "taxAmount", "createdAt", "closedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        `,
        crypto.randomUUID(),
        totalAmount,
        totalAmount,
        'stripe',
        'completed',
        tab.deliveryType || 'dine_in',
        tab.tableNumber || null,
        tab.phoneNumber || null,
        0, // discountRate
        0, // discountAmount
        0, // tipRate
        0, // tipAmount
        0, // taxRate
        0  // taxAmount
      );

      // Close the tab
      await db.$executeRawUnsafe(
        `
        UPDATE "${tenantSchema}"."tabs"
        SET "status" = 'closed',
            "closedAt" = NOW()
        WHERE "id" = $1
        `,
        tabId
      );

      res.json({
        success: true,
        message: 'Payment completed and tab closed successfully',
        data: {
          paymentIntentId: paymentIntent.id,
          tabId: tabId,
          amount: amountPaid,
          status: 'closed',
        },
      });
    } catch (error: any) {
      console.error('Error completing payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete payment',
      });
    }
  }

  /**
   * Get publishable key (for frontend)
   * GET /api/payments/config
   */
  async getConfig(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        data: {
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          currency: process.env.STRIPE_CURRENCY || 'brl',
        },
      });
    } catch (error: any) {
      console.error('Error getting Stripe config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get configuration',
      });
    }
  }
}

export const paymentsController = new PaymentsController();

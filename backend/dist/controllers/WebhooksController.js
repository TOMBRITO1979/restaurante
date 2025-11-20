"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksController = exports.WebhooksController = void 0;
const stripe_1 = require("../config/stripe");
const database_1 = require("../utils/database");
const stripe_2 = __importDefault(require("stripe"));
class WebhooksController {
    /**
     * Handle Stripe webhook events
     * POST /api/webhooks/stripe
     *
     * IMPORTANT: This route must be PUBLIC (no authentication middleware)
     * Stripe needs to be able to send events directly
     *
     * NOTE: We cannot verify signature immediately because we need tenantSchema from metadata
     * This is a limitation but metadata is signed within the event so it's still secure
     */
    async handleStripeWebhook(req, res) {
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            console.error('No stripe-signature header present');
            return res.status(400).send('Webhook Error: No signature header');
        }
        let event;
        try {
            // Parse event without signature verification first to get tenantSchema
            const rawEvent = JSON.parse(req.body.toString());
            const metadata = rawEvent.data?.object?.metadata;
            const tenantSchema = metadata?.tenantSchema;
            if (!tenantSchema) {
                console.error('No tenantSchema in event metadata');
                return res.status(400).send('Webhook Error: Missing tenantSchema in metadata');
            }
            // Get tenant-specific webhook secret
            const config = await (0, stripe_1.getStripeConfig)(tenantSchema);
            // Now verify signature with tenant-specific secret
            const stripeClient = new stripe_2.default(config.secretKey, {
                apiVersion: '2025-02-24.acacia',
                typescript: true,
            });
            event = stripeClient.webhooks.constructEvent(req.body, sig, config.webhookSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        console.log(`✅ Webhook received: ${event.type}`);
        // Handle the event
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentIntentSucceeded(event.data.object);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentIntentFailed(event.data.object);
                    break;
                case 'payment_intent.canceled':
                    await this.handlePaymentIntentCanceled(event.data.object);
                    break;
                case 'charge.refunded':
                    await this.handleChargeRefunded(event.data.object);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
            res.json({ received: true });
        }
        catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).send(`Webhook Error: ${error.message}`);
        }
    }
    /**
     * Handle successful payment
     */
    async handlePaymentIntentSucceeded(paymentIntent) {
        console.log('💰 Payment succeeded:', paymentIntent.id);
        const metadata = paymentIntent.metadata;
        const tenantSchema = metadata.tenantSchema;
        if (!tenantSchema) {
            console.error('No tenantSchema in payment intent metadata');
            return;
        }
        const db = (0, database_1.getTenantClient)(tenantSchema);
        try {
            // Update payment record status
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = 'succeeded',
            "paymentMethod" = $1,
            "stripeResponse" = $2::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $3
        `, paymentIntent.payment_method?.toString() || null, JSON.stringify(paymentIntent), paymentIntent.id);
            // If associated with a tab, mark it as paid
            if (metadata.tabId) {
                await this.closeTabWithStripePayment(tenantSchema, metadata.tabId, paymentIntent.id, paymentIntent.amount / 100 // Convert from cents
                );
            }
            console.log(`✅ Payment ${paymentIntent.id} marked as succeeded`);
        }
        catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }
    /**
     * Handle failed payment
     */
    async handlePaymentIntentFailed(paymentIntent) {
        console.log('❌ Payment failed:', paymentIntent.id);
        const metadata = paymentIntent.metadata;
        const tenantSchema = metadata.tenantSchema;
        if (!tenantSchema) {
            console.error('No tenantSchema in payment intent metadata');
            return;
        }
        const db = (0, database_1.getTenantClient)(tenantSchema);
        try {
            // Update payment record status
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = 'failed',
            "stripeResponse" = $1::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $2
        `, JSON.stringify(paymentIntent), paymentIntent.id);
            console.log(`❌ Payment ${paymentIntent.id} marked as failed`);
        }
        catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }
    /**
     * Handle canceled payment
     */
    async handlePaymentIntentCanceled(paymentIntent) {
        console.log('🚫 Payment canceled:', paymentIntent.id);
        const metadata = paymentIntent.metadata;
        const tenantSchema = metadata.tenantSchema;
        if (!tenantSchema) {
            console.error('No tenantSchema in payment intent metadata');
            return;
        }
        const db = (0, database_1.getTenantClient)(tenantSchema);
        try {
            // Update payment record status
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = 'canceled',
            "stripeResponse" = $1::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $2
        `, JSON.stringify(paymentIntent), paymentIntent.id);
            console.log(`🚫 Payment ${paymentIntent.id} marked as canceled`);
        }
        catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }
    /**
     * Handle refunded charge
     */
    async handleChargeRefunded(charge) {
        console.log('💸 Charge refunded:', charge.id);
        const paymentIntentId = charge.payment_intent?.toString();
        if (!paymentIntentId) {
            console.error('No payment intent associated with charge');
            return;
        }
        // For charge.refunded, we don't have metadata in the charge object
        // We need to get it from our database using the paymentIntentId
        // First, find the tenant schema from our stripe_payments table
        // This requires querying all tenant schemas - not ideal but necessary for refunds
        // TODO: Consider storing tenant mapping in a global table
        const tenantSchema = await this.findTenantByPaymentIntent(paymentIntentId);
        if (!tenantSchema) {
            console.error('Could not find tenant for payment intent:', paymentIntentId);
            return;
        }
        const db = (0, database_1.getTenantClient)(tenantSchema);
        try {
            // Update payment record status
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."stripe_payments"
        SET "status" = 'refunded',
            "stripeResponse" = $1::jsonb,
            "updatedAt" = NOW()
        WHERE "paymentIntentId" = $2
        `, JSON.stringify({ charge, refunds: charge.refunds }), paymentIntentId);
            console.log(`💸 Payment ${paymentIntentId} marked as refunded`);
        }
        catch (error) {
            console.error('Error updating refund status:', error);
            throw error;
        }
    }
    /**
     * Close tab with Stripe payment
     */
    async closeTabWithStripePayment(tenantSchema, tabId, paymentIntentId, amount) {
        const db = (0, database_1.getTenantClient)(tenantSchema);
        try {
            // Get tab details
            const tabs = await db.$queryRawUnsafe(`SELECT * FROM "${tenantSchema}"."tabs" WHERE "id" = $1`, tabId);
            if (tabs.length === 0) {
                console.error(`Tab ${tabId} not found`);
                return;
            }
            const tab = tabs[0];
            // Check if tab is already closed
            if (tab.status === 'closed') {
                console.log(`Tab ${tabId} already closed`);
                return;
            }
            // Close the tab and create sales record
            const salesId = crypto.randomUUID();
            // Get tab items with product details from order_items
            const tabItems = await db.$queryRawUnsafe(`
        SELECT
          oi."productId",
          oi."productName",
          oi."quantity",
          oi."unitPrice",
          oi."totalPrice"
        FROM "${tenantSchema}"."order_items" oi
        INNER JOIN "${tenantSchema}"."orders" o ON oi."orderId" = o."id"
        WHERE o."tabId" = $1
        `, tabId);
            // Format items for sales record
            const items = tabItems.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice || '0'),
                totalPrice: parseFloat(item.totalPrice || '0')
            }));
            // Insert into sales table
            await db.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."sales"
        ("id", "tabId", "tableNumber", "customerPhone", "deliveryType", "subtotal", "total",
         "taxRate", "taxAmount", "discountRate", "discountAmount", "tipRate", "tipAmount",
         "paymentMethod", "stripePaymentId", "items", "createdAt", "closedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, NOW(), NOW())
        `, salesId, tabId, tab.tableNumber || null, tab.customerPhone || null, tab.deliveryType || 'dine_in', parseFloat(tab.total || '0'), amount, 0, // taxRate
            0, // taxAmount
            0, // discountRate
            0, // discountAmount
            0, // tipRate
            0, // tipAmount
            'stripe_card', paymentIntentId, JSON.stringify(items));
            // Update tab status to closed
            await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."tabs"
        SET "status" = 'closed',
            "closedAt" = NOW()
        WHERE "id" = $1
        `, tabId);
            console.log(`✅ Tab ${tabId} closed with Stripe payment ${paymentIntentId}`);
        }
        catch (error) {
            console.error('Error closing tab with Stripe payment:', error);
            throw error;
        }
    }
    /**
     * Find tenant schema by payment intent ID
     * Searches all tenant schemas for the payment intent
     */
    async findTenantByPaymentIntent(paymentIntentId) {
        try {
            // Get list of all tenant schemas from public.companies
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const companies = await prisma.$queryRaw `
        SELECT "schema" FROM "public"."companies"
        WHERE "schema" IS NOT NULL AND "schema" != ''
      `;
            // Search each tenant schema for the payment intent
            for (const company of companies) {
                const tenantSchema = company.schema;
                const db = (0, database_1.getTenantClient)(tenantSchema);
                try {
                    const payments = await db.$queryRawUnsafe(`SELECT "id" FROM "${tenantSchema}"."stripe_payments"
             WHERE "paymentIntentId" = $1
             LIMIT 1`, paymentIntentId);
                    if (payments.length > 0) {
                        await prisma.$disconnect();
                        return tenantSchema;
                    }
                }
                catch (err) {
                    // Schema might not have stripe_payments table yet, continue
                    continue;
                }
            }
            await prisma.$disconnect();
            return null;
        }
        catch (error) {
            console.error('Error finding tenant by payment intent:', error);
            return null;
        }
    }
}
exports.WebhooksController = WebhooksController;
exports.webhooksController = new WebhooksController();
//# sourceMappingURL=WebhooksController.js.map
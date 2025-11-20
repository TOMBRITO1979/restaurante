"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeConfig = exports.stripe = void 0;
exports.getStripeConfig = getStripeConfig;
exports.getStripeClient = getStripeClient;
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("../utils/database");
dotenv_1.default.config();
// Validate Stripe configuration (fallback only)
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not set in environment - multi-tenant config required');
}
// Default Stripe client (uses environment variables as fallback)
exports.stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia',
        typescript: true,
    })
    : null;
// Stripe configuration (fallback)
exports.stripeConfig = {
    currency: process.env.STRIPE_CURRENCY || 'brl',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};
/**
 * Get Stripe configuration for a specific tenant
 * Falls back to environment variables if tenant has no config
 */
async function getStripeConfig(tenantSchema) {
    try {
        const db = (0, database_1.getTenantClient)(tenantSchema);
        // Try to get tenant-specific configuration
        const settings = await db.$queryRawUnsafe(`
      SELECT
        "stripeSecretKey",
        "stripePublishableKey",
        "stripeWebhookSecret",
        "isActive"
      FROM "${tenantSchema}"."payment_settings"
      WHERE "id" = 'default' AND "isActive" = true
      LIMIT 1
    `);
        // If tenant has active configuration, use it
        if (settings.length > 0 && settings[0].stripeSecretKey) {
            console.log(`✅ Using tenant-specific Stripe config for ${tenantSchema}`);
            return {
                secretKey: settings[0].stripeSecretKey,
                publishableKey: settings[0].stripePublishableKey || '',
                webhookSecret: settings[0].stripeWebhookSecret || '',
                currency: process.env.STRIPE_CURRENCY || 'brl',
            };
        }
    }
    catch (error) {
        console.warn(`⚠️  Error fetching tenant Stripe config for ${tenantSchema}:`, error);
    }
    // Fallback to environment variables
    console.log(`📋 Using environment Stripe config for ${tenantSchema} (fallback)`);
    return {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        currency: process.env.STRIPE_CURRENCY || 'brl',
    };
}
/**
 * Get Stripe client instance for a specific tenant
 * Creates a new instance with tenant-specific keys or uses fallback
 */
async function getStripeClient(tenantSchema) {
    const config = await getStripeConfig(tenantSchema);
    if (!config.secretKey) {
        throw new Error('Stripe secret key not configured for tenant and no fallback available');
    }
    return new stripe_1.default(config.secretKey, {
        apiVersion: '2025-02-24.acacia',
        typescript: true,
    });
}
//# sourceMappingURL=stripe.js.map
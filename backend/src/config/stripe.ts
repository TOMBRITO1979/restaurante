import Stripe from 'stripe';
import dotenv from 'dotenv';
import { getTenantClient } from '../utils/database';

dotenv.config();

// Validate Stripe configuration (fallback only)
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set in environment - multi-tenant config required');
}

// Default Stripe client (uses environment variables as fallback)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null;

// Stripe configuration (fallback)
export const stripeConfig = {
  currency: process.env.STRIPE_CURRENCY || 'brl',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

/**
 * Get Stripe configuration for a specific tenant
 * Falls back to environment variables if tenant has no config
 */
export async function getStripeConfig(tenantSchema: string): Promise<{
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  currency: string;
}> {
  try {
    const db = getTenantClient(tenantSchema);

    // Try to get tenant-specific configuration
    const settings: any[] = await db.$queryRawUnsafe(`
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
  } catch (error) {
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
export async function getStripeClient(tenantSchema: string): Promise<Stripe> {
  const config = await getStripeConfig(tenantSchema);

  if (!config.secretKey) {
    throw new Error('Stripe secret key not configured for tenant and no fallback available');
  }

  return new Stripe(config.secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
}

// Export types for better TypeScript support
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeCustomer = Stripe.Customer;
export type StripeCharge = Stripe.Charge;
export type StripeRefund = Stripe.Refund;

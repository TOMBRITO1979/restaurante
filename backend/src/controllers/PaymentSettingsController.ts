import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { z } from 'zod';
import { getTenantClient } from '../utils/database';
import Stripe from 'stripe';

// Validation schemas
const paymentSettingsSchema = z.object({
  provider: z.enum(['stripe']).default('stripe'),
  stripeSecretKey: z.string().min(1, 'Stripe Secret Key is required').regex(/^sk_(test_|live_)[a-zA-Z0-9]+$/, 'Invalid Stripe Secret Key format'),
  stripePublishableKey: z.string().min(1, 'Stripe Publishable Key is required').regex(/^pk_(test_|live_)[a-zA-Z0-9]+$/, 'Invalid Stripe Publishable Key format'),
  stripeWebhookSecret: z.string().optional(),
  testMode: z.boolean().default(true),
  isActive: z.boolean().default(false),
});

export class PaymentSettingsController {
  /**
   * Get payment settings for current tenant
   * GET /api/payment-settings
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      const settings: any[] = await db.$queryRawUnsafe(`
        SELECT
          "id",
          "provider",
          "stripePublishableKey",
          "isActive",
          "testMode",
          "createdAt",
          "updatedAt"
        FROM "${tenantSchema}"."payment_settings"
        WHERE "id" = 'default'
      `);

      if (settings.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'No payment settings configured'
        });
      }

      // Don't expose secret keys in GET request
      res.json({
        success: true,
        data: settings[0]
      });
    } catch (error: any) {
      console.error('Error fetching payment settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment settings',
        error: error.message
      });
    }
  }

  /**
   * Update payment settings for current tenant
   * PUT /api/payment-settings
   * Requires ADMIN role
   */
  async update(req: AuthRequest, res: Response) {
    try {
      // Validate request body
      const validatedData = paymentSettingsSchema.parse(req.body);

      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      // Validate Stripe keys by attempting to create a client
      try {
        const stripeClient = new Stripe(validatedData.stripeSecretKey, {
          apiVersion: '2025-02-24.acacia',
        });

        // Test the key by fetching account info
        await stripeClient.balance.retrieve();
      } catch (stripeError: any) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Stripe credentials',
          error: stripeError.message
        });
      }

      // Validate that test/live mode matches the keys
      const isTestKey = validatedData.stripeSecretKey.startsWith('sk_test_');
      if (validatedData.testMode !== isTestKey) {
        return res.status(400).json({
          success: false,
          message: validatedData.testMode
            ? 'You are in test mode but provided live keys'
            : 'You are in live mode but provided test keys'
        });
      }

      // Check if settings exist
      const existing: any[] = await db.$queryRawUnsafe(`
        SELECT "id" FROM "${tenantSchema}"."payment_settings"
        WHERE "id" = 'default'
      `);

      if (existing.length === 0) {
        // Insert new settings
        await db.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}"."payment_settings"
          ("id", "provider", "stripeSecretKey", "stripePublishableKey", "stripeWebhookSecret", "testMode", "isActive", "createdAt", "updatedAt")
          VALUES ('default', $1, $2, $3, $4, $5, $6, NOW(), NOW())
        `,
          validatedData.provider,
          validatedData.stripeSecretKey,
          validatedData.stripePublishableKey,
          validatedData.stripeWebhookSecret || null,
          validatedData.testMode,
          validatedData.isActive
        );
      } else {
        // Update existing settings
        await db.$executeRawUnsafe(`
          UPDATE "${tenantSchema}"."payment_settings"
          SET "provider" = $1,
              "stripeSecretKey" = $2,
              "stripePublishableKey" = $3,
              "stripeWebhookSecret" = $4,
              "testMode" = $5,
              "isActive" = $6,
              "updatedAt" = NOW()
          WHERE "id" = 'default'
        `,
          validatedData.provider,
          validatedData.stripeSecretKey,
          validatedData.stripePublishableKey,
          validatedData.stripeWebhookSecret || null,
          validatedData.testMode,
          validatedData.isActive
        );
      }

      // Fetch updated settings (without exposing secret key)
      const updated: any[] = await db.$queryRawUnsafe(`
        SELECT
          "id",
          "provider",
          "stripePublishableKey",
          "isActive",
          "testMode",
          "createdAt",
          "updatedAt"
        FROM "${tenantSchema}"."payment_settings"
        WHERE "id" = 'default'
      `);

      res.json({
        success: true,
        data: updated[0],
        message: 'Payment settings updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating payment settings:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update payment settings',
        error: error.message
      });
    }
  }

  /**
   * Test Stripe connection
   * POST /api/payment-settings/test
   * Requires ADMIN role
   */
  async testConnection(req: AuthRequest, res: Response) {
    try {
      const { secretKey } = req.body;

      if (!secretKey) {
        return res.status(400).json({
          success: false,
          message: 'Secret key is required'
        });
      }

      // Validate key format
      if (!secretKey.match(/^sk_(test_|live_)[a-zA-Z0-9]+$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Stripe secret key format'
        });
      }

      // Test the key
      try {
        const stripeClient = new Stripe(secretKey, {
          apiVersion: '2025-02-24.acacia',
        });

        const balance = await stripeClient.balance.retrieve();
        const account = await stripeClient.accounts.retrieve();

        res.json({
          success: true,
          data: {
            connected: true,
            mode: secretKey.startsWith('sk_test_') ? 'test' : 'live',
            currency: balance.available[0]?.currency || 'brl',
            accountId: account.id,
            accountName: account.business_profile?.name || account.email
          },
          message: 'Stripe connection successful'
        });
      } catch (stripeError: any) {
        res.status(400).json({
          success: false,
          message: 'Stripe connection failed',
          error: stripeError.message
        });
      }
    } catch (error: any) {
      console.error('Error testing Stripe connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        error: error.message
      });
    }
  }

  /**
   * Delete payment settings
   * DELETE /api/payment-settings
   * Requires ADMIN role
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const tenantSchema = req.tenantSchema!;
      const db = getTenantClient(tenantSchema);

      // Set settings to inactive instead of deleting
      await db.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."payment_settings"
        SET "isActive" = false,
            "updatedAt" = NOW()
        WHERE "id" = 'default'
      `);

      res.json({
        success: true,
        message: 'Payment settings deactivated successfully'
      });
    } catch (error: any) {
      console.error('Error deleting payment settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment settings',
        error: error.message
      });
    }
  }
}

export const paymentSettingsController = new PaymentSettingsController();

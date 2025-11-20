import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class PaymentSettingsController {
    /**
     * Get payment settings for current tenant
     * GET /api/payment-settings
     */
    get(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update payment settings for current tenant
     * PUT /api/payment-settings
     * Requires ADMIN role
     */
    update(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Test Stripe connection
     * POST /api/payment-settings/test
     * Requires ADMIN role
     */
    testConnection(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delete payment settings
     * DELETE /api/payment-settings
     * Requires ADMIN role
     */
    delete(req: AuthRequest, res: Response): Promise<void>;
}
export declare const paymentSettingsController: PaymentSettingsController;
//# sourceMappingURL=PaymentSettingsController.d.ts.map
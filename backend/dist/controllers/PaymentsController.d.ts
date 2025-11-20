import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class PaymentsController {
    /**
     * Create a new Payment Intent
     * POST /api/payments/create-intent
     */
    createPaymentIntent(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get Payment Intent details
     * GET /api/payments/:paymentIntentId
     */
    getPaymentIntent(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Confirm a Payment Intent (backend confirmation)
     * POST /api/payments/confirm
     */
    confirmPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Cancel a Payment Intent
     * POST /api/payments/:paymentIntentId/cancel
     */
    cancelPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Create a refund
     * POST /api/payments/:paymentIntentId/refund
     */
    createRefund(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Complete payment and close tab
     * POST /api/payments/complete
     */
    completePayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get publishable key (for frontend)
     * GET /api/payments/config
     */
    getConfig(req: Request, res: Response): Promise<void>;
}
export declare const paymentsController: PaymentsController;
//# sourceMappingURL=PaymentsController.d.ts.map
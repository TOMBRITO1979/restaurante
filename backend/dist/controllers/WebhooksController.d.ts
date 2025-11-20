import { Request, Response } from 'express';
export declare class WebhooksController {
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
    handleStripeWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Handle successful payment
     */
    private handlePaymentIntentSucceeded;
    /**
     * Handle failed payment
     */
    private handlePaymentIntentFailed;
    /**
     * Handle canceled payment
     */
    private handlePaymentIntentCanceled;
    /**
     * Handle refunded charge
     */
    private handleChargeRefunded;
    /**
     * Close tab with Stripe payment
     */
    private closeTabWithStripePayment;
    /**
     * Find tenant schema by payment intent ID
     * Searches all tenant schemas for the payment intent
     */
    private findTenantByPaymentIntent;
}
export declare const webhooksController: WebhooksController;
//# sourceMappingURL=WebhooksController.d.ts.map
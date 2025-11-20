import { CreatePaymentIntentRequest, PaymentIntentResponse, StripePaymentStatus } from '../types/stripe';
import Stripe from 'stripe';
export declare class StripeService {
    /**
     * Create a Payment Intent
     * @param request Payment intent creation data
     * @param tenantSchema Tenant schema to get Stripe configuration
     * @returns Payment intent with client secret
     */
    createPaymentIntent(request: CreatePaymentIntentRequest, tenantSchema: string): Promise<PaymentIntentResponse>;
    /**
     * Retrieve a Payment Intent by ID
     * @param paymentIntentId Stripe Payment Intent ID
     * @param tenantSchema Tenant schema
     * @returns Payment Intent details
     */
    retrievePaymentIntent(paymentIntentId: string, tenantSchema: string): Promise<Stripe.PaymentIntent>;
    /**
     * Confirm a Payment Intent
     * @param paymentIntentId Payment Intent ID
     * @param tenantSchema Tenant schema
     * @param paymentMethodId Optional payment method ID
     * @returns Confirmed Payment Intent
     */
    confirmPaymentIntent(paymentIntentId: string, tenantSchema: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent>;
    /**
     * Cancel a Payment Intent
     * @param paymentIntentId Payment Intent ID
     * @param tenantSchema Tenant schema
     * @returns Canceled Payment Intent
     */
    cancelPaymentIntent(paymentIntentId: string, tenantSchema: string): Promise<Stripe.PaymentIntent>;
    /**
     * Create a Refund
     * @param chargeId Charge ID or Payment Intent ID
     * @param tenantSchema Tenant schema
     * @param amount Amount to refund in cents (optional, full refund if not specified)
     * @param reason Refund reason
     * @returns Refund object
     */
    createRefund(chargeId: string, tenantSchema: string, amount?: number, reason?: Stripe.RefundCreateParams.Reason): Promise<Stripe.Refund>;
    /**
     * Find or create a Stripe customer by email or name
     * @param stripeClient Stripe client instance
     * @param email Customer email (optional)
     * @param name Customer name (optional)
     * @returns Stripe Customer
     */
    private findOrCreateCustomer;
    /**
     * Get payment method details
     * @param paymentMethodId Payment Method ID
     * @param tenantSchema Tenant schema
     * @returns Payment Method details
     */
    getPaymentMethod(paymentMethodId: string, tenantSchema: string): Promise<Stripe.PaymentMethod>;
    /**
     * Convert Payment Intent status to internal status
     * @param stripeStatus Stripe Payment Intent status
     * @returns Internal payment status
     */
    convertStatus(stripeStatus: Stripe.PaymentIntent.Status): StripePaymentStatus;
}
export declare const stripeService: StripeService;
//# sourceMappingURL=stripeService.d.ts.map
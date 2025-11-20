import Stripe from 'stripe';
export declare const stripe: Stripe | null;
export declare const stripeConfig: {
    currency: string;
    publishableKey: string;
    webhookSecret: string;
};
/**
 * Get Stripe configuration for a specific tenant
 * Falls back to environment variables if tenant has no config
 */
export declare function getStripeConfig(tenantSchema: string): Promise<{
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    currency: string;
}>;
/**
 * Get Stripe client instance for a specific tenant
 * Creates a new instance with tenant-specific keys or uses fallback
 */
export declare function getStripeClient(tenantSchema: string): Promise<Stripe>;
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeCustomer = Stripe.Customer;
export type StripeCharge = Stripe.Charge;
export type StripeRefund = Stripe.Refund;
//# sourceMappingURL=stripe.d.ts.map
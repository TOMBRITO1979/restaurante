import Stripe from 'stripe';
export interface PaymentIntentMetadata {
    tabId?: string;
    orderId?: string;
    userId: string;
    tenantSchema: string;
    customerEmail?: string;
    customerName?: string;
    tableNumber?: string;
    phoneNumber?: string;
}
export interface CreatePaymentIntentRequest {
    amount: number;
    currency?: string;
    metadata: PaymentIntentMetadata;
    description?: string;
    customerEmail?: string;
    customerId?: string;
}
export interface PaymentIntentResponse {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: Stripe.PaymentIntent.Status;
    metadata: PaymentIntentMetadata;
}
export interface ConfirmPaymentRequest {
    paymentIntentId: string;
    paymentMethodId?: string;
}
export declare enum StripePaymentStatus {
    PENDING = "pending",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    CANCELED = "canceled",
    REFUNDED = "refunded"
}
export declare enum StripeWebhookEvent {
    PAYMENT_INTENT_SUCCEEDED = "payment_intent.succeeded",
    PAYMENT_INTENT_FAILED = "payment_intent.payment_failed",
    PAYMENT_INTENT_CANCELED = "payment_intent.canceled",
    CHARGE_REFUNDED = "charge.refunded"
}
export interface StripePaymentRecord {
    id: string;
    paymentIntentId: string;
    tabId?: string;
    orderId?: string;
    amount: number;
    currency: string;
    status: StripePaymentStatus;
    paymentMethod?: string;
    metadata: any;
    stripeResponse: any;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=stripe.d.ts.map
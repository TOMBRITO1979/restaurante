import Stripe from 'stripe';

// Payment Intent Metadata
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

// Create Payment Intent Request
export interface CreatePaymentIntentRequest {
  amount: number; // In cents (e.g., 1000 = R$ 10.00)
  currency?: string;
  metadata: PaymentIntentMetadata;
  description?: string;
  customerEmail?: string;
  customerId?: string;
}

// Payment Intent Response
export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: Stripe.PaymentIntent.Status;
  metadata: PaymentIntentMetadata;
}

// Confirm Payment Request
export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
}

// Stripe Payment Status
export enum StripePaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

// Stripe Webhook Event Types
export enum StripeWebhookEvent {
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED = 'payment_intent.payment_failed',
  PAYMENT_INTENT_CANCELED = 'payment_intent.canceled',
  CHARGE_REFUNDED = 'charge.refunded',
}

// Database Stripe Payment Record
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

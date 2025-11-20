"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeService = exports.StripeService = void 0;
const stripe_1 = require("../config/stripe");
const stripe_2 = require("../types/stripe");
class StripeService {
    /**
     * Create a Payment Intent
     * @param request Payment intent creation data
     * @param tenantSchema Tenant schema to get Stripe configuration
     * @returns Payment intent with client secret
     */
    async createPaymentIntent(request, tenantSchema) {
        try {
            const { amount, currency, metadata, description, customerEmail, customerId } = request;
            // Validate amount (must be positive and in cents)
            if (amount <= 0) {
                throw new Error('Payment amount must be greater than zero');
            }
            // Get tenant-specific Stripe client and config
            const stripeClient = await (0, stripe_1.getStripeClient)(tenantSchema);
            const config = await (0, stripe_1.getStripeConfig)(tenantSchema);
            // Create or retrieve customer if email or name provided
            let stripeCustomerId = customerId;
            if (!customerId && (customerEmail || metadata.customerName)) {
                console.log(`👤 Creating/finding customer - Email: ${customerEmail || 'N/A'}, Name: ${metadata.customerName || 'N/A'}`);
                const customer = await this.findOrCreateCustomer(stripeClient, customerEmail, metadata.customerName);
                stripeCustomerId = customer.id;
                console.log(`✅ Customer created/found: ${customer.id} - ${customer.name || customer.email || 'Anonymous'}`);
            }
            else {
                console.log(`⏭️ Skipping customer creation - customerId: ${customerId}, email: ${customerEmail}, name: ${metadata.customerName}`);
            }
            // Create payment intent
            const paymentIntent = await stripeClient.paymentIntents.create({
                amount: Math.round(amount), // Ensure it's an integer
                currency: currency || config.currency,
                customer: stripeCustomerId,
                description: description || 'ChefWell - Pagamento de Pedido',
                metadata: {
                    ...metadata,
                    tenantSchema: metadata.tenantSchema,
                    userId: metadata.userId,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            return {
                id: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                metadata: metadata,
            };
        }
        catch (error) {
            console.error('Error creating payment intent:', error);
            throw new Error(`Failed to create payment intent: ${error.message}`);
        }
    }
    /**
     * Retrieve a Payment Intent by ID
     * @param paymentIntentId Stripe Payment Intent ID
     * @param tenantSchema Tenant schema
     * @returns Payment Intent details
     */
    async retrievePaymentIntent(paymentIntentId, tenantSchema) {
        try {
            const stripeClient = await (0, stripe_1.getStripeClient)(tenantSchema);
            return await stripeClient.paymentIntents.retrieve(paymentIntentId);
        }
        catch (error) {
            console.error('Error retrieving payment intent:', error);
            throw new Error(`Failed to retrieve payment intent: ${error.message}`);
        }
    }
    /**
     * Confirm a Payment Intent
     * @param paymentIntentId Payment Intent ID
     * @param tenantSchema Tenant schema
     * @param paymentMethodId Optional payment method ID
     * @returns Confirmed Payment Intent
     */
    async confirmPaymentIntent(paymentIntentId, tenantSchema, paymentMethodId) {
        try {
            const stripeClient = await (0, stripe_1.getStripeClient)(tenantSchema);
            const params = {};
            if (paymentMethodId) {
                params.payment_method = paymentMethodId;
            }
            return await stripeClient.paymentIntents.confirm(paymentIntentId, params);
        }
        catch (error) {
            console.error('Error confirming payment intent:', error);
            throw new Error(`Failed to confirm payment: ${error.message}`);
        }
    }
    /**
     * Cancel a Payment Intent
     * @param paymentIntentId Payment Intent ID
     * @param tenantSchema Tenant schema
     * @returns Canceled Payment Intent
     */
    async cancelPaymentIntent(paymentIntentId, tenantSchema) {
        try {
            const stripeClient = await (0, stripe_1.getStripeClient)(tenantSchema);
            return await stripeClient.paymentIntents.cancel(paymentIntentId);
        }
        catch (error) {
            console.error('Error canceling payment intent:', error);
            throw new Error(`Failed to cancel payment: ${error.message}`);
        }
    }
    /**
     * Create a Refund
     * @param chargeId Charge ID or Payment Intent ID
     * @param tenantSchema Tenant schema
     * @param amount Amount to refund in cents (optional, full refund if not specified)
     * @param reason Refund reason
     * @returns Refund object
     */
    async createRefund(chargeId, tenantSchema, amount, reason) {
        try {
            const stripeClient = await (0, stripe_1.getStripeClient)(tenantSchema);
            const params = {
                payment_intent: chargeId,
            };
            if (amount) {
                params.amount = Math.round(amount);
            }
            if (reason) {
                params.reason = reason;
            }
            return await stripeClient.refunds.create(params);
        }
        catch (error) {
            console.error('Error creating refund:', error);
            throw new Error(`Failed to create refund: ${error.message}`);
        }
    }
    /**
     * Find or create a Stripe customer by email or name
     * @param stripeClient Stripe client instance
     * @param email Customer email (optional)
     * @param name Customer name (optional)
     * @returns Stripe Customer
     */
    async findOrCreateCustomer(stripeClient, email, name) {
        try {
            // Search for existing customer by email if provided
            if (email) {
                const existingCustomers = await stripeClient.customers.list({
                    email: email,
                    limit: 1,
                });
                if (existingCustomers.data.length > 0) {
                    return existingCustomers.data[0];
                }
            }
            // Create new customer with available info
            const customerData = {};
            if (email)
                customerData.email = email;
            if (name)
                customerData.name = name;
            return await stripeClient.customers.create(customerData);
        }
        catch (error) {
            console.error('Error finding/creating customer:', error);
            throw new Error(`Failed to find or create customer: ${error.message}`);
        }
    }
    /**
     * Get payment method details
     * @param paymentMethodId Payment Method ID
     * @param tenantSchema Tenant schema
     * @returns Payment Method details
     */
    async getPaymentMethod(paymentMethodId, tenantSchema) {
        try {
            const stripeClient = await (0, stripe_1.getStripeClient)(tenantSchema);
            return await stripeClient.paymentMethods.retrieve(paymentMethodId);
        }
        catch (error) {
            console.error('Error retrieving payment method:', error);
            throw new Error(`Failed to retrieve payment method: ${error.message}`);
        }
    }
    /**
     * Convert Payment Intent status to internal status
     * @param stripeStatus Stripe Payment Intent status
     * @returns Internal payment status
     */
    convertStatus(stripeStatus) {
        switch (stripeStatus) {
            case 'succeeded':
                return stripe_2.StripePaymentStatus.SUCCEEDED;
            case 'canceled':
                return stripe_2.StripePaymentStatus.CANCELED;
            case 'processing':
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
                return stripe_2.StripePaymentStatus.PENDING;
            default:
                return stripe_2.StripePaymentStatus.FAILED;
        }
    }
}
exports.StripeService = StripeService;
// Export singleton instance
exports.stripeService = new StripeService();
//# sourceMappingURL=stripeService.js.map
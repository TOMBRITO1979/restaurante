"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookEvent = exports.StripePaymentStatus = void 0;
// Stripe Payment Status
var StripePaymentStatus;
(function (StripePaymentStatus) {
    StripePaymentStatus["PENDING"] = "pending";
    StripePaymentStatus["SUCCEEDED"] = "succeeded";
    StripePaymentStatus["FAILED"] = "failed";
    StripePaymentStatus["CANCELED"] = "canceled";
    StripePaymentStatus["REFUNDED"] = "refunded";
})(StripePaymentStatus || (exports.StripePaymentStatus = StripePaymentStatus = {}));
// Stripe Webhook Event Types
var StripeWebhookEvent;
(function (StripeWebhookEvent) {
    StripeWebhookEvent["PAYMENT_INTENT_SUCCEEDED"] = "payment_intent.succeeded";
    StripeWebhookEvent["PAYMENT_INTENT_FAILED"] = "payment_intent.payment_failed";
    StripeWebhookEvent["PAYMENT_INTENT_CANCELED"] = "payment_intent.canceled";
    StripeWebhookEvent["CHARGE_REFUNDED"] = "charge.refunded";
})(StripeWebhookEvent || (exports.StripeWebhookEvent = StripeWebhookEvent = {}));
//# sourceMappingURL=stripe.js.map
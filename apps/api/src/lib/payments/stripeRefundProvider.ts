import type { RefundProvider } from "./refundProvider.js";
import { stripeApi } from "./stripeApi.js";

export const stripeRefundProvider: RefundProvider = {
  startRefund: async ({ orderId, amountCents, paymentReference }) => {
    if (!paymentReference) {
      throw new Error("PAYMENT_REFERENCE_MISSING");
    }

    const refund = await stripeApi().refunds.create(
      { payment_intent: paymentReference, amount: amountCents },
      { idempotencyKey: `refund-order-${orderId}` },
    );

    return {
      reference: refund.id,
      settlesImmediately: refund.status === "succeeded",
    };
  },
};

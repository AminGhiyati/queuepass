import { environment } from "../environment.js";
import type { PaymentProvider } from "./paymentProvider.js";
import { stripeApi } from "./stripeApi.js";

const CHECKOUT_CURRENCY = "eur";
const RESERVATION_MINUTES = 30;

function reservationExpiresAt() {
  return Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60;
}

function returnUrlOf(orderId: string, outcome: "success" | "cancelled") {
  return `${environment.USER_CLIENT_URL}/orders/${orderId}?checkout=${outcome}`;
}

export async function expireStripeCheckout(sessionId: string) {
  await stripeApi().checkout.sessions.expire(sessionId);
}

export const stripePaymentProvider: PaymentProvider = {
  startPayment: async ({
    orderId,
    eventId,
    eventTitle,
    buyerEmail,
    quantity,
    unitPriceCents,
  }) => {
    const session = await stripeApi().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: orderId,
        customer_email: buyerEmail,
        expires_at: reservationExpiresAt(),
        line_items: [
          {
            quantity,
            price_data: {
              currency: CHECKOUT_CURRENCY,
              unit_amount: unitPriceCents,
              product_data: { name: eventTitle },
            },
          },
        ],
        metadata: { orderId, eventId },
        payment_intent_data: { metadata: { orderId, eventId } },
        success_url: returnUrlOf(orderId, "success"),
        cancel_url: returnUrlOf(orderId, "cancelled"),
      },
      { idempotencyKey: `order-${orderId}` },
    );

    if (!session.url) {
      throw new Error("STRIPE_SESSION_WITHOUT_URL");
    }

    return {
      provider: "STRIPE",
      reference: session.id,
      settlesImmediately: false,
      redirectUrl: session.url,
    };
  },
};

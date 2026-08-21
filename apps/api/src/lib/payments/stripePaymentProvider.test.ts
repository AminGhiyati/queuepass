import { beforeEach, describe, expect, it, vi } from "vitest";
import { environment } from "../environment.js";
import { stripePaymentProvider } from "./stripePaymentProvider.js";

const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));

vi.mock("./stripeApi.js", () => ({
  stripeApi: () => ({ checkout: { sessions: { create: createSession } } }),
  isStripeConfigured: () => true,
}));

const paymentRequest = {
  orderId: "order-id",
  eventId: "event-id",
  eventTitle: "Harbour Open Air",
  buyerEmail: "anna@example.com",
  quantity: 3,
  unitPriceCents: 2500,
};

function createdSession() {
  return createSession.mock.calls[0]?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  createSession.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/1" });
});

describe("stripePaymentProvider", () => {
  it("sells the tickets of the event as one line item", async () => {
    await stripePaymentProvider.startPayment(paymentRequest);

    expect(createdSession().line_items).toEqual([
      {
        quantity: 3,
        price_data: {
          currency: "eur",
          unit_amount: 2500,
          product_data: { name: "Harbour Open Air" },
        },
      },
    ]);
  });

  it("names the order Stripe is charging for, so the webhook finds it again", async () => {
    await stripePaymentProvider.startPayment(paymentRequest);

    expect(createdSession()).toMatchObject({
      mode: "payment",
      client_reference_id: "order-id",
      customer_email: "anna@example.com",
      metadata: { orderId: "order-id", eventId: "event-id" },
    });
  });

  it("sends the buyer back to their order, whether they paid or cancelled", async () => {
    await stripePaymentProvider.startPayment(paymentRequest);

    expect(createdSession().success_url).toBe(
      `${environment.USER_CLIENT_URL}/orders/order-id?checkout=success`,
    );
    expect(createdSession().cancel_url).toBe(
      `${environment.USER_CLIENT_URL}/orders/order-id?checkout=cancelled`,
    );
  });

  it("lets the reservation expire, so unpaid seats come back", async () => {
    await stripePaymentProvider.startPayment(paymentRequest);

    const secondsFromNow = createdSession().expires_at - Math.floor(Date.now() / 1000);
    expect(secondsFromNow).toBeGreaterThan(0);
    expect(secondsFromNow).toBeLessThanOrEqual(30 * 60);
  });

  it("keeps one session per order, so a retry does not charge twice", async () => {
    await stripePaymentProvider.startPayment(paymentRequest);

    expect(createSession.mock.calls[0]?.[1]).toEqual({ idempotencyKey: "order-order-id" });
  });

  it("hands the hosted payment page to the buyer and leaves the order unpaid", async () => {
    const payment = await stripePaymentProvider.startPayment(paymentRequest);

    expect(payment).toEqual({
      provider: "STRIPE",
      reference: "cs_test_1",
      settlesImmediately: false,
      redirectUrl: "https://checkout.stripe.com/c/pay/1",
    });
  });

  it("refuses a session that has no payment page to send the buyer to", async () => {
    createSession.mockResolvedValue({ id: "cs_test_1", url: null });

    await expect(stripePaymentProvider.startPayment(paymentRequest)).rejects.toThrow(
      "STRIPE_SESSION_WITHOUT_URL",
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentProviderFor } from "./paymentProvider.js";

const { createSession, isStripeConfigured } = vi.hoisted(() => ({
  createSession: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

vi.mock("./stripeApi.js", () => ({
  stripeApi: () => ({ checkout: { sessions: { create: createSession } } }),
  isStripeConfigured,
}));

const paymentRequest = {
  orderId: "order-id",
  eventId: "event-id",
  eventTitle: "Harbour Open Air",
  buyerEmail: "anna@example.com",
  quantity: 1,
  unitPriceCents: 2500,
};

beforeEach(() => {
  vi.clearAllMocks();
  createSession.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/1" });
});

describe("paymentProviderFor", () => {
  it("charges through Stripe once the keys are there", async () => {
    isStripeConfigured.mockReturnValue(true);

    const payment = await paymentProviderFor(2500).startPayment(paymentRequest);

    expect(payment.provider).toBe("STRIPE");
    expect(payment.redirectUrl).toBe("https://checkout.stripe.com/c/pay/1");
    expect(payment.settlesImmediately).toBe(false);
  });

  it("falls back to the simulated payment while Stripe is unconfigured", async () => {
    isStripeConfigured.mockReturnValue(false);

    const payment = await paymentProviderFor(2500).startPayment(paymentRequest);

    expect(payment.provider).toBe("SIMULATED");
    expect(payment.settlesImmediately).toBe(true);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("hands out a free ticket without asking Stripe for money", async () => {
    isStripeConfigured.mockReturnValue(true);

    const payment = await paymentProviderFor(0).startPayment({
      ...paymentRequest,
      unitPriceCents: 0,
    });

    expect(payment.provider).toBe("FREE");
    expect(payment.settlesImmediately).toBe(true);
    expect(payment.redirectUrl).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
  });
});

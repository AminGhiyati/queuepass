import { isStripeConfigured } from "./stripeApi.js";
import { stripePaymentProvider } from "./stripePaymentProvider.js";

export type PaymentRequest = {
  orderId: string;
  eventId: string;
  eventTitle: string;
  buyerEmail: string;
  quantity: number;
  unitPriceCents: number;
};

export type StartedPayment = {
  provider: string;
  reference: string;
  settlesImmediately: boolean;
  redirectUrl: string | null;
};

export type PaymentProvider = {
  startPayment(request: PaymentRequest): Promise<StartedPayment>;
};

export const freeOrderProvider: PaymentProvider = {
  startPayment: async ({ orderId }) => ({
    provider: "FREE",
    reference: `free-${orderId}`,
    settlesImmediately: true,
    redirectUrl: null,
  }),
};

export const simulatedPaymentProvider: PaymentProvider = {
  startPayment: async ({ orderId }) => ({
    provider: "SIMULATED",
    reference: `simulated-${orderId}`,
    settlesImmediately: true,
    redirectUrl: null,
  }),
};

export function paymentProviderFor(totalCents: number): PaymentProvider {
  if (totalCents === 0) {
    return freeOrderProvider;
  }

  return isStripeConfigured() ? stripePaymentProvider : simulatedPaymentProvider;
}

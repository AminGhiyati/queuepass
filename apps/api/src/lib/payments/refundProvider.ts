import { stripeRefundProvider } from "./stripeRefundProvider.js";

export type RefundRequest = {
  orderId: string;
  amountCents: number;
  paymentReference: string | null;
};

export type StartedRefund = {
  reference: string | null;
  settlesImmediately: boolean;
};

export type RefundProvider = {
  startRefund(request: RefundRequest): Promise<StartedRefund>;
};

export const settledRefundProvider: RefundProvider = {
  startRefund: async ({ orderId }) => ({
    reference: `refund-${orderId}`,
    settlesImmediately: true,
  }),
};

export function refundProviderFor(paymentProvider: string): RefundProvider {
  return paymentProvider === "STRIPE"
    ? stripeRefundProvider
    : settledRefundProvider;
}

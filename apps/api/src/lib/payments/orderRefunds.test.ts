import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  markRefundSettled,
  refundLatePaymentOfCancelledOrder,
  refundOrder,
} from "./orderRefunds.js";

const { createRefund } = vi.hoisted(() => ({ createRefund: vi.fn() }));

vi.mock("./stripeApi.js", () => ({
  stripeApi: () => ({ refunds: { create: createRefund } }),
  isStripeConfigured: () => true,
}));

const stripeOrder = {
  id: "order-id",
  totalCents: 7500,
  paymentProvider: "STRIPE",
  paymentReference: "pi_test_1",
};

function prismaWithOrders(updatedRows = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count: updatedRows });
  const findUniqueOrThrow = vi.fn().mockResolvedValue(stripeOrder);

  return {
    updateMany,
    findUniqueOrThrow,
    prisma: { order: { updateMany, findUniqueOrThrow } } as never,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  createRefund.mockResolvedValue({ id: "re_test_1", status: "succeeded" });
});

describe("refundOrder", () => {
  it("pays back the full amount the order was charged", async () => {
    const { prisma } = prismaWithOrders();

    await refundOrder(prisma, stripeOrder);

    expect(createRefund).toHaveBeenCalledWith(
      { payment_intent: "pi_test_1", amount: 7500 },
      { idempotencyKey: "refund-order-order-id" },
    );
  });

  it("records the refund the moment the provider settles it", async () => {
    const { prisma, updateMany } = prismaWithOrders();

    await expect(refundOrder(prisma, stripeOrder)).resolves.toEqual({ wasRefundStarted: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "REFUND_PENDING" },
      data: expect.objectContaining({ status: "REFUNDED", refundReference: "re_test_1" }),
    });
  });

  it("waits for the webhook while the provider is still working on the refund", async () => {
    createRefund.mockResolvedValue({ id: "re_test_1", status: "pending" });
    const { prisma, updateMany } = prismaWithOrders();

    await refundOrder(prisma, stripeOrder);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "REFUND_PENDING" },
      data: { refundReference: "re_test_1" },
    });
  });

  it("refunds a simulated order without asking Stripe", async () => {
    const { prisma, updateMany } = prismaWithOrders();

    await refundOrder(prisma, { ...stripeOrder, paymentProvider: "SIMULATED" });

    expect(createRefund).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) }),
    );
  });

  it("marks a refund that the provider rejected, so nobody thinks the money is back", async () => {
    createRefund.mockRejectedValue(new Error("charge_already_refunded"));
    const { prisma, updateMany } = prismaWithOrders();

    await expect(refundOrder(prisma, stripeOrder)).resolves.toEqual({ wasRefundStarted: false });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "REFUND_PENDING" },
      data: { status: "REFUND_FAILED" },
    });
  });

  it("fails the refund of a payment it cannot address", async () => {
    const { prisma, updateMany } = prismaWithOrders();

    await refundOrder(prisma, { ...stripeOrder, paymentReference: null });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REFUND_FAILED" } }),
    );
  });
});

describe("markRefundSettled", () => {
  it("closes the refund the payment belongs to", async () => {
    const { prisma, updateMany } = prismaWithOrders();

    await expect(markRefundSettled(prisma, "pi_test_1")).resolves.toEqual({ wasSettled: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { paymentReference: "pi_test_1", status: "REFUND_PENDING" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    });
  });

  it("reports nothing settled when no refund waits for that payment", async () => {
    const { prisma } = prismaWithOrders(0);

    await expect(markRefundSettled(prisma, "pi_test_1")).resolves.toEqual({ wasSettled: false });
  });
});

describe("refundLatePaymentOfCancelledOrder", () => {
  const latePayment = { orderId: "order-id", provider: "STRIPE", reference: "pi_test_1" };

  it("sends back money that arrived after the event was cancelled", async () => {
    const { prisma, updateMany } = prismaWithOrders();

    await expect(refundLatePaymentOfCancelledOrder(prisma, latePayment)).resolves.toEqual({
      wasRefundStarted: true,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "CANCELLED" },
      data: { status: "REFUND_PENDING", paymentProvider: "STRIPE", paymentReference: "pi_test_1" },
    });
    expect(createRefund).toHaveBeenCalledOnce();
  });

  it("leaves an order alone that was never cancelled", async () => {
    const { prisma } = prismaWithOrders(0);

    await expect(refundLatePaymentOfCancelledOrder(prisma, latePayment)).resolves.toEqual({
      wasRefundStarted: false,
    });
    expect(createRefund).not.toHaveBeenCalled();
  });
});

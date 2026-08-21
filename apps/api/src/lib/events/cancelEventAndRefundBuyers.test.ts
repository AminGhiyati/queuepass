import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelEventAndRefundBuyers } from "./cancelEventAndRefundBuyers.js";

const { createRefund, expireSession } = vi.hoisted(() => ({
  createRefund: vi.fn(),
  expireSession: vi.fn(),
}));

vi.mock("../payments/stripeApi.js", () => ({
  stripeApi: () => ({
    refunds: { create: createRefund },
    checkout: { sessions: { expire: expireSession } },
  }),
  isStripeConfigured: () => true,
}));

const paidOrder = {
  id: "paid-order",
  totalCents: 5000,
  paymentProvider: "STRIPE",
  paymentReference: "pi_test_1",
};

const openCheckout = {
  id: "open-order",
  totalCents: 2500,
  paymentProvider: "STRIPE",
  paymentReference: "cs_test_1",
  quantity: 1,
};

function prismaWithEvent({ paidOrders = [paidOrder], openCheckouts = [openCheckout] } = {}) {
  const orderFindMany = vi.fn().mockResolvedValueOnce(paidOrders).mockResolvedValueOnce(openCheckouts);
  const orderUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const ticketUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
  const eventUpdate = vi.fn().mockResolvedValue({});
  const transaction = {
    event: { update: eventUpdate },
    ticket: { updateMany: ticketUpdateMany },
    order: { findMany: orderFindMany, updateMany: orderUpdateMany },
  };

  return {
    orderUpdateMany,
    ticketUpdateMany,
    eventUpdate,
    prisma: {
      order: { updateMany: orderUpdateMany },
      $transaction: (run: (client: unknown) => unknown) => run(transaction),
    } as never,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  createRefund.mockResolvedValue({ id: "re_test_1", status: "succeeded" });
  expireSession.mockResolvedValue({});
});

describe("cancelEventAndRefundBuyers", () => {
  it("marks the event as cancelled and voids every valid ticket", async () => {
    const { prisma, eventUpdate, ticketUpdateMany } = prismaWithEvent();

    await cancelEventAndRefundBuyers(prisma, "event-id");

    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { status: "CANCELLED" },
    });
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { eventId: "event-id", status: "VALID" },
      data: { status: "CANCELLED" },
    });
  });

  it("refunds every paid order in full", async () => {
    const { prisma, orderUpdateMany } = prismaWithEvent();

    const summary = await cancelEventAndRefundBuyers(prisma, "event-id");

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { eventId: "event-id", status: "PAID" },
      data: { status: "REFUND_PENDING" },
    });
    expect(createRefund).toHaveBeenCalledWith(
      { payment_intent: "pi_test_1", amount: 5000 },
      { idempotencyKey: "refund-order-paid-order" },
    );
    expect(summary).toEqual({ refundedOrderCount: 1, failedRefundCount: 0, refundedCents: 5000 });
  });

  it("closes an open checkout and puts its seats back", async () => {
    const { prisma, orderUpdateMany, eventUpdate } = prismaWithEvent();

    await cancelEventAndRefundBuyers(prisma, "event-id");

    expect(expireSession).toHaveBeenCalledWith("cs_test_1");
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { eventId: "event-id", status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { soldCount: { decrement: 1 } },
    });
  });

  it("counts a refund the provider rejected, so it can be sorted out by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createRefund.mockRejectedValue(new Error("charge_already_refunded"));
    const { prisma } = prismaWithEvent();

    const summary = await cancelEventAndRefundBuyers(prisma, "event-id");

    expect(summary).toEqual({ refundedOrderCount: 0, failedRefundCount: 1, refundedCents: 0 });
  });

  it("cancels an event nobody bought a ticket for", async () => {
    const { prisma, eventUpdate } = prismaWithEvent({ paidOrders: [], openCheckouts: [] });

    const summary = await cancelEventAndRefundBuyers(prisma, "event-id");

    expect(summary).toEqual({ refundedOrderCount: 0, failedRefundCount: 0, refundedCents: 0 });
    expect(createRefund).not.toHaveBeenCalled();
    expect(eventUpdate).toHaveBeenCalledOnce();
  });
});

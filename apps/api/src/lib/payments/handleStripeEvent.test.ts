import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStripeEvent } from "./handleStripeEvent.js";

const { createRefund } = vi.hoisted(() => ({ createRefund: vi.fn() }));

vi.mock("./stripeApi.js", () => ({
  stripeApi: () => ({ refunds: { create: createRefund } }),
  isStripeConfigured: () => true,
}));

beforeEach(() => {
  vi.clearAllMocks();
  createRefund.mockResolvedValue({ id: "re_test_1", status: "succeeded" });
});

function prismaWithPendingOrder() {
  const orderUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const ticketUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
  const eventUpdate = vi.fn().mockResolvedValue({});
  const transaction = {
    order: {
      updateMany: orderUpdateMany,
      findUniqueOrThrow: vi.fn().mockResolvedValue({ eventId: "event-id", quantity: 2 }),
    },
    ticket: { updateMany: ticketUpdateMany },
    event: { update: eventUpdate },
  };

  return {
    orderUpdateMany,
    eventUpdate,
    prisma: {
      order: { updateMany: orderUpdateMany },
      $transaction: (run: (client: unknown) => unknown) => run(transaction),
    } as never,
  };
}

function stripeEvent(type: string, session: Record<string, unknown>) {
  return { type, data: { object: session } } as unknown as Stripe.Event;
}

const paidSession = {
  id: "cs_test_1",
  client_reference_id: "order-id",
  payment_status: "paid",
  payment_intent: "pi_test_1",
};

describe("handleStripeEvent", () => {
  it("settles the order once the checkout session is paid", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    await handleStripeEvent(prisma, stripeEvent("checkout.session.completed", paidSession));

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: expect.objectContaining({
        status: "PAID",
        paymentProvider: "STRIPE",
        paymentReference: "pi_test_1",
      }),
    });
  });

  it("settles a payment method that only confirms later", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.async_payment_succeeded", paidSession),
    );

    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) }),
    );
  });

  it("keeps the session id as reference while no payment intent exists", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.completed", { ...paidSession, payment_intent: null }),
    );

    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentReference: "cs_test_1" }) }),
    );
  });

  it("finds the order in the metadata when the reference is missing", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.completed", {
        ...paidSession,
        client_reference_id: null,
        metadata: { orderId: "order-id" },
      }),
    );

    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order-id", status: "PENDING" } }),
    );
  });

  it("leaves an order pending while the money has not arrived", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    const outcome = await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.completed", { ...paidSession, payment_status: "unpaid" }),
    );

    expect(outcome).toEqual({ handled: false });
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });

  it("gives the seats back when the session expires unpaid", async () => {
    const { prisma, orderUpdateMany, eventUpdate } = prismaWithPendingOrder();

    await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.expired", { ...paidSession, payment_status: "unpaid" }),
    );

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { soldCount: { decrement: 2 } },
    });
  });

  it("gives the seats back when a late payment fails", async () => {
    const { prisma, eventUpdate } = prismaWithPendingOrder();

    await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.async_payment_failed", paidSession),
    );

    expect(eventUpdate).toHaveBeenCalledOnce();
  });

  it("ignores a session that names no order", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    const outcome = await handleStripeEvent(
      prisma,
      stripeEvent("checkout.session.completed", { ...paidSession, client_reference_id: null }),
    );

    expect(outcome).toEqual({ handled: false });
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });

  it("sends back a payment that arrives after the event was cancelled", async () => {
    const orderUpdateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 1 });
    const prisma = {
      order: {
        updateMany: orderUpdateMany,
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "order-id",
          totalCents: 5000,
          paymentProvider: "STRIPE",
          paymentReference: "pi_test_1",
        }),
      },
    } as never;

    await handleStripeEvent(prisma, stripeEvent("checkout.session.completed", paidSession));

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "CANCELLED" },
      data: expect.objectContaining({ status: "REFUND_PENDING" }),
    });
    expect(createRefund).toHaveBeenCalledWith(
      { payment_intent: "pi_test_1", amount: 5000 },
      { idempotencyKey: "refund-order-order-id" },
    );
  });

  it("closes the refund once the charge is paid back", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    const outcome = await handleStripeEvent(
      prisma,
      stripeEvent("charge.refunded", { id: "ch_test_1", payment_intent: "pi_test_1" }),
    );

    expect(outcome).toEqual({ handled: true });
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { paymentReference: "pi_test_1", status: "REFUND_PENDING" },
      data: expect.objectContaining({ status: "REFUNDED" }),
    });
  });

  it("ignores the events the platform does not act on", async () => {
    const { prisma, orderUpdateMany } = prismaWithPendingOrder();

    const outcome = await handleStripeEvent(prisma, stripeEvent("payment_intent.created", {}));

    expect(outcome).toEqual({ handled: false });
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });
});

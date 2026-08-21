import { beforeEach, describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller } from "../../testing/createTestCaller.js";
import type { AuthenticatedUser } from "../../trpc/context.js";

const { createSession, isStripeConfigured } = vi.hoisted(() => ({
  createSession: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

vi.mock("../../lib/payments/stripeApi.js", () => ({
  stripeApi: () => ({ checkout: { sessions: { create: createSession } } }),
  isStripeConfigured,
}));

type CheckoutStubs = {
  event?: { id: string; title: string; priceCents: number } | null;
  claimedRows?: number;
  feePercent?: number | null;
  currentUser?: AuthenticatedUser | null;
};

function createCheckoutCaller({
  event = { id: "event-id", title: "Harbour Open Air", priceCents: 2500 },
  claimedRows = 1,
  feePercent = 5,
  currentUser = attendeeUser,
}: CheckoutStubs = {}) {
  const orderCreate = vi.fn().mockImplementation(({ data }) =>
    Promise.resolve({ id: "order-id", totalCents: data.totalCents, quantity: data.quantity }),
  );
  const executeRaw = vi.fn().mockResolvedValue(claimedRows);
  const orderUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const cancelOrder = vi.fn().mockResolvedValue({ count: 1 });
  const eventUpdate = vi.fn().mockResolvedValue({});

  const eventFindFirst = vi.fn().mockResolvedValue(event);

  const prisma = {
    event: { findFirst: eventFindFirst },
    platformSettings: {
      findUnique: vi.fn().mockResolvedValue(feePercent === null ? null : { feePercent }),
    },
    order: { updateMany: orderUpdateMany },
    $transaction: (run: (transaction: unknown) => unknown) =>
      run({
        $executeRaw: executeRaw,
        order: {
          create: orderCreate,
          updateMany: cancelOrder,
          findUniqueOrThrow: vi.fn().mockResolvedValue({ eventId: "event-id", quantity: 2 }),
        },
        ticket: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        event: { update: eventUpdate },
      }),
  };

  return {
    orderCreate,
    executeRaw,
    orderUpdateMany,
    cancelOrder,
    eventUpdate,
    eventFindFirst,
    caller: createTestCaller({ currentUser, prisma }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  isStripeConfigured.mockReturnValue(false);
  createSession.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/1" });
});

describe("createOrder", () => {
  it("charges the event price for every ticket", async () => {
    const { caller, orderCreate } = createCheckoutCaller();

    const order = await caller.order.createOrder({ eventId: "event-id", quantity: 3 });

    expect(order.totalCents).toBe(7500);
    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitPriceCents: 2500, totalCents: 7500, quantity: 3 }),
      }),
    );
  });

  it("creates one ticket per bought ticket, each with its own code", async () => {
    const { caller, orderCreate } = createCheckoutCaller();

    await caller.order.createOrder({ eventId: "event-id", quantity: 3 });

    const createdTickets = orderCreate.mock.calls[0]?.[0].data.tickets.create;
    expect(createdTickets).toHaveLength(3);
    expect(new Set(createdTickets.map((ticket: { code: string }) => ticket.code)).size).toBe(3);
  });

  it("snapshots the platform fee onto the order", async () => {
    const { caller, orderCreate } = createCheckoutCaller({ feePercent: 10 });

    await caller.order.createOrder({ eventId: "event-id", quantity: 2 });

    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ platformFeeCents: 500 }) }),
    );
  });

  it("falls back to the default fee when no settings row exists", async () => {
    const { caller, orderCreate } = createCheckoutCaller({ feePercent: null });

    await caller.order.createOrder({ eventId: "event-id", quantity: 1 });

    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ platformFeeCents: 125 }) }),
    );
  });

  it("claims the capacity before writing the order", async () => {
    const { caller, executeRaw } = createCheckoutCaller();

    await caller.order.createOrder({ eventId: "event-id", quantity: 2 });

    expect(executeRaw).toHaveBeenCalledOnce();
  });

  it("refuses the order when the capacity claim finds no room left", async () => {
    const { caller, orderCreate } = createCheckoutCaller({ claimedRows: 0 });

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 2 })).rejects.toThrow(
      expect.objectContaining({ code: "CONFLICT", message: "NOT_ENOUGH_TICKETS_LEFT" }),
    );
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("settles the simulated payment right away", async () => {
    const { caller, orderUpdateMany } = createCheckoutCaller();

    const order = await caller.order.createOrder({ eventId: "event-id", quantity: 1 });

    expect(order.isPaid).toBe(true);
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: expect.objectContaining({ status: "PAID", paymentProvider: "SIMULATED" }),
    });
  });

  it("sends the buyer to Stripe and keeps the order pending", async () => {
    isStripeConfigured.mockReturnValue(true);
    const { caller, orderUpdateMany } = createCheckoutCaller();

    const order = await caller.order.createOrder({ eventId: "event-id", quantity: 2 });

    expect(order.isPaid).toBe(false);
    expect(order.redirectUrl).toBe("https://checkout.stripe.com/c/pay/1");
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: { paymentProvider: "STRIPE", paymentReference: "cs_test_1" },
    });
  });

  it("tells Stripe which event the buyer is paying for", async () => {
    isStripeConfigured.mockReturnValue(true);
    const { caller } = createCheckoutCaller();

    await caller.order.createOrder({ eventId: "event-id", quantity: 2 });

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: attendeeUser.email,
        line_items: [
          expect.objectContaining({
            quantity: 2,
            price_data: expect.objectContaining({
              unit_amount: 2500,
              product_data: { name: "Harbour Open Air" },
            }),
          }),
        ],
      }),
      expect.anything(),
    );
  });

  it("gives the seats back when the payment cannot be started", async () => {
    isStripeConfigured.mockReturnValue(true);
    createSession.mockRejectedValue(new Error("stripe is down"));
    const { caller, cancelOrder, eventUpdate } = createCheckoutCaller();

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 2 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_GATEWAY", message: "PAYMENT_START_FAILED" }),
    );
    expect(cancelOrder).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { soldCount: { decrement: 2 } },
    });
  });

  it("reports why the payment could not be started", async () => {
    isStripeConfigured.mockReturnValue(true);
    const stripeFailure = new Error("stripe rejected the session");
    createSession.mockRejectedValue(stripeFailure);
    const reportedFailures = vi.spyOn(console, "error").mockImplementation(() => {});
    const { caller } = createCheckoutCaller();

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 2 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_GATEWAY" }),
    );
    expect(reportedFailures).toHaveBeenCalledWith(
      expect.stringContaining("order-id"),
      stripeFailure,
    );

    reportedFailures.mockRestore();
  });

  it("keeps a free event free", async () => {
    const { caller, orderCreate, orderUpdateMany } = createCheckoutCaller({
      event: { id: "event-id", title: "Harbour Open Air", priceCents: 0 },
    });

    const order = await caller.order.createOrder({ eventId: "event-id", quantity: 2 });

    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCents: 0, platformFeeCents: 0 }),
      }),
    );
    expect(order.isPaid).toBe(true);
    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID", paymentProvider: "FREE" }),
      }),
    );
  });

  it("keeps a free event free even when Stripe is configured", async () => {
    isStripeConfigured.mockReturnValue(true);
    const { caller } = createCheckoutCaller({
      event: { id: "event-id", title: "Harbour Open Air", priceCents: 0 },
    });

    const order = await caller.order.createOrder({ eventId: "event-id", quantity: 1 });

    expect(order.isPaid).toBe(true);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("refuses an event priced under the chargeable minimum instead of calling the provider", async () => {
    isStripeConfigured.mockReturnValue(true);
    const { caller, orderCreate } = createCheckoutCaller({
      event: { id: "event-id", title: "Harbour Open Air", priceCents: 25 },
    });

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 1 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "PRICE_BELOW_MINIMUM" }),
    );
    expect(orderCreate).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("refuses to sell tickets for an event that is not published", async () => {
    const { caller } = createCheckoutCaller({ event: null });

    await expect(caller.order.createOrder({ eventId: "draft-id", quantity: 1 })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("looks only at events that are not over yet", async () => {
    const { caller, eventFindFirst } = createCheckoutCaller();

    await caller.order.createOrder({ eventId: "event-id", quantity: 1 });

    expect(eventFindFirst.mock.calls[0]?.[0].where.endsAt.gte).toBeInstanceOf(Date);
  });

  it("refuses an order without any ticket", async () => {
    const { caller } = createCheckoutCaller();

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 0 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("caps how many tickets one order may hold", async () => {
    const { caller } = createCheckoutCaller();

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 11 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("requires an account", async () => {
    const caller = createTestCaller();

    await expect(caller.order.createOrder({ eventId: "event-id", quantity: 1 })).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });
});

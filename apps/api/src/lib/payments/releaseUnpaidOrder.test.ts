import { describe, expect, it, vi } from "vitest";
import { releaseUnpaidOrder } from "./releaseUnpaidOrder.js";

function prismaWithPendingOrder(cancelledRows: number) {
  const orderUpdateMany = vi.fn().mockResolvedValue({ count: cancelledRows });
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
    ticketUpdateMany,
    eventUpdate,
    prisma: { $transaction: (run: (client: unknown) => unknown) => run(transaction) } as never,
  };
}

describe("releaseUnpaidOrder", () => {
  it("cancels the order and its tickets", async () => {
    const { prisma, orderUpdateMany, ticketUpdateMany } = prismaWithPendingOrder(1);

    await releaseUnpaidOrder(prisma, "order-id");

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { orderId: "order-id" },
      data: { status: "CANCELLED" },
    });
  });

  it("puts the seats back on sale", async () => {
    const { prisma, eventUpdate } = prismaWithPendingOrder(1);

    await expect(releaseUnpaidOrder(prisma, "order-id")).resolves.toEqual({ wasReleased: true });
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { soldCount: { decrement: 2 } },
    });
  });

  it("leaves an order alone that is no longer pending", async () => {
    const { prisma, ticketUpdateMany, eventUpdate } = prismaWithPendingOrder(0);

    await expect(releaseUnpaidOrder(prisma, "order-id")).resolves.toEqual({ wasReleased: false });
    expect(ticketUpdateMany).not.toHaveBeenCalled();
    expect(eventUpdate).not.toHaveBeenCalled();
  });
});

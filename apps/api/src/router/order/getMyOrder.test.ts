import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller } from "../../testing/createTestCaller.js";

type StoredOrder = {
  id: string;
  status: string;
  quantity: number;
  totalCents: number;
  event: { id: string; title: string };
};

function createOrderCaller(order: StoredOrder | null) {
  const findFirst = vi.fn().mockResolvedValue(order);

  return {
    findFirst,
    caller: createTestCaller({ currentUser: attendeeUser, prisma: { order: { findFirst } } }),
  };
}

const pendingOrder: StoredOrder = {
  id: "order-id",
  status: "PENDING",
  quantity: 2,
  totalCents: 5000,
  event: { id: "event-id", title: "Harbour Open Air" },
};

describe("getMyOrder", () => {
  it("reports an order that is still waiting for the payment", async () => {
    const { caller } = createOrderCaller(pendingOrder);

    await expect(caller.order.getMyOrder({ orderId: "order-id" })).resolves.toEqual({
      id: "order-id",
      status: "PENDING",
      quantity: 2,
      totalCents: 5000,
      isPaid: false,
      eventId: "event-id",
      eventTitle: "Harbour Open Air",
    });
  });

  it("reports an order the payment has settled", async () => {
    const { caller } = createOrderCaller({ ...pendingOrder, status: "PAID" });

    const order = await caller.order.getMyOrder({ orderId: "order-id" });

    expect(order.isPaid).toBe(true);
  });

  it("reads only the orders of the signed in buyer", async () => {
    const { caller, findFirst } = createOrderCaller(pendingOrder);

    await caller.order.getMyOrder({ orderId: "order-id" });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order-id", buyerId: attendeeUser.id } }),
    );
  });

  it("hides the order of somebody else", async () => {
    const { caller } = createOrderCaller(null);

    await expect(caller.order.getMyOrder({ orderId: "order-id" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("requires an account", async () => {
    const caller = createTestCaller();

    await expect(caller.order.getMyOrder({ orderId: "order-id" })).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });
});

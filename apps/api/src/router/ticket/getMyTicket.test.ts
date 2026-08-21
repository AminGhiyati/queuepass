import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller } from "../../testing/createTestCaller.js";
import { storedTicket, type StoredTicket } from "../../testing/ticketFixtures.js";

function callerWithTicket(found: StoredTicket | null) {
  const findFirst = vi.fn().mockResolvedValue(found);

  return {
    findFirst,
    caller: createTestCaller({ currentUser: attendeeUser, prisma: { ticket: { findFirst } } }),
  };
}

describe("getMyTicket", () => {
  it("looks the ticket up scoped to the signed in buyer and a paid order", async () => {
    const { caller, findFirst } = callerWithTicket(storedTicket());

    await caller.ticket.getMyTicket({ ticketId: "ticket-id" });

    expect(findFirst.mock.calls[0]?.[0].where).toEqual({
      id: "ticket-id",
      order: {
        buyerId: attendeeUser.id,
        status: { in: ["PAID", "REFUND_PENDING", "REFUNDED", "REFUND_FAILED"] },
      },
    });
  });

  it("still hands out a refunded ticket, with the refund on it", async () => {
    const { caller } = callerWithTicket(
      storedTicket({
        status: "CANCELLED",
        order: {
          id: "order-id",
          status: "REFUNDED",
          unitPriceCents: 2500,
          refundedAt: new Date("2026-08-15T10:00:00.000Z"),
        },
      }),
    );

    const ticket = await caller.ticket.getMyTicket({ ticketId: "ticket-id" });

    expect(ticket.isValid).toBe(false);
    expect(ticket.orderStatus).toBe("REFUNDED");
    expect(ticket.pricePaidCents).toBe(2500);
  });

  it("hands out the code and the event the ticket belongs to", async () => {
    const { caller } = callerWithTicket(storedTicket());

    const ticket = await caller.ticket.getMyTicket({ ticketId: "ticket-id" });

    expect(ticket.code).toBe("ticket-code");
    expect(ticket.event.title).toBe("Harbour Open Air");
    expect(ticket.event.organizerName).toBe("Clara Vogt");
  });

  it("hides tickets of other buyers behind a not found", async () => {
    const { caller } = callerWithTicket(null);

    await expect(caller.ticket.getMyTicket({ ticketId: "someone-elses" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });
});

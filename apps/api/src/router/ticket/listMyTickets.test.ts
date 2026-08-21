import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller } from "../../testing/createTestCaller.js";
import { storedTicket } from "../../testing/ticketFixtures.js";

function callerWithTickets(tickets = [storedTicket()]) {
  const findMany = vi.fn().mockResolvedValue(tickets);

  return {
    findMany,
    caller: createTestCaller({ currentUser: attendeeUser, prisma: { ticket: { findMany } } }),
  };
}

function queriedTickets(findMany: ReturnType<typeof vi.fn>) {
  return findMany.mock.calls[0]?.[0];
}

describe("listMyTickets", () => {
  it("lists only paid tickets of the signed in buyer", async () => {
    const { caller, findMany } = callerWithTickets();

    await caller.ticket.listMyTickets({ timeframe: "UPCOMING" });

    expect(queriedTickets(findMany).where.order).toEqual({
      buyerId: attendeeUser.id,
      status: { in: ["PAID", "REFUND_PENDING", "REFUNDED", "REFUND_FAILED"] },
    });
  });

  it("keeps a refunded ticket in the list, so the buyer sees the cancellation", async () => {
    const { caller } = callerWithTickets([
      storedTicket({
        status: "CANCELLED",
        event: { ...storedTicket().event, status: "CANCELLED" },
        order: {
          id: "order-id",
          status: "REFUNDED",
          unitPriceCents: 2500,
          refundedAt: new Date("2026-08-15T10:00:00.000Z"),
        },
      }),
    ]);

    const tickets = await caller.ticket.listMyTickets({ timeframe: "UPCOMING" });

    expect(tickets.at(0)?.isValid).toBe(false);
    expect(tickets.at(0)?.orderStatus).toBe("REFUNDED");
    expect(tickets.at(0)?.refundedAt).toEqual(new Date("2026-08-15T10:00:00.000Z"));
  });

  it("leaves out the tickets of events that are over and shows the soonest first", async () => {
    const { caller, findMany } = callerWithTickets();

    await caller.ticket.listMyTickets({ timeframe: "UPCOMING" });

    expect(queriedTickets(findMany).where.event.endsAt.gte).toBeInstanceOf(Date);
    expect(queriedTickets(findMany).orderBy).toEqual([
      { event: { startsAt: "asc" } },
      { createdAt: "asc" },
    ]);
  });

  it("collects the tickets of events that are over, the most recent one first", async () => {
    const { caller, findMany } = callerWithTickets();

    await caller.ticket.listMyTickets({ timeframe: "PAST" });

    expect(queriedTickets(findMany).where.event.endsAt.lt).toBeInstanceOf(Date);
    expect(queriedTickets(findMany).orderBy).toEqual([
      { event: { startsAt: "desc" } },
      { createdAt: "asc" },
    ]);
  });

  it("carries the code so the ticket can be turned into a qr code", async () => {
    const { caller } = callerWithTickets();

    const tickets = await caller.ticket.listMyTickets({ timeframe: "UPCOMING" });

    expect(tickets.at(0)?.code).toBe("ticket-code");
  });

  it("says whether the ticket was already scanned", async () => {
    const { caller } = callerWithTickets([
      storedTicket({ checkedInAt: new Date("2026-09-01T18:30:00.000Z") }),
    ]);

    const tickets = await caller.ticket.listMyTickets({ timeframe: "UPCOMING" });

    expect(tickets.at(0)?.isCheckedIn).toBe(true);
  });

  it("requires an account", async () => {
    const caller = createTestCaller();

    await expect(caller.ticket.listMyTickets({ timeframe: "UPCOMING" })).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });
});

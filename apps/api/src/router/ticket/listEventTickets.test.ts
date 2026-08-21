import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

const soldTicket = {
  id: "ticket-id",
  code: "ticket-code",
  status: "VALID" as const,
  checkedInAt: null,
  order: { id: "order-id", buyer: { name: "Anna Becker", email: "anna@example.com" } },
};

function callerForOwnedEvent(owned: StoredEvent | null, currentUser = organizerUser) {
  const findMany = vi.fn().mockResolvedValue([soldTicket]);
  const prisma = { event: { findFirst: vi.fn().mockResolvedValue(owned) }, ticket: { findMany } };

  return { findMany, caller: createTestCaller({ currentUser, prisma }) };
}

describe("listEventTickets", () => {
  it("lists the buyers of an event the organizer owns", async () => {
    const { caller } = callerForOwnedEvent(storedEvent());

    const tickets = await caller.ticket.listEventTickets({ eventId: "event-id" });

    expect(tickets).toEqual([
      expect.objectContaining({
        buyerName: "Anna Becker",
        buyerEmail: "anna@example.com",
        isCheckedIn: false,
      }),
    ]);
  });

  it("counts only tickets from orders that were charged, refunded ones included", async () => {
    const { caller, findMany } = callerForOwnedEvent(storedEvent());

    await caller.ticket.listEventTickets({ eventId: "event-id" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId: "event-id",
          order: { status: { in: ["PAID", "REFUND_PENDING", "REFUNDED", "REFUND_FAILED"] } },
        },
      }),
    );
  });

  it("hides the attendee list of another organizer", async () => {
    const { caller } = callerForOwnedEvent(null);

    await expect(caller.ticket.listEventTickets({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("keeps attendees out", async () => {
    const { caller } = callerForOwnedEvent(storedEvent(), attendeeUser);

    await expect(caller.ticket.listEventTickets({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

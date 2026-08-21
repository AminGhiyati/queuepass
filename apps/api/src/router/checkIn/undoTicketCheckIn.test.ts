import { describe, expect, it, vi } from "vitest";
import { createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent } from "../../testing/eventFixtures.js";

function undoCaller(updatedRows: number, event = storedEvent()) {
  const updateMany = vi.fn().mockResolvedValue({ count: updatedRows });
  const prisma = {
    event: { findFirst: vi.fn().mockResolvedValue(event) },
    ticket: { updateMany },
  };

  return { updateMany, caller: createTestCaller({ currentUser: organizerUser, prisma }) };
}

describe("undoTicketCheckIn", () => {
  it("clears the check-in of a scanned ticket", async () => {
    const { caller, updateMany } = undoCaller(1);

    await expect(
      caller.checkIn.undoTicketCheckIn({ eventId: "event-id", ticketId: "ticket-id" }),
    ).resolves.toEqual({ ticketId: "ticket-id", isCheckedIn: false });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "ticket-id", eventId: "event-id", checkedInAt: { not: null } },
      data: { checkedInAt: null, checkedInById: null },
    });
  });

  it("reports a ticket that was never scanned as not found", async () => {
    const { caller } = undoCaller(0);

    await expect(
      caller.checkIn.undoTicketCheckIn({ eventId: "event-id", ticketId: "ticket-id" }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("refuses to change the entrance of an event that is over", async () => {
    const eventThatIsOver = storedEvent({
      startsAt: new Date("2020-09-01T18:00:00.000Z"),
      endsAt: new Date("2020-09-02T02:00:00.000Z"),
    });
    const { caller, updateMany } = undoCaller(1, eventThatIsOver);

    await expect(
      caller.checkIn.undoTicketCheckIn({ eventId: "event-id", ticketId: "ticket-id" }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(updateMany).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

type ScannedTicket = {
  eventId: string;
  status: "VALID" | "CANCELLED";
  checkedInAt: Date | null;
  order: { buyer: { name: string } };
} | null;

function scannerCaller({
  owned = storedEvent({ status: "PUBLISHED" }) as StoredEvent | null,
  updatedRows = 1,
  ticket = {
    eventId: "event-id",
    status: "VALID",
    checkedInAt: null,
    order: { buyer: { name: "Anna Becker" } },
  } as ScannedTicket,
  currentUser = organizerUser,
} = {}) {
  const updateMany = vi.fn().mockResolvedValue({ count: updatedRows });
  const findUnique = vi.fn().mockResolvedValue(ticket);

  const prisma = {
    event: { findFirst: vi.fn().mockResolvedValue(owned) },
    ticket: { updateMany, findUnique },
  };

  return { updateMany, caller: createTestCaller({ currentUser, prisma }) };
}

describe("checkInTicket", () => {
  it("lets a valid ticket in and names its buyer", async () => {
    const { caller } = scannerCaller();

    const report = await caller.checkIn.checkInTicket({
      eventId: "event-id",
      code: "ticket-code",
    });

    expect(report.outcome).toBe("CHECKED_IN");
    expect(report.buyerName).toBe("Anna Becker");
    expect(report.checkedInAt).toBeInstanceOf(Date);
  });

  it("only claims a ticket that has not been scanned yet", async () => {
    const { caller, updateMany } = scannerCaller();

    await caller.checkIn.checkInTicket({ eventId: "event-id", code: "ticket-code" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { code: "ticket-code", eventId: "event-id", status: "VALID", checkedInAt: null },
      data: expect.objectContaining({ checkedInById: organizerUser.id }),
    });
  });

  it("rejects a second scan of the same ticket and says when it was used", async () => {
    const alreadyUsedAt = new Date("2026-09-01T18:05:00.000Z");
    const { caller } = scannerCaller({
      updatedRows: 0,
      ticket: {
        eventId: "event-id",
        status: "VALID",
        checkedInAt: alreadyUsedAt,
        order: { buyer: { name: "Anna Becker" } },
      },
    });

    const report = await caller.checkIn.checkInTicket({
      eventId: "event-id",
      code: "ticket-code",
    });

    expect(report.outcome).toBe("ALREADY_CHECKED_IN");
    expect(report.checkedInAt).toEqual(alreadyUsedAt);
  });

  it("rejects a code that belongs to nothing", async () => {
    const { caller } = scannerCaller({ updatedRows: 0, ticket: null });

    const report = await caller.checkIn.checkInTicket({ eventId: "event-id", code: "nonsense" });

    expect(report.outcome).toBe("UNKNOWN_CODE");
    expect(report.buyerName).toBeNull();
  });

  it("rejects a ticket that belongs to another event", async () => {
    const { caller } = scannerCaller({
      updatedRows: 0,
      ticket: {
        eventId: "other-event",
        status: "VALID",
        checkedInAt: null,
        order: { buyer: { name: "Anna Becker" } },
      },
    });

    const report = await caller.checkIn.checkInTicket({
      eventId: "event-id",
      code: "ticket-code",
    });

    expect(report.outcome).toBe("WRONG_EVENT");
  });

  it("rejects a cancelled ticket", async () => {
    const { caller } = scannerCaller({
      updatedRows: 0,
      ticket: {
        eventId: "event-id",
        status: "CANCELLED",
        checkedInAt: null,
        order: { buyer: { name: "Anna Becker" } },
      },
    });

    const report = await caller.checkIn.checkInTicket({
      eventId: "event-id",
      code: "ticket-code",
    });

    expect(report.outcome).toBe("CANCELLED");
  });

  it("refuses to let anybody in once the event is over", async () => {
    const { caller, updateMany } = scannerCaller({
      owned: storedEvent({
        status: "PUBLISHED",
        startsAt: new Date("2020-09-01T18:00:00.000Z"),
        endsAt: new Date("2020-09-02T02:00:00.000Z"),
      }),
    });

    const report = await caller.checkIn.checkInTicket({
      eventId: "event-id",
      code: "ticket-code",
    });

    expect(report.outcome).toBe("EVENT_OVER");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("keeps organizers out of events they do not own", async () => {
    const { caller } = scannerCaller({ owned: null });

    await expect(
      caller.checkIn.checkInTicket({ eventId: "event-id", code: "ticket-code" }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("keeps attendees from scanning", async () => {
    const { caller } = scannerCaller({ currentUser: attendeeUser });

    await expect(
      caller.checkIn.checkInTicket({ eventId: "event-id", code: "ticket-code" }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });
});

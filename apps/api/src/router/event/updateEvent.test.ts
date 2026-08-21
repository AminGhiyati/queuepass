import { describe, expect, it, vi } from "vitest";
import { createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { eventDetails, storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

function callerForOwnedEvent(owned: StoredEvent | null) {
  const findFirst = vi.fn().mockResolvedValue(owned);
  const update = vi.fn().mockResolvedValue(storedEvent());

  return {
    findFirst,
    update,
    caller: createTestCaller({
      currentUser: organizerUser,
      prisma: { event: { findFirst, update } },
    }),
  };
}

describe("updateEvent", () => {
  it("writes the new details of an event the organizer owns", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent());
    const details = { ...eventDetails, title: "Harbour Open Air 2027" };

    await caller.event.updateEvent({ eventId: "event-id", details });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: details }));
  });

  it("keeps a cancelled event unchanged, its buyers were already told", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent({ status: "CANCELLED" }));

    await expect(
      caller.event.updateEvent({ eventId: "event-id", details: eventDetails }),
    ).rejects.toThrow(expect.objectContaining({ message: "EVENT_IS_CANCELLED" }));
    expect(update).not.toHaveBeenCalled();
  });

  it("looks the event up scoped to the signed in organizer", async () => {
    const { caller, findFirst } = callerForOwnedEvent(storedEvent());

    await caller.event.updateEvent({ eventId: "event-id", details: eventDetails });

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "event-id", organizerId: organizerUser.id },
    });
  });

  it("hides events of other organizers behind a not found", async () => {
    const { caller, update } = callerForOwnedEvent(null);

    await expect(
      caller.event.updateEvent({ eventId: "someone-elses-event", details: eventDetails }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses to move the start of an event into the past", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent());

    await expect(
      caller.event.updateEvent({
        eventId: "event-id",
        details: {
          ...eventDetails,
          startsAt: new Date("2020-09-01T18:00:00.000Z"),
          endsAt: new Date("2020-09-02T02:00:00.000Z"),
        },
      }),
    ).rejects.toThrow(expect.objectContaining({ message: "EVENT_STARTS_IN_THE_PAST" }));
    expect(update).not.toHaveBeenCalled();
  });

  it("still corrects the details of an event that has already started", async () => {
    const startedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { caller, update } = callerForOwnedEvent(storedEvent({ startsAt: startedYesterday }));

    await caller.event.updateEvent({
      eventId: "event-id",
      details: { ...eventDetails, startsAt: startedYesterday, description: "Doors at seven." },
    });

    expect(update).toHaveBeenCalledOnce();
  });

  it("refuses to shrink the capacity below the tickets already sold", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent({ soldCount: 120 }));

    await expect(
      caller.event.updateEvent({
        eventId: "event-id",
        details: { ...eventDetails, capacity: 100 },
      }),
    ).rejects.toThrow(expect.objectContaining({ message: "CAPACITY_BELOW_SOLD_TICKETS" }));
    expect(update).not.toHaveBeenCalled();
  });

  it("allows a capacity that exactly matches the tickets already sold", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent({ soldCount: 100 }));

    await caller.event.updateEvent({
      eventId: "event-id",
      details: { ...eventDetails, capacity: 100 },
    });

    expect(update).toHaveBeenCalledOnce();
  });
});

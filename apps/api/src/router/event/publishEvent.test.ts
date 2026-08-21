import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

function callerForOwnedEvent(owned: StoredEvent | null, currentUser = organizerUser) {
  const findFirst = vi.fn().mockResolvedValue(owned);
  const update = vi.fn().mockResolvedValue(storedEvent({ status: "PUBLISHED" }));

  return {
    update,
    caller: createTestCaller({ currentUser, prisma: { event: { findFirst, update } } }),
  };
}

describe("publishEvent", () => {
  it("puts a draft on sale", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent({ status: "DRAFT" }));

    const event = await caller.event.publishEvent({ eventId: "event-id" });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "PUBLISHED" } }));
    expect(event.status).toBe("PUBLISHED");
  });

  it("refuses to put a cancelled event back on sale", async () => {
    const { caller, update } = callerForOwnedEvent(storedEvent({ status: "CANCELLED" }));

    await expect(caller.event.publishEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ message: "EVENT_IS_CANCELLED" }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("hides events of other organizers behind a not found", async () => {
    const { caller } = callerForOwnedEvent(null);

    await expect(caller.event.publishEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("keeps attendees from publishing anything", async () => {
    const { caller } = callerForOwnedEvent(storedEvent(), attendeeUser);

    await expect(caller.event.publishEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

function callerForOwnedEvent(owned: StoredEvent | null) {
  const findFirst = vi.fn().mockResolvedValue(owned);
  const deleteEvent = vi.fn().mockResolvedValue(undefined);

  return {
    deleteEvent,
    caller: createTestCaller({
      currentUser: organizerUser,
      prisma: { event: { findFirst, delete: deleteEvent } },
    }),
  };
}

describe("deleteEvent", () => {
  it("removes a draft", async () => {
    const { caller, deleteEvent } = callerForOwnedEvent(storedEvent({ status: "DRAFT" }));

    await expect(caller.event.deleteEvent({ eventId: "event-id" })).resolves.toEqual({
      deletedEventId: "event-id",
    });
    expect(deleteEvent).toHaveBeenCalledWith({ where: { id: "event-id" } });
  });

  it("keeps a published event, because tickets may already exist", async () => {
    const { caller, deleteEvent } = callerForOwnedEvent(storedEvent({ status: "PUBLISHED" }));

    await expect(caller.event.deleteEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ message: "ONLY_DRAFTS_CAN_BE_DELETED" }),
    );
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it("keeps a cancelled event as a record", async () => {
    const { caller, deleteEvent } = callerForOwnedEvent(storedEvent({ status: "CANCELLED" }));

    await expect(caller.event.deleteEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ message: "ONLY_DRAFTS_CAN_BE_DELETED" }),
    );
    expect(deleteEvent).not.toHaveBeenCalled();
  });
});

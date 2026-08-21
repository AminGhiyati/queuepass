import { describe, expect, it, vi } from "vitest";
import { createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

function callerForOwnedEvent(owned: StoredEvent | null) {
  const findFirst = vi.fn().mockResolvedValue(owned);
  const findUniqueOrThrow = vi.fn().mockResolvedValue(owned);

  return {
    caller: createTestCaller({
      currentUser: organizerUser,
      prisma: { event: { findFirst, findUniqueOrThrow } },
    }),
  };
}

describe("getMyEvent", () => {
  it("keeps the image key, so editing does not drop the image", async () => {
    const { caller } = callerForOwnedEvent(storedEvent({ imageKey: "events/abc.png" }));

    const event = await caller.event.getMyEvent({ eventId: "event-id" });

    expect(event.imageKey).toBe("events/abc.png");
    expect(event.imageUrl).toMatch(/\/events\/abc\.png$/);
  });

  it("hides events of other organizers behind a not found", async () => {
    const { caller } = callerForOwnedEvent(null);

    await expect(caller.event.getMyEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { createTestCaller } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

function anonymousCaller(found: StoredEvent | null) {
  const findFirst = vi.fn().mockResolvedValue(found);

  return { findFirst, caller: createTestCaller({ prisma: { event: { findFirst } } }) };
}

describe("getPublishedEvent", () => {
  it("is readable without an account", async () => {
    const { caller } = anonymousCaller(storedEvent({ status: "PUBLISHED" }));

    await expect(caller.event.getPublishedEvent({ eventId: "event-id" })).resolves.toMatchObject({
      title: "Harbour Open Air",
    });
  });

  it("looks only at events that are published or cancelled", async () => {
    const { caller, findFirst } = anonymousCaller(storedEvent({ status: "PUBLISHED" }));

    await caller.event.getPublishedEvent({ eventId: "event-id" });

    expect(findFirst.mock.calls.at(-1)?.[0].where).toMatchObject({
      id: "event-id",
      status: { in: ["PUBLISHED", "CANCELLED"] },
    });
  });

  it("still shows a cancelled event, so ticket holders learn about it", async () => {
    const { caller } = anonymousCaller(storedEvent({ status: "CANCELLED" }));

    await expect(caller.event.getPublishedEvent({ eventId: "event-id" })).resolves.toMatchObject({
      status: "CANCELLED",
    });
  });

  it("reports an unknown or unpublished event as not found", async () => {
    const { caller } = anonymousCaller(null);

    await expect(caller.event.getPublishedEvent({ eventId: "draft-id" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });
});

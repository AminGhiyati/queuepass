import { describe, expect, it, vi } from "vitest";
import { createTestCaller } from "../../testing/createTestCaller.js";
import { storedEvent } from "../../testing/eventFixtures.js";

function anonymousCaller() {
  const findMany = vi.fn().mockResolvedValue([storedEvent({ status: "PUBLISHED" })]);

  return { findMany, caller: createTestCaller({ prisma: { event: { findMany } } }) };
}

function whereOfLastCall(findMany: ReturnType<typeof vi.fn>) {
  return findMany.mock.calls.at(-1)?.[0].where;
}

describe("listPublishedEvents", () => {
  it("is readable without an account", async () => {
    const { caller } = anonymousCaller();

    await expect(caller.event.listPublishedEvents()).resolves.toHaveLength(1);
  });

  it("shows only published events that have not ended yet", async () => {
    const { caller, findMany } = anonymousCaller();

    await caller.event.listPublishedEvents();

    expect(whereOfLastCall(findMany)).toMatchObject({ status: "PUBLISHED" });
    expect(whereOfLastCall(findMany).endsAt.gte).toBeInstanceOf(Date);
  });

  it("shows the soonest event first", async () => {
    const { caller, findMany } = anonymousCaller();

    await caller.event.listPublishedEvents();

    expect(findMany.mock.calls.at(-1)?.[0].orderBy).toEqual({ startsAt: "asc" });
  });

  it("limits the list when the caller asks for fewer events", async () => {
    const { caller, findMany } = anonymousCaller();

    await caller.event.listPublishedEvents({ limit: 3 });

    expect(findMany.mock.calls.at(-1)?.[0].take).toBe(3);
  });

  it("searches title and location", async () => {
    const { caller, findMany } = anonymousCaller();

    await caller.event.listPublishedEvents({ search: "hamburg" });

    expect(whereOfLastCall(findMany).OR).toEqual([
      { title: { contains: "hamburg", mode: "insensitive" } },
      { location: { contains: "hamburg", mode: "insensitive" } },
    ]);
  });

  it("does not filter when the search is empty", async () => {
    const { caller, findMany } = anonymousCaller();

    await caller.event.listPublishedEvents({ search: "   " });

    expect(whereOfLastCall(findMany).OR).toBeUndefined();
  });

  it("hides the storage key of the event image", async () => {
    const { caller } = anonymousCaller();

    const [event] = await caller.event.listPublishedEvents();

    expect(event).not.toHaveProperty("imageKey");
  });
});

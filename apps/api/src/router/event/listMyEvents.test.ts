import { describe, expect, it, vi } from "vitest";
import { attendeeUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent } from "../../testing/eventFixtures.js";

function callerWithEvents(currentUser = organizerUser) {
  const findMany = vi.fn().mockResolvedValue([storedEvent()]);

  return { findMany, caller: createTestCaller({ currentUser, prisma: { event: { findMany } } }) };
}

function queriedEvents(findMany: ReturnType<typeof vi.fn>) {
  return findMany.mock.calls[0]?.[0];
}

describe("listMyEvents", () => {
  it("lists only the events of the signed in organizer", async () => {
    const { caller, findMany } = callerWithEvents();

    await caller.event.listMyEvents({ timeframe: "UPCOMING" });

    expect(queriedEvents(findMany).where.organizerId).toBe(organizerUser.id);
  });

  it("leaves out what is already over and shows the next event first", async () => {
    const { caller, findMany } = callerWithEvents();

    await caller.event.listMyEvents({ timeframe: "UPCOMING" });

    expect(queriedEvents(findMany).where.endsAt.gte).toBeInstanceOf(Date);
    expect(queriedEvents(findMany).orderBy).toEqual({ startsAt: "asc" });
  });

  it("leaves out a cancelled event, however far away its date still is", async () => {
    const { caller, findMany } = callerWithEvents();

    await caller.event.listMyEvents({ timeframe: "UPCOMING" });

    expect(queriedEvents(findMany).where.status).toEqual({ not: "CANCELLED" });
  });

  it("collects what is over for the archive, the most recent one first", async () => {
    const { caller, findMany } = callerWithEvents();

    await caller.event.listMyEvents({ timeframe: "PAST" });

    expect(queriedEvents(findMany).where.OR.at(0).endsAt.lt).toBeInstanceOf(Date);
    expect(queriedEvents(findMany).orderBy).toEqual({ startsAt: "desc" });
  });

  it("puts a cancelled event into the archive, because it will not take place", async () => {
    const { caller, findMany } = callerWithEvents();

    await caller.event.listMyEvents({ timeframe: "PAST" });

    expect(queriedEvents(findMany).where.OR).toContainEqual({ status: "CANCELLED" });
  });

  it("includes drafts, so the organizer can finish them", async () => {
    const { caller } = callerWithEvents();

    const events = await caller.event.listMyEvents({ timeframe: "UPCOMING" });

    expect(events.at(0)?.status).toBe("DRAFT");
  });

  it("keeps attendees out", async () => {
    const { caller } = callerWithEvents(attendeeUser);

    await expect(caller.event.listMyEvents({ timeframe: "UPCOMING" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

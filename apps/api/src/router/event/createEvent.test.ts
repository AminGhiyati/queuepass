import { describe, expect, it, vi } from "vitest";
import {
  adminUser,
  attendeeUser,
  createTestCaller,
  organizerUser,
} from "../../testing/createTestCaller.js";
import { eventDetails, storedEvent } from "../../testing/eventFixtures.js";

function callerWithCreate(currentUser = organizerUser) {
  const create = vi.fn().mockResolvedValue(storedEvent());

  return { create, caller: createTestCaller({ currentUser, prisma: { event: { create } } }) };
}

describe("createEvent", () => {
  it("stores the event for the signed in organizer", async () => {
    const { caller, create } = callerWithCreate();

    await caller.event.createEvent(eventDetails);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...eventDetails, organizerId: organizerUser.id },
      }),
    );
  });

  it("starts a new event as a draft", async () => {
    const { caller } = callerWithCreate();

    const event = await caller.event.createEvent(eventDetails);

    expect(event.status).toBe("DRAFT");
  });

  it("refuses an event that ends before it starts", async () => {
    const { caller } = callerWithCreate();

    await expect(
      caller.event.createEvent({ ...eventDetails, endsAt: eventDetails.startsAt }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });

  it("refuses an event that starts in the past", async () => {
    const { caller, create } = callerWithCreate();

    await expect(
      caller.event.createEvent({
        ...eventDetails,
        startsAt: new Date("2020-09-01T18:00:00.000Z"),
        endsAt: new Date("2020-09-02T02:00:00.000Z"),
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses an event without any capacity", async () => {
    const { caller } = callerWithCreate();

    await expect(caller.event.createEvent({ ...eventDetails, capacity: 0 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("refuses a price that costs money but stays under the chargeable minimum", async () => {
    const { caller } = callerWithCreate();

    await expect(caller.event.createEvent({ ...eventDetails, priceCents: 25 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("accepts a free event", async () => {
    const { caller, create } = callerWithCreate();

    await caller.event.createEvent({ ...eventDetails, priceCents: 0 });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priceCents: 0 }) }),
    );
  });

  it("keeps attendees from creating events", async () => {
    const { caller } = callerWithCreate(attendeeUser);

    await expect(caller.event.createEvent(eventDetails)).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("keeps administrators from creating events", async () => {
    const { caller } = callerWithCreate(adminUser);

    await expect(caller.event.createEvent(eventDetails)).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

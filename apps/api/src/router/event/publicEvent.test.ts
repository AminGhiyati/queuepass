import { describe, expect, it } from "vitest";
import { storedEvent } from "../../testing/eventFixtures.js";
import { toPublicEvent } from "./publicEvent.js";

describe("toPublicEvent", () => {
  it("reports how many tickets are still available", () => {
    const event = toPublicEvent(storedEvent({ capacity: 400, soldCount: 120 }));

    expect(event.availableCount).toBe(280);
    expect(event.isSoldOut).toBe(false);
  });

  it("marks an event as sold out once the capacity is reached", () => {
    const event = toPublicEvent(storedEvent({ capacity: 100, soldCount: 100 }));

    expect(event.availableCount).toBe(0);
    expect(event.isSoldOut).toBe(true);
  });

  it("never reports a negative availability", () => {
    const event = toPublicEvent(storedEvent({ capacity: 100, soldCount: 130 }));

    expect(event.availableCount).toBe(0);
  });

  it("marks an event whose end has passed as over", () => {
    const event = toPublicEvent(
      storedEvent({
        startsAt: new Date("2020-09-01T18:00:00.000Z"),
        endsAt: new Date("2020-09-02T02:00:00.000Z"),
      }),
    );

    expect(event.hasEnded).toBe(true);
  });

  it("keeps an event that is still to come open", () => {
    const event = toPublicEvent(
      storedEvent({
        startsAt: new Date("2099-09-01T18:00:00.000Z"),
        endsAt: new Date("2099-09-02T02:00:00.000Z"),
      }),
    );

    expect(event.hasEnded).toBe(false);
  });

  it("turns the stored image key into a public url", () => {
    const event = toPublicEvent(storedEvent({ imageKey: "events/abc.png" }));

    expect(event.imageUrl).toMatch(/\/events\/abc\.png$/);
  });

  it("has no image url when no image was uploaded", () => {
    const event = toPublicEvent(storedEvent({ imageKey: null }));

    expect(event.imageUrl).toBeNull();
  });

  it("exposes the organizer name instead of the whole organizer", () => {
    const event = toPublicEvent(storedEvent());

    expect(event.organizerName).toBe("Clara Vogt");
    expect(event).not.toHaveProperty("organizer");
    expect(event).not.toHaveProperty("imageKey");
  });
});

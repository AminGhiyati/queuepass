import { describe, expect, it } from "vitest";
import { entranceClosureOf } from "@/lib/eventEntrance";
import { publicEvent } from "@/testing/eventFixtures";

describe("entranceClosureOf", () => {
  it("keeps the entrance open for a published event that is still ahead", () => {
    expect(entranceClosureOf(publicEvent())).toBeNull();
  });

  it("closes the entrance of an event that is over", () => {
    expect(entranceClosureOf(publicEvent({ hasEnded: true }))).toBe("ENDED");
  });

  it("closes the entrance of a cancelled event whose date is still ahead", () => {
    expect(entranceClosureOf(publicEvent({ status: "CANCELLED" }))).toBe("CANCELLED");
  });

  it("names the cancellation of an event that was cancelled and is now over", () => {
    expect(entranceClosureOf(publicEvent({ status: "CANCELLED", hasEnded: true }))).toBe(
      "CANCELLED",
    );
  });

  it("keeps the entrance open while the event is still loading", () => {
    expect(entranceClosureOf(undefined)).toBeNull();
  });
});

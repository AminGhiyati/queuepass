import { describe, expect, it, vi } from "vitest";
import { createTestCaller, organizerUser } from "../../testing/createTestCaller.js";
import { storedEvent, type StoredEvent } from "../../testing/eventFixtures.js";

const { cancelEventAndRefundBuyers } = vi.hoisted(() => ({
  cancelEventAndRefundBuyers: vi.fn(),
}));

vi.mock("../../lib/events/cancelEventAndRefundBuyers.js", () => ({ cancelEventAndRefundBuyers }));

function callerForOwnedEvent(owned: StoredEvent | null) {
  const findFirst = vi.fn().mockResolvedValue(owned);

  return createTestCaller({
    currentUser: organizerUser,
    prisma: { event: { findFirst } },
  });
}

describe("cancelEvent", () => {
  it("cancels the event and reports the refunds it started", async () => {
    cancelEventAndRefundBuyers.mockResolvedValue({
      refundedOrderCount: 3,
      failedRefundCount: 0,
      refundedCents: 7500,
    });
    const caller = callerForOwnedEvent(storedEvent({ status: "PUBLISHED" }));

    await expect(caller.event.cancelEvent({ eventId: "event-id" })).resolves.toEqual({
      refundedOrderCount: 3,
      failedRefundCount: 0,
      refundedCents: 7500,
    });
    expect(cancelEventAndRefundBuyers).toHaveBeenCalledWith(expect.anything(), "event-id");
  });

  it("refuses to cancel twice, so no order is refunded twice", async () => {
    const caller = callerForOwnedEvent(storedEvent({ status: "CANCELLED" }));

    await expect(caller.event.cancelEvent({ eventId: "event-id" })).rejects.toThrow(
      expect.objectContaining({ message: "EVENT_IS_CANCELLED" }),
    );
  });

  it("keeps the events of other organisers out of reach", async () => {
    const caller = callerForOwnedEvent(null);

    await expect(caller.event.cancelEvent({ eventId: "someone-elses" })).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });
});

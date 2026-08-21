import { describe, expect, it, vi } from "vitest";
import {
  attendeeUser,
  createTestCaller,
  organizerUser,
} from "../../testing/createTestCaller.js";

function payoutSettingsCaller(storedIban: string | null, currentUser = organizerUser) {
  const findUniqueOrThrow = vi.fn().mockResolvedValue({ payoutIban: storedIban });
  const update = vi.fn().mockImplementation(({ data }) => Promise.resolve(data));

  return {
    update,
    caller: createTestCaller({ currentUser, prisma: { user: { findUniqueOrThrow, update } } }),
  };
}

describe("getMyPayoutSettings", () => {
  it("reads the stored iban of the signed in organizer", async () => {
    const { caller } = payoutSettingsCaller("DE44500105175407324931");

    await expect(caller.payout.getMyPayoutSettings()).resolves.toEqual({
      payoutIban: "DE44500105175407324931",
    });
  });

  it("reports a missing iban instead of failing", async () => {
    const { caller } = payoutSettingsCaller(null);

    await expect(caller.payout.getMyPayoutSettings()).resolves.toEqual({ payoutIban: null });
  });

  it("keeps attendees out of the payout settings", async () => {
    const { caller } = payoutSettingsCaller(null, attendeeUser);

    await expect(caller.payout.getMyPayoutSettings()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

describe("updateMyPayoutIban", () => {
  it("stores the iban of the signed in organizer", async () => {
    const { caller, update } = payoutSettingsCaller(null);

    await expect(
      caller.payout.updateMyPayoutIban({ iban: "DE44500105175407324931" }),
    ).resolves.toEqual({ payoutIban: "DE44500105175407324931" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: organizerUser.id },
        data: { payoutIban: "DE44500105175407324931" },
      }),
    );
  });

  it("stores an iban that was typed with spaces without them", async () => {
    const { caller, update } = payoutSettingsCaller(null);

    await caller.payout.updateMyPayoutIban({ iban: "de44 5001 0517 5407 3249 31" });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payoutIban: "DE44500105175407324931" } }),
    );
  });

  it("refuses an iban that fails its check digits", async () => {
    const { caller, update } = payoutSettingsCaller(null);

    await expect(
      caller.payout.updateMyPayoutIban({ iban: "DE44500105175407324932" }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a plain account number", async () => {
    const { caller } = payoutSettingsCaller(null);

    await expect(caller.payout.updateMyPayoutIban({ iban: "5407324931" })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("keeps attendees from storing an iban", async () => {
    const { caller, update } = payoutSettingsCaller(null, attendeeUser);

    await expect(
      caller.payout.updateMyPayoutIban({ iban: "DE44500105175407324931" }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(update).not.toHaveBeenCalled();
  });
});

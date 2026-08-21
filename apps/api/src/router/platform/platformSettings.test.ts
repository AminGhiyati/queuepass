import { describe, expect, it, vi } from "vitest";
import { adminUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";

function settingsCaller(stored: { feePercent: number } | null, currentUser = adminUser) {
  const findUnique = vi.fn().mockResolvedValue(stored);
  const upsert = vi.fn().mockImplementation(({ update }) => Promise.resolve(update));

  return {
    upsert,
    caller: createTestCaller({ currentUser, prisma: { platformSettings: { findUnique, upsert } } }),
  };
}

describe("getPlatformSettings", () => {
  it("reads the stored fee", async () => {
    const { caller } = settingsCaller({ feePercent: 12 });

    await expect(caller.platform.getPlatformSettings()).resolves.toEqual({ feePercent: 12 });
  });

  it("reports the default fee while nothing is stored", async () => {
    const { caller } = settingsCaller(null);

    await expect(caller.platform.getPlatformSettings()).resolves.toEqual({ feePercent: 5 });
  });
});

describe("updatePlatformSettings", () => {
  it("writes the new fee into the single settings row", async () => {
    const { caller, upsert } = settingsCaller({ feePercent: 5 });

    await expect(caller.platform.updatePlatformSettings({ feePercent: 8 })).resolves.toEqual({
      feePercent: 8,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "singleton" }, update: { feePercent: 8 } }),
    );
  });

  it("allows waiving the fee entirely", async () => {
    const { caller } = settingsCaller({ feePercent: 5 });

    await expect(caller.platform.updatePlatformSettings({ feePercent: 0 })).resolves.toEqual({
      feePercent: 0,
    });
  });

  it("refuses an absurd fee", async () => {
    const { caller } = settingsCaller({ feePercent: 5 });

    await expect(caller.platform.updatePlatformSettings({ feePercent: 80 })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("keeps organizers from changing the fee", async () => {
    const { caller } = settingsCaller({ feePercent: 5 }, organizerUser);

    await expect(caller.platform.updatePlatformSettings({ feePercent: 0 })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

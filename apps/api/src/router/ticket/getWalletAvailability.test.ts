import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestCaller } from "../../testing/createTestCaller.js";

const { isApplePassConfigured, isGoogleWalletConfigured } = vi.hoisted(() => ({
  isApplePassConfigured: vi.fn(),
  isGoogleWalletConfigured: vi.fn(),
}));

vi.mock("../../lib/passes/applePassConfiguration.js", () => ({ isApplePassConfigured }));
vi.mock("../../lib/passes/googleWalletConfiguration.js", () => ({ isGoogleWalletConfigured }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getWalletAvailability", () => {
  it("offers both wallets once both are configured", async () => {
    isApplePassConfigured.mockReturnValue(true);
    isGoogleWalletConfigured.mockReturnValue(true);

    expect(await createTestCaller().ticket.getWalletAvailability()).toEqual({
      applePass: true,
      googleWallet: true,
    });
  });

  it("reports the wallet that is missing its keys", async () => {
    isApplePassConfigured.mockReturnValue(true);
    isGoogleWalletConfigured.mockReturnValue(false);

    expect(await createTestCaller().ticket.getWalletAvailability()).toEqual({
      applePass: true,
      googleWallet: false,
    });
  });

  it("answers without an account, because the ticket page asks before signing in resolves", async () => {
    isApplePassConfigured.mockReturnValue(false);
    isGoogleWalletConfigured.mockReturnValue(false);

    expect(await createTestCaller({ currentUser: null }).ticket.getWalletAvailability()).toEqual({
      applePass: false,
      googleWallet: false,
    });
  });
});

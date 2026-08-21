import { beforeEach, describe, expect, it, vi } from "vitest";
import { selfSignedPassCertificates } from "../../testing/passCertificates.js";
import { ticketPassPayload } from "../../testing/ticketFixtures.js";
import { renderApplePkpass } from "./applePkpass.js";
import { PassNotConfiguredError } from "./ticketPassPayload.js";

const { isApplePassConfigured, readApplePassCertificates } = vi.hoisted(() => ({
  isApplePassConfigured: vi.fn(),
  readApplePassCertificates: vi.fn(),
}));

vi.mock("./applePassConfiguration.js", () => ({
  isApplePassConfigured,
  readApplePassCertificates,
  readApplePassIdentifiers: () => ({
    teamIdentifier: "TEAM123456",
    passTypeIdentifier: "pass.com.queuepass",
  }),
}));

const ZIP_SIGNATURE = "PK";

beforeEach(() => {
  vi.clearAllMocks();
  isApplePassConfigured.mockReturnValue(true);
  readApplePassCertificates.mockReturnValue(selfSignedPassCertificates());
});

describe("renderApplePkpass", () => {
  it("hands out a signed pass archive", async () => {
    const pass = await renderApplePkpass(ticketPassPayload());

    expect(pass.subarray(0, 4).toString("latin1")).toBe(ZIP_SIGNATURE);
  });

  it("packs the pass, its signature and its icon into the archive", async () => {
    const pass = await renderApplePkpass(ticketPassPayload());
    const archivedFileNames = pass.toString("latin1");

    expect(archivedFileNames).toContain("pass.json");
    expect(archivedFileNames).toContain("manifest.json");
    expect(archivedFileNames).toContain("signature");
    expect(archivedFileNames).toContain("icon.png");
  });

  it("ships the German labels alongside the English ones", async () => {
    const pass = await renderApplePkpass(ticketPassPayload());

    expect(pass.toString("latin1")).toContain("de.lproj/pass.strings");
  });

  it("refuses to hand out an unsigned pass while no certificate exists", async () => {
    isApplePassConfigured.mockReturnValue(false);

    await expect(renderApplePkpass(ticketPassPayload())).rejects.toBeInstanceOf(
      PassNotConfiguredError,
    );
  });

  it("names the provider that is missing, so the client can say which one", async () => {
    isApplePassConfigured.mockReturnValue(false);

    await expect(renderApplePkpass(ticketPassPayload())).rejects.toMatchObject({
      provider: "Apple Wallet",
    });
  });
});

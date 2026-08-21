import { createVerify } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { throwawayServiceAccountKeyPair } from "../../testing/passCertificates.js";
import { ticketPassPayload } from "../../testing/ticketFixtures.js";
import { createGoogleWalletSaveUrl } from "./googleWallet.js";
import { PassNotConfiguredError } from "./ticketPassPayload.js";

const { isGoogleWalletConfigured, readGoogleWalletServiceAccount, serviceAccountKeyPair } =
  vi.hoisted(() => ({
    isGoogleWalletConfigured: vi.fn(),
    readGoogleWalletServiceAccount: vi.fn(),
    serviceAccountKeyPair: { publicKey: "", privateKey: "" },
  }));

vi.mock("./googleWalletConfiguration.js", () => ({
  isGoogleWalletConfigured,
  readGoogleWalletServiceAccount,
  readGoogleWalletIssuerId: () => "3388000000000000000",
  googleWalletOrigin: "http://localhost:5173",
}));

function saveTokenOf(saveUrl: string) {
  return saveUrl.replace("https://pay.google.com/gp/v/save/", "");
}

function claimsOf(saveUrl: string) {
  const [, claims] = saveTokenOf(saveUrl).split(".");

  return JSON.parse(Buffer.from(String(claims), "base64url").toString("utf8"));
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(serviceAccountKeyPair, throwawayServiceAccountKeyPair());
  isGoogleWalletConfigured.mockReturnValue(true);
  readGoogleWalletServiceAccount.mockReturnValue({
    clientEmail: "wallet@queuepass.iam.gserviceaccount.com",
    privateKey: serviceAccountKeyPair.privateKey,
  });
});

describe("createGoogleWalletSaveUrl", () => {
  it("points at the Google Wallet save link", async () => {
    const saveUrl = await createGoogleWalletSaveUrl(ticketPassPayload());

    expect(saveUrl.startsWith("https://pay.google.com/gp/v/save/")).toBe(true);
  });

  it("signs the link with the key of the service account", async () => {
    const saveUrl = await createGoogleWalletSaveUrl(ticketPassPayload());
    const [header, claims, signature] = saveTokenOf(saveUrl).split(".");

    expect(JSON.parse(Buffer.from(String(header), "base64url").toString("utf8"))).toEqual({
      alg: "RS256",
      typ: "JWT",
    });
    expect(
      createVerify("RSA-SHA256")
        .update(`${header}.${claims}`)
        .verify(serviceAccountKeyPair.publicKey, Buffer.from(String(signature), "base64url")),
    ).toBe(true);
  });

  it("issues the link for the service account and the site that shows the ticket", async () => {
    const claims = claimsOf(await createGoogleWalletSaveUrl(ticketPassPayload()));

    expect(claims).toMatchObject({
      iss: "wallet@queuepass.iam.gserviceaccount.com",
      aud: "google",
      typ: "savetowallet",
      origins: ["http://localhost:5173"],
    });
  });

  it("carries the ticket itself, so no pass has to be created upfront", async () => {
    const claims = claimsOf(await createGoogleWalletSaveUrl(ticketPassPayload({ code: "abc123" })));

    expect(claims.payload.eventTicketObjects[0].barcode.value).toBe("abc123");
    expect(claims.payload.eventTicketClasses[0].id).toBe("3388000000000000000.event-event-id");
  });

  it("refuses to hand out a link while no issuer exists", async () => {
    isGoogleWalletConfigured.mockReturnValue(false);

    await expect(createGoogleWalletSaveUrl(ticketPassPayload())).rejects.toBeInstanceOf(
      PassNotConfiguredError,
    );
  });

  it("names the provider that is missing, so the client can say which one", async () => {
    isGoogleWalletConfigured.mockReturnValue(false);

    await expect(createGoogleWalletSaveUrl(ticketPassPayload())).rejects.toMatchObject({
      provider: "Google Wallet",
    });
  });
});

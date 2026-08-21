import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  googleWalletConfiguration,
  isGoogleWalletConfigured,
  readGoogleWalletIssuerId,
  readGoogleWalletServiceAccount,
} from "./googleWalletConfiguration.js";
import { PassNotConfiguredError } from "./ticketPassPayload.js";

vi.mock("../environment.js", () => ({
  environment: { USER_CLIENT_URL: "http://localhost:5173" },
}));

const serviceAccountKey = {
  client_email: "wallet@queuepass.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
};

function configureGoogleWallet(overrides: Partial<typeof googleWalletConfiguration> = {}) {
  Object.assign(googleWalletConfiguration, {
    issuerId: "3388000000000000000",
    serviceAccountKey: Buffer.from(JSON.stringify(serviceAccountKey)).toString("base64"),
    ...overrides,
  });
}

beforeEach(() => {
  Object.assign(googleWalletConfiguration, { issuerId: null, serviceAccountKey: null });
});

describe("google wallet configuration", () => {
  it("reports Google Wallet as unconfigured while no issuer exists", () => {
    expect(isGoogleWalletConfigured()).toBe(false);
  });

  it("reports Google Wallet as configured once issuer and key are there", () => {
    configureGoogleWallet();

    expect(isGoogleWalletConfigured()).toBe(true);
    expect(readGoogleWalletIssuerId()).toBe("3388000000000000000");
  });

  it("decodes the service account file a deployment stores base64 encoded", () => {
    configureGoogleWallet();

    expect(readGoogleWalletServiceAccount()).toEqual({
      clientEmail: serviceAccountKey.client_email,
      privateKey: serviceAccountKey.private_key,
    });
  });

  it("takes the service account file that was pasted as plain json", () => {
    configureGoogleWallet({ serviceAccountKey: JSON.stringify(serviceAccountKey) });

    expect(readGoogleWalletServiceAccount().clientEmail).toBe(serviceAccountKey.client_email);
  });

  it("rejects a service account file that carries no key", () => {
    configureGoogleWallet({ serviceAccountKey: JSON.stringify({ client_email: "a@b.com" }) });

    expect(() => readGoogleWalletServiceAccount()).toThrow();
  });

  it("refuses to read an issuer that was never configured", () => {
    expect(() => readGoogleWalletIssuerId()).toThrow(PassNotConfiguredError);
  });
});

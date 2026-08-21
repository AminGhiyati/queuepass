import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applePassConfiguration,
  isApplePassConfigured,
  readApplePassCertificates,
  readApplePassIdentifiers,
} from "./applePassConfiguration.js";
import { PassNotConfiguredError } from "./ticketPassPayload.js";

vi.mock("../environment.js", () => ({ environment: {} }));

const certificatePem = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n";
const privateKeyPem = "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n";

function configureApplePasses(overrides: Partial<typeof applePassConfiguration> = {}) {
  Object.assign(applePassConfiguration, {
    teamIdentifier: "TEAM123456",
    passTypeIdentifier: "pass.com.queuepass",
    signerCertificate: Buffer.from(certificatePem).toString("base64"),
    signerKey: Buffer.from(privateKeyPem).toString("base64"),
    signerKeyPassword: null,
    wwdrCertificate: Buffer.from(certificatePem).toString("base64"),
    ...overrides,
  });
}

beforeEach(() => {
  Object.assign(applePassConfiguration, {
    teamIdentifier: null,
    passTypeIdentifier: null,
    signerCertificate: null,
    signerKey: null,
    signerKeyPassword: null,
    wwdrCertificate: null,
  });
});

describe("apple pass configuration", () => {
  it("reports Apple Wallet as unconfigured while no certificate exists", () => {
    expect(isApplePassConfigured()).toBe(false);
  });

  it("reports Apple Wallet as configured once every certificate is there", () => {
    configureApplePasses();

    expect(isApplePassConfigured()).toBe(true);
  });

  it("stays configured without a key password, because a key may carry none", () => {
    configureApplePasses({ signerKeyPassword: null });

    expect(isApplePassConfigured()).toBe(true);
  });

  it("misses a single certificate as well", () => {
    configureApplePasses({ wwdrCertificate: null });

    expect(isApplePassConfigured()).toBe(false);
  });

  it("decodes the certificates a deployment stores base64 encoded", () => {
    configureApplePasses();

    expect(readApplePassCertificates()).toMatchObject({
      wwdr: certificatePem,
      signerCert: certificatePem,
      signerKey: privateKeyPem,
    });
  });

  it("takes a certificate that was pasted as plain PEM text", () => {
    configureApplePasses({ signerCertificate: certificatePem });

    expect(readApplePassCertificates().signerCert).toBe(certificatePem);
  });

  it("passes the key password on when the key carries one", () => {
    configureApplePasses({ signerKeyPassword: "pass-key-secret" });

    expect(readApplePassCertificates().signerKeyPassphrase).toBe("pass-key-secret");
  });

  it("refuses to read identifiers that were never configured", () => {
    expect(() => readApplePassIdentifiers()).toThrow(PassNotConfiguredError);
  });
});

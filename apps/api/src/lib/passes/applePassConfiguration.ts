import { environment } from "../environment.js";
import { PassNotConfiguredError } from "./ticketPassPayload.js";

export const applePassConfiguration = {
  teamIdentifier: environment.APPLE_PASS_TEAM_ID ?? null,
  passTypeIdentifier: environment.APPLE_PASS_TYPE_IDENTIFIER ?? null,
  signerCertificate: environment.APPLE_PASS_CERTIFICATE ?? null,
  signerKey: environment.APPLE_PASS_CERTIFICATE_KEY ?? null,
  signerKeyPassword: environment.APPLE_PASS_CERTIFICATE_KEY_PASSWORD ?? null,
  wwdrCertificate: environment.APPLE_PASS_WWDR_CERTIFICATE ?? null,
};

const requiredConfigurationKeys = [
  "teamIdentifier",
  "passTypeIdentifier",
  "signerCertificate",
  "signerKey",
  "wwdrCertificate",
] as const;

export function isApplePassConfigured() {
  return requiredConfigurationKeys.every(
    (key) => applePassConfiguration[key] !== null,
  );
}

function readConfiguredValue(key: (typeof requiredConfigurationKeys)[number]) {
  const value = applePassConfiguration[key];

  if (!value) {
    throw new PassNotConfiguredError("Apple Wallet");
  }

  return value;
}

function readPem(value: string) {
  return value.includes("-----BEGIN")
    ? value
    : Buffer.from(value, "base64").toString("utf8");
}

export function readApplePassIdentifiers() {
  return {
    teamIdentifier: readConfiguredValue("teamIdentifier"),
    passTypeIdentifier: readConfiguredValue("passTypeIdentifier"),
  };
}

export function readApplePassCertificates() {
  return {
    wwdr: readPem(readConfiguredValue("wwdrCertificate")),
    signerCert: readPem(readConfiguredValue("signerCertificate")),
    signerKey: readPem(readConfiguredValue("signerKey")),
    signerKeyPassphrase: applePassConfiguration.signerKeyPassword ?? undefined,
  };
}

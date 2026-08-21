import { z } from "zod";
import { environment } from "../environment.js";
import { PassNotConfiguredError } from "./ticketPassPayload.js";

export const googleWalletConfiguration = {
  issuerId: environment.GOOGLE_WALLET_ISSUER_ID ?? null,
  serviceAccountKey: environment.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY ?? null,
};

export const googleWalletOrigin = environment.USER_CLIENT_URL;

const serviceAccountKeySchema = z.object({
  client_email: z.email(),
  private_key: z.string().min(1),
});

export function isGoogleWalletConfigured() {
  return Object.values(googleWalletConfiguration).every(
    (value) => value !== null,
  );
}

export function readGoogleWalletIssuerId() {
  if (!googleWalletConfiguration.issuerId) {
    throw new PassNotConfiguredError("Google Wallet");
  }

  return googleWalletConfiguration.issuerId;
}

export function readGoogleWalletServiceAccount() {
  const configuredKey = googleWalletConfiguration.serviceAccountKey;

  if (!configuredKey) {
    throw new PassNotConfiguredError("Google Wallet");
  }

  const serviceAccountJson = configuredKey.trimStart().startsWith("{")
    ? configuredKey
    : Buffer.from(configuredKey, "base64").toString("utf8");
  const serviceAccountKey = serviceAccountKeySchema.parse(
    JSON.parse(serviceAccountJson),
  );

  return {
    clientEmail: serviceAccountKey.client_email,
    privateKey: serviceAccountKey.private_key,
  };
}

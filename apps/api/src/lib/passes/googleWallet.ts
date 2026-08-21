import { createSign } from "node:crypto";
import {
  googleWalletOrigin,
  isGoogleWalletConfigured,
  readGoogleWalletIssuerId,
  readGoogleWalletServiceAccount,
} from "./googleWalletConfiguration.js";
import { buildGoogleWalletPayload } from "./googleWalletContent.js";
import { PassNotConfiguredError, type TicketPassPayload } from "./ticketPassPayload.js";

const SAVE_LINK_PREFIX = "https://pay.google.com/gp/v/save/";

function encodeSegment(segment: object) {
  return Buffer.from(JSON.stringify(segment)).toString("base64url");
}

function signSaveToken(claims: object, privateKey: string) {
  const signedPart = `${encodeSegment({ alg: "RS256", typ: "JWT" })}.${encodeSegment(claims)}`;
  const signature = createSign("RSA-SHA256").update(signedPart).sign(privateKey);

  return `${signedPart}.${signature.toString("base64url")}`;
}

export async function createGoogleWalletSaveUrl(ticket: TicketPassPayload): Promise<string> {
  if (!isGoogleWalletConfigured()) {
    throw new PassNotConfiguredError("Google Wallet");
  }

  const { clientEmail, privateKey } = readGoogleWalletServiceAccount();
  const claims = {
    iss: clientEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [googleWalletOrigin],
    payload: buildGoogleWalletPayload(ticket, readGoogleWalletIssuerId()),
  };

  return `${SAVE_LINK_PREFIX}${signSaveToken(claims, privateKey)}`;
}

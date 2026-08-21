import { PKPass } from "passkit-generator";
import {
  isApplePassConfigured,
  readApplePassCertificates,
  readApplePassIdentifiers,
} from "./applePassConfiguration.js";
import { buildApplePassContent, germanPassLabels } from "./applePassContent.js";
import { renderQueuePassMarkPng } from "./passArtwork.js";
import { PassNotConfiguredError, type TicketPassPayload } from "./ticketPassPayload.js";

const ICON_SIZE_IN_POINTS = 29;
const LOGO_SIZE_IN_POINTS = 50;

function passArtwork() {
  return {
    "icon.png": renderQueuePassMarkPng(ICON_SIZE_IN_POINTS),
    "icon@2x.png": renderQueuePassMarkPng(ICON_SIZE_IN_POINTS * 2),
    "icon@3x.png": renderQueuePassMarkPng(ICON_SIZE_IN_POINTS * 3),
    "logo.png": renderQueuePassMarkPng(LOGO_SIZE_IN_POINTS),
    "logo@2x.png": renderQueuePassMarkPng(LOGO_SIZE_IN_POINTS * 2),
  };
}

export async function renderApplePkpass(ticket: TicketPassPayload): Promise<Buffer> {
  if (!isApplePassConfigured()) {
    throw new PassNotConfiguredError("Apple Wallet");
  }

  const passContent = buildApplePassContent(ticket, readApplePassIdentifiers());
  const pass = new PKPass(
    { ...passArtwork(), "pass.json": Buffer.from(JSON.stringify(passContent)) },
    readApplePassCertificates(),
  );

  pass.localize("de", germanPassLabels);

  return pass.getAsBuffer();
}

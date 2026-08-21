import { describe, expect, it } from "vitest";
import { ticketPassPayload } from "../../testing/ticketFixtures.js";
import { buildApplePassContent } from "./applePassContent.js";

const identifiers = { teamIdentifier: "TEAM123456", passTypeIdentifier: "pass.com.queuepass" };

function passContent(ticket = ticketPassPayload()) {
  return buildApplePassContent(ticket, identifiers);
}

describe("buildApplePassContent", () => {
  it("signs the pass for the configured team and pass type", () => {
    expect(passContent()).toMatchObject({
      teamIdentifier: "TEAM123456",
      passTypeIdentifier: "pass.com.queuepass",
    });
  });

  it("carries the ticket code as the scannable qr code", () => {
    expect(passContent(ticketPassPayload({ code: "abc123" })).barcodes).toEqual([
      {
        format: "PKBarcodeFormatQR",
        message: "abc123",
        messageEncoding: "iso-8859-1",
        altText: "abc123",
      },
    ]);
  });

  it("identifies the pass by the ticket it belongs to", () => {
    expect(passContent(ticketPassPayload({ ticketId: "ticket-42" })).serialNumber).toBe("ticket-42");
  });

  it("shows the event, the location and the holder on the front", () => {
    const eventTicket = passContent().eventTicket;

    expect(eventTicket.primaryFields[0]?.value).toBe("Harbour Open Air");
    expect(eventTicket.secondaryFields.map((field) => field.value)).toEqual([
      "Hamburg",
      "Anna Becker",
    ]);
    expect(eventTicket.auxiliaryFields[0]?.value).toBe("Clara Vogt");
  });

  it("keeps the code readable on the back, in case scanning fails", () => {
    expect(passContent().eventTicket.backFields[0]?.value).toBe("ticket-code");
  });

  it("surfaces the pass when the event starts and lets it expire when it ends", () => {
    expect(passContent()).toMatchObject({
      relevantDate: "2026-09-01T18:00:00.000Z",
      expirationDate: "2026-09-02T02:00:00.000Z",
    });
  });
});

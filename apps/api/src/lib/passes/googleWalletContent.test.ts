import { describe, expect, it } from "vitest";
import { ticketPassPayload } from "../../testing/ticketFixtures.js";
import { buildGoogleWalletPayload } from "./googleWalletContent.js";

function walletPayload(ticket = ticketPassPayload()) {
  return buildGoogleWalletPayload(ticket, "3388000000000000000");
}

describe("buildGoogleWalletPayload", () => {
  it("gives every event its own class below the issuer", () => {
    const [eventTicketClass] = walletPayload(ticketPassPayload({ eventId: "event-42" }))
      .eventTicketClasses;

    expect(eventTicketClass?.id).toBe("3388000000000000000.event-event-42");
  });

  it("names the event and where it happens", () => {
    const [eventTicketClass] = walletPayload().eventTicketClasses;

    expect(eventTicketClass?.eventName.defaultValue.value).toBe("Harbour Open Air");
    expect(eventTicketClass?.venue.name.defaultValue.value).toBe("Hamburg");
    expect(eventTicketClass?.dateTime).toEqual({
      start: "2026-09-01T18:00:00.000Z",
      end: "2026-09-02T02:00:00.000Z",
    });
  });

  it("belongs the ticket object to the class of its event", () => {
    const payload = walletPayload();

    expect(payload.eventTicketObjects[0]?.id).toBe("3388000000000000000.ticket-ticket-id");
    expect(payload.eventTicketObjects[0]?.classId).toBe(payload.eventTicketClasses[0]?.id);
  });

  it("carries the ticket code as the scannable qr code", () => {
    const [eventTicketObject] = walletPayload(ticketPassPayload({ code: "abc123" }))
      .eventTicketObjects;

    expect(eventTicketObject?.barcode).toEqual({
      type: "QR_CODE",
      value: "abc123",
      alternateText: "abc123",
    });
    expect(eventTicketObject?.ticketHolderName).toBe("Anna Becker");
  });
});

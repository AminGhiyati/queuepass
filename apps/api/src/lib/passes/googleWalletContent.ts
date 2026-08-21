import type { TicketPassPayload } from "./ticketPassPayload.js";

const PASS_LANGUAGE = "en-US";

function localizedString(value: string) {
  return { defaultValue: { language: PASS_LANGUAGE, value } };
}

export function buildGoogleWalletPayload(
  ticket: TicketPassPayload,
  issuerId: string,
) {
  const classId = `${issuerId}.event-${ticket.eventId}`;

  return {
    eventTicketClasses: [
      {
        id: classId,
        issuerName: ticket.organizerName,

        reviewStatus: "UNDER_REVIEW",
        eventName: localizedString(ticket.eventTitle),
        venue: {
          name: localizedString(ticket.eventLocation),
          address: localizedString(ticket.eventLocation),
        },
        dateTime: {
          start: ticket.startsAt.toISOString(),
          end: ticket.endsAt.toISOString(),
        },
        hexBackgroundColor: "#0f172a",
      },
    ],
    eventTicketObjects: [
      {
        id: `${issuerId}.ticket-${ticket.ticketId}`,
        classId,
        state: "ACTIVE",
        ticketHolderName: ticket.holderName,
        ticketNumber: ticket.code,
        barcode: {
          type: "QR_CODE",
          value: ticket.code,
          alternateText: ticket.code,
        },
      },
    ],
  };
}

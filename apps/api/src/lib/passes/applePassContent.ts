import type { TicketPassPayload } from "./ticketPassPayload.js";

type ApplePassIdentifiers = {
  teamIdentifier: string;
  passTypeIdentifier: string;
};

export const germanPassLabels = {
  Event: "Veranstaltung",
  Starts: "Beginn",
  Location: "Ort",
  "Ticket holder": "Ticketinhaber",
  Organizer: "Veranstalter",
  "Ticket code": "Ticketcode",
};

export function buildApplePassContent(
  ticket: TicketPassPayload,
  { teamIdentifier, passTypeIdentifier }: ApplePassIdentifiers,
) {
  return {
    formatVersion: 1,
    passTypeIdentifier,
    teamIdentifier,
    organizationName: "QueuePass",
    serialNumber: ticket.ticketId,
    description: ticket.eventTitle,
    backgroundColor: "rgb(15, 23, 42)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(148, 163, 184)",
    relevantDate: ticket.startsAt.toISOString(),
    expirationDate: ticket.endsAt.toISOString(),
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: ticket.code,
        messageEncoding: "iso-8859-1",
        altText: ticket.code,
      },
    ],
    eventTicket: {
      headerFields: [
        {
          key: "starts",
          label: "Starts",
          value: ticket.startsAt.toISOString(),
          dateStyle: "PKDateStyleMedium",
          timeStyle: "PKDateStyleShort",
        },
      ],
      primaryFields: [
        { key: "event", label: "Event", value: ticket.eventTitle },
      ],
      secondaryFields: [
        { key: "location", label: "Location", value: ticket.eventLocation },
        { key: "holder", label: "Ticket holder", value: ticket.holderName },
      ],
      auxiliaryFields: [
        { key: "organizer", label: "Organizer", value: ticket.organizerName },
      ],
      backFields: [{ key: "code", label: "Ticket code", value: ticket.code }],
    },
  };
}

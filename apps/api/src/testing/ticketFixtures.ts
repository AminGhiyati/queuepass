import type { TicketPassPayload } from "../lib/passes/ticketPassPayload.js";
import type { EventStatus, OrderStatus, TicketStatus } from "../generated/prisma/enums.js";

export function ticketPassPayload(overrides: Partial<TicketPassPayload> = {}): TicketPassPayload {
  return {
    ticketId: "ticket-id",
    eventId: "event-id",
    code: "ticket-code",
    eventTitle: "Harbour Open Air",
    eventLocation: "Hamburg",
    startsAt: new Date("2026-09-01T18:00:00.000Z"),
    endsAt: new Date("2026-09-02T02:00:00.000Z"),
    organizerName: "Clara Vogt",
    holderName: "Anna Becker",
    ...overrides,
  };
}

export type StoredTicket = {
  id: string;
  code: string;
  status: TicketStatus;
  checkedInAt: Date | null;
  event: {
    id: string;
    title: string;
    location: string;
    startsAt: Date;
    endsAt: Date;
    imageKey: string | null;
    status: EventStatus;
    organizer: { name: string };
  };
  order: { id: string; status: OrderStatus; unitPriceCents: number; refundedAt: Date | null };
};

export function storedTicket(overrides: Partial<StoredTicket> = {}): StoredTicket {
  return {
    id: "ticket-id",
    code: "ticket-code",
    status: "VALID",
    checkedInAt: null,
    event: {
      id: "event-id",
      title: "Harbour Open Air",
      location: "Hamburg",
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
      endsAt: new Date("2026-09-02T02:00:00.000Z"),
      imageKey: null,
      status: "PUBLISHED",
      organizer: { name: "Clara Vogt" },
    },
    order: { id: "order-id", status: "PAID", unitPriceCents: 2500, refundedAt: null },
    ...overrides,
  };
}

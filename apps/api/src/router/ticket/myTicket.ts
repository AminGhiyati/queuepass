import { eventImageUrl } from "../../lib/storage/eventImages.js";
import type { EventStatus, OrderStatus, TicketStatus } from "../../generated/prisma/enums.js";

export const myTicketSelection = {
  id: true,
  code: true,
  status: true,
  checkedInAt: true,
  event: {
    select: {
      id: true,
      title: true,
      location: true,
      startsAt: true,
      endsAt: true,
      imageKey: true,
      status: true,
      organizer: { select: { name: true } },
    },
  },
  order: {
    select: { id: true, status: true, unitPriceCents: true, refundedAt: true },
  },
} as const;

type SelectedTicket = {
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

export function toMyTicket(ticket: SelectedTicket) {
  const { event, order, ...details } = ticket;

  return {
    ...details,
    isCheckedIn: ticket.checkedInAt !== null,
    isPaid: order.status === "PAID",
    isValid: ticket.status === "VALID",
    pricePaidCents: order.unitPriceCents,
    orderId: order.id,
    orderStatus: order.status,
    refundedAt: order.refundedAt,
    event: {
      id: event.id,
      title: event.title,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      status: event.status,
      imageUrl: eventImageUrl(event.imageKey),
      organizerName: event.organizer.name,
    },
  };
}

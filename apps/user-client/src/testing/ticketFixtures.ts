export type MyTicket = {
  id: string;
  code: string;
  status: "VALID" | "CANCELLED";
  checkedInAt: Date | null;
  isCheckedIn: boolean;
  isPaid: boolean;
  isValid: boolean;
  pricePaidCents: number;
  orderId: string;
  orderStatus: "PAID" | "REFUND_PENDING" | "REFUNDED" | "REFUND_FAILED";
  refundedAt: Date | null;
  event: {
    id: string;
    title: string;
    location: string;
    startsAt: Date;
    endsAt: Date;
    status: "DRAFT" | "PUBLISHED" | "CANCELLED";
    imageUrl: string | null;
    organizerName: string;
  };
};

export function myTicket(overrides: Partial<MyTicket> = {}): MyTicket {
  return {
    id: "ticket-id",
    code: "ticket-code",
    status: "VALID",
    checkedInAt: null,
    isCheckedIn: false,
    isPaid: true,
    isValid: true,
    pricePaidCents: 2500,
    orderId: "order-id",
    orderStatus: "PAID",
    refundedAt: null,
    event: {
      id: "event-id",
      title: "Harbour Open Air",
      location: "Hamburg",
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
      endsAt: new Date("2026-09-02T02:00:00.000Z"),
      status: "PUBLISHED",
      imageUrl: null,
      organizerName: "Clara Vogt",
    },
    ...overrides,
  };
}

export type EventAttendee = {
  id: string;
  code: string;
  status: "VALID" | "CANCELLED";
  checkedInAt: Date | null;
  isCheckedIn: boolean;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
};

export function eventAttendee(overrides: Partial<EventAttendee> = {}): EventAttendee {
  return {
    id: "ticket-id",
    code: "ticket-code",
    status: "VALID",
    checkedInAt: null,
    isCheckedIn: false,
    orderId: "order-id",
    buyerName: "Anna Becker",
    buyerEmail: "anna@example.com",
    ...overrides,
  };
}

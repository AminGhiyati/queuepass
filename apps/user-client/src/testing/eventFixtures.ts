export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  capacity: number;
  soldCount: number;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  imageKey: string | null;
  imageUrl: string | null;
  organizerName: string;
  availableCount: number;
  isSoldOut: boolean;
  hasEnded: boolean;
};

export function publicEvent(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: "event-id",
    title: "Harbour Open Air",
    description: "One night, three stages, right at the water.",
    location: "Hamburg",
    startsAt: new Date("2026-09-01T18:00:00.000Z"),
    endsAt: new Date("2026-09-02T02:00:00.000Z"),
    priceCents: 2500,
    capacity: 400,
    soldCount: 0,
    status: "PUBLISHED",
    imageKey: null,
    imageUrl: null,
    organizerName: "Clara Vogt",
    availableCount: 400,
    isSoldOut: false,
    hasEnded: false,
    ...overrides,
  };
}

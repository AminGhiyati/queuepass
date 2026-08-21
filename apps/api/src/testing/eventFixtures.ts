import type { EventStatus } from "../generated/prisma/enums.js";
import { organizerUser } from "./createTestCaller.js";

export type EventDetails = {
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  capacity: number;
  imageKey: string | null;
};

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * HOUR_IN_MILLISECONDS);
}

export const eventDetails: EventDetails = {
  title: "Harbour Open Air",
  description: "One night, three stages, right at the water.",
  location: "Hamburg",
  startsAt: hoursFromNow(24),
  endsAt: hoursFromNow(32),
  priceCents: 2500,
  capacity: 400,
  imageKey: null,
};

export function storedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: "event-id",
    organizerId: organizerUser.id,
    ...eventDetails,
    soldCount: 0,
    status: "DRAFT",
    organizer: { name: organizerUser.name },
    ...overrides,
  };
}

export type StoredEvent = EventDetails & {
  id: string;
  organizerId: string;
  soldCount: number;
  status: EventStatus;
  organizer: { name: string };
};

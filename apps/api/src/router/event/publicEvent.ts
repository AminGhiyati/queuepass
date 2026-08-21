import { eventImageUrl } from "../../lib/storage/eventImages.js";
import type { EventStatus } from "../../generated/prisma/enums.js";

export const publicEventSelection = {
  id: true,
  title: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  priceCents: true,
  capacity: true,
  soldCount: true,
  imageKey: true,
  status: true,
  organizer: { select: { name: true } },
} as const;

type SelectedEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  capacity: number;
  soldCount: number;
  imageKey: string | null;
  status: EventStatus;
  organizer: { name: string };
};

export function toPublicEvent(event: SelectedEvent) {
  const { imageKey, organizer, ...details } = event;

  return {
    ...details,
    imageUrl: eventImageUrl(imageKey),
    organizerName: organizer.name,
    availableCount: Math.max(event.capacity - event.soldCount, 0),
    isSoldOut: event.soldCount >= event.capacity,
    hasEnded: event.endsAt < new Date(),
  };
}

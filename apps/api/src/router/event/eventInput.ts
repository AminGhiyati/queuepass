import { z } from "zod";
import { isSellablePrice } from "../../lib/payments/sellablePrice.js";
import { imageFileExtensions } from "../../lib/storage/eventImages.js";

export const eventDetailsInput = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(4000),
    location: z.string().trim().min(1).max(200),
    startsAt: z.date(),
    endsAt: z.date(),
    priceCents: z.number().int().min(0).max(1_000_000),
    capacity: z.number().int().min(1).max(1_000_000),
    imageKey: z.string().max(200).nullable().default(null),
  })
  .refine((details) => details.endsAt > details.startsAt, {
    path: ["endsAt"],
    message: "An event has to end after it starts.",
  })
  .refine((details) => isSellablePrice(details.priceCents), {
    path: ["priceCents"],
    message: "PRICE_BELOW_MINIMUM",
  });

export const newEventDetailsInput = eventDetailsInput.refine(
  (details) => details.startsAt > new Date(),
  { path: ["startsAt"], message: "EVENT_STARTS_IN_THE_PAST" },
);

export const imageContentTypeInput = z.enum(
  Object.keys(imageFileExtensions) as [keyof typeof imageFileExtensions],
);

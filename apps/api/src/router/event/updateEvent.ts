import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownedEventProcedure } from "../../trpc/procedures.js";
import { eventDetailsInput } from "./eventInput.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

function movesStartIntoThePast(currentStart: Date, newStart: Date) {
  return newStart.getTime() !== currentStart.getTime() && newStart < new Date();
}

export const updateEvent = ownedEventProcedure
  .input(z.object({ details: eventDetailsInput }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.event.status === "CANCELLED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "EVENT_IS_CANCELLED",
      });
    }

    if (movesStartIntoThePast(ctx.event.startsAt, input.details.startsAt)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "EVENT_STARTS_IN_THE_PAST",
      });
    }

    if (input.details.capacity < ctx.event.soldCount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "CAPACITY_BELOW_SOLD_TICKETS",
      });
    }

    const event = await ctx.prisma.event.update({
      where: { id: ctx.event.id },
      data: input.details,
      select: publicEventSelection,
    });

    return toPublicEvent(event);
  });

import { organizerProcedure } from "../../trpc/procedures.js";
import { newEventDetailsInput } from "./eventInput.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

export const createEvent = organizerProcedure
  .input(newEventDetailsInput)
  .mutation(async ({ ctx, input }) => {
    const event = await ctx.prisma.event.create({
      data: { ...input, organizerId: ctx.currentUser.id },
      select: publicEventSelection,
    });

    return toPublicEvent(event);
  });

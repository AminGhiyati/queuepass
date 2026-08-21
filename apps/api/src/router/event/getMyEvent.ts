import { ownedEventProcedure } from "../../trpc/procedures.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

export const getMyEvent = ownedEventProcedure.query(async ({ ctx }) => {
  const event = await ctx.prisma.event.findUniqueOrThrow({
    where: { id: ctx.event.id },
    select: publicEventSelection,
  });

  return { ...toPublicEvent(event), imageKey: event.imageKey };
});

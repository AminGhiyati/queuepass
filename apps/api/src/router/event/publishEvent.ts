import { TRPCError } from "@trpc/server";
import { ownedEventProcedure } from "../../trpc/procedures.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

export const publishEvent = ownedEventProcedure.mutation(async ({ ctx }) => {
  if (ctx.event.status === "CANCELLED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "EVENT_IS_CANCELLED" });
  }

  const event = await ctx.prisma.event.update({
    where: { id: ctx.event.id },
    data: { status: "PUBLISHED" },
    select: publicEventSelection,
  });

  return toPublicEvent(event);
});

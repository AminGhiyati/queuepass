import { TRPCError } from "@trpc/server";
import { ownedEventProcedure } from "../../trpc/procedures.js";

export const deleteEvent = ownedEventProcedure.mutation(async ({ ctx }) => {
  if (ctx.event.status !== "DRAFT") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "ONLY_DRAFTS_CAN_BE_DELETED" });
  }

  await ctx.prisma.event.delete({ where: { id: ctx.event.id } });

  return { deletedEventId: ctx.event.id };
});

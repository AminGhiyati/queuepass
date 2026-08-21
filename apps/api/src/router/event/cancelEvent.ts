import { TRPCError } from "@trpc/server";
import { cancelEventAndRefundBuyers } from "../../lib/events/cancelEventAndRefundBuyers.js";
import { ownedEventProcedure } from "../../trpc/procedures.js";

export const cancelEvent = ownedEventProcedure.mutation(async ({ ctx }) => {
  if (ctx.event.status === "CANCELLED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "EVENT_IS_CANCELLED" });
  }

  return cancelEventAndRefundBuyers(ctx.prisma, ctx.event.id);
});

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownedEventProcedure } from "../../trpc/procedures.js";

export const undoTicketCheckIn = ownedEventProcedure
  .input(z.object({ ticketId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.event.endsAt < new Date()) {
      throw new TRPCError({ code: "FORBIDDEN", message: "EVENT_OVER" });
    }

    const { count } = await ctx.prisma.ticket.updateMany({
      where: { id: input.ticketId, eventId: ctx.event.id, checkedInAt: { not: null } },
      data: { checkedInAt: null, checkedInById: null },
    });

    if (count === 0) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return { ticketId: input.ticketId, isCheckedIn: false };
  });

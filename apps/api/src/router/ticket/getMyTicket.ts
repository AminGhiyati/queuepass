import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { chargedOrderStatuses } from "../../lib/payments/chargedOrderStatuses.js";
import { authenticatedProcedure } from "../../trpc/procedures.js";
import { myTicketSelection, toMyTicket } from "./myTicket.js";

export const getMyTicket = authenticatedProcedure
  .input(z.object({ ticketId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const ticket = await ctx.prisma.ticket.findFirst({
      where: {
        id: input.ticketId,
        order: { buyerId: ctx.currentUser.id, status: { in: chargedOrderStatuses } },
      },
      select: myTicketSelection,
    });

    if (!ticket) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return toMyTicket(ticket);
  });

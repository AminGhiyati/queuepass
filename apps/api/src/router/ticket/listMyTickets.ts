import { z } from "zod";
import { chargedOrderStatuses } from "../../lib/payments/chargedOrderStatuses.js";
import { authenticatedProcedure } from "../../trpc/procedures.js";
import { myTicketSelection, toMyTicket } from "./myTicket.js";

export const listMyTickets = authenticatedProcedure
  .input(z.object({ timeframe: z.enum(["UPCOMING", "PAST"]) }))
  .query(async ({ ctx, input }) => {
    const hasEnded = input.timeframe === "PAST";
    const now = new Date();

    const tickets = await ctx.prisma.ticket.findMany({
      where: {
        order: { buyerId: ctx.currentUser.id, status: { in: chargedOrderStatuses } },
        event: { endsAt: hasEnded ? { lt: now } : { gte: now } },
      },
      orderBy: [{ event: { startsAt: hasEnded ? "desc" : "asc" } }, { createdAt: "asc" }],
      select: myTicketSelection,
    });

    return tickets.map(toMyTicket);
  });

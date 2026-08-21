import { z } from "zod";
import { ownedEventProcedure } from "../../trpc/procedures.js";
import { outcomeOfRejectedScan, type CheckInReport } from "./checkInResult.js";

export const checkInTicket = ownedEventProcedure
  .input(z.object({ code: z.string().trim().min(1).max(200) }))
  .mutation(async ({ ctx, input }): Promise<CheckInReport> => {
    const { code } = input;
    const scannedAt = new Date();

    if (scannedAt > ctx.event.endsAt) {
      return { code, outcome: "EVENT_OVER", checkedInAt: null, buyerName: null };
    }

    const { count } = await ctx.prisma.ticket.updateMany({
      where: { code, eventId: ctx.event.id, status: "VALID", checkedInAt: null },
      data: { checkedInAt: scannedAt, checkedInById: ctx.currentUser.id },
    });

    const ticket = await ctx.prisma.ticket.findUnique({
      where: { code },
      select: {
        eventId: true,
        status: true,
        checkedInAt: true,
        order: { select: { buyer: { select: { name: true } } } },
      },
    });

    const buyerName = ticket?.order.buyer.name ?? null;

    if (count === 1) {
      return { code, outcome: "CHECKED_IN", checkedInAt: scannedAt, buyerName };
    }

    return {
      code,
      outcome: outcomeOfRejectedScan(ticket, ctx.event.id),
      checkedInAt: ticket?.checkedInAt ?? null,
      buyerName,
    };
  });

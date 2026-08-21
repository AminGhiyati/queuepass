import { chargedOrderStatuses } from "../../lib/payments/chargedOrderStatuses.js";
import { ownedEventProcedure } from "../../trpc/procedures.js";

export const listEventTickets = ownedEventProcedure.query(async ({ ctx }) => {
  const tickets = await ctx.prisma.ticket.findMany({
    where: { eventId: ctx.event.id, order: { status: { in: chargedOrderStatuses } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      code: true,
      status: true,
      checkedInAt: true,
      order: { select: { id: true, buyer: { select: { name: true, email: true } } } },
    },
  });

  return tickets.map(({ order, ...ticket }) => ({
    ...ticket,
    isCheckedIn: ticket.checkedInAt !== null,
    orderId: order.id,
    buyerName: order.buyer.name,
    buyerEmail: order.buyer.email,
  }));
});

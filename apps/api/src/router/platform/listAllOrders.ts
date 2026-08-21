import { adminProcedure } from "../../trpc/procedures.js";

export const listAllOrders = adminProcedure.query(async ({ ctx }) => {
  const orders = await ctx.prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quantity: true,
      totalCents: true,
      platformFeeCents: true,
      status: true,
      paymentProvider: true,
      paidAt: true,
      createdAt: true,
      event: { select: { id: true, title: true } },
      buyer: { select: { name: true, email: true } },
    },
  });

  return orders.map(({ event, buyer, ...order }) => ({
    ...order,
    eventId: event.id,
    eventTitle: event.title,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
  }));
});

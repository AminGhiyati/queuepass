import { adminProcedure } from "../../trpc/procedures.js";

export const getRevenueReport = adminProcedure.query(async ({ ctx }) => {
  const paidOrders = await ctx.prisma.order.findMany({
    where: { status: "PAID" },
    select: {
      quantity: true,
      totalCents: true,
      platformFeeCents: true,
      event: { select: { organizer: { select: { id: true, name: true, email: true } } } },
    },
  });

  const byOrganizer = new Map<
    string,
    {
      organizerId: string;
      organizerName: string;
      organizerEmail: string;
      ticketsSold: number;
      grossCents: number;
      platformFeeCents: number;
      payoutCents: number;
    }
  >();

  for (const order of paidOrders) {
    const { organizer } = order.event;
    const current = byOrganizer.get(organizer.id) ?? {
      organizerId: organizer.id,
      organizerName: organizer.name,
      organizerEmail: organizer.email,
      ticketsSold: 0,
      grossCents: 0,
      platformFeeCents: 0,
      payoutCents: 0,
    };

    current.ticketsSold += order.quantity;
    current.grossCents += order.totalCents;
    current.platformFeeCents += order.platformFeeCents;
    current.payoutCents = current.grossCents - current.platformFeeCents;

    byOrganizer.set(organizer.id, current);
  }

  const organizers = [...byOrganizer.values()].sort((first, second) =>
    second.grossCents === first.grossCents
      ? first.organizerName.localeCompare(second.organizerName)
      : second.grossCents - first.grossCents,
  );

  return {
    organizers,
    totals: {
      ticketsSold: organizers.reduce((sum, entry) => sum + entry.ticketsSold, 0),
      grossCents: organizers.reduce((sum, entry) => sum + entry.grossCents, 0),
      platformFeeCents: organizers.reduce((sum, entry) => sum + entry.platformFeeCents, 0),
      payoutCents: organizers.reduce((sum, entry) => sum + entry.payoutCents, 0),
    },
  };
});

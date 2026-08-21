import { payoutBalanceOf } from "../../lib/payouts/payoutBalance.js";
import { adminProcedure } from "../../trpc/procedures.js";

function sumOf<Item>(items: Item[], valueOf: (item: Item) => number) {
  return items.reduce((total, item) => total + valueOf(item), 0);
}

export const listOrganizerPayouts = adminProcedure.query(async ({ ctx }) => {
  const [organizers, paidOrders, transferredPayouts] = await Promise.all([
    ctx.prisma.user.findMany({
      where: { role: "ORGANIZER" },
      select: { id: true, name: true, email: true, payoutIban: true },
    }),
    ctx.prisma.order.findMany({
      where: { status: "PAID" },
      select: {
        totalCents: true,
        platformFeeCents: true,
        event: { select: { organizerId: true } },
      },
    }),
    ctx.prisma.payout.findMany({
      orderBy: { transferredAt: "desc" },
      select: { organizerId: true, amountCents: true, transferredAt: true },
    }),
  ]);

  const rows = organizers.map((organizer) => {
    const ordersOfOrganizer = paidOrders.filter(
      (order) => order.event.organizerId === organizer.id,
    );
    const payoutsOfOrganizer = transferredPayouts.filter(
      (payout) => payout.organizerId === organizer.id,
    );

    return {
      organizerId: organizer.id,
      organizerName: organizer.name,
      organizerEmail: organizer.email,
      payoutIban: organizer.payoutIban,
      lastTransferredAt: payoutsOfOrganizer.at(0)?.transferredAt ?? null,
      ...payoutBalanceOf({
        grossCents: sumOf(ordersOfOrganizer, (order) => order.totalCents),
        platformFeeCents: sumOf(ordersOfOrganizer, (order) => order.platformFeeCents),
        transferredCents: sumOf(payoutsOfOrganizer, (payout) => payout.amountCents),
      }),
    };
  });

  return rows
    .filter((row) => row.earnedCents > 0 || row.transferredCents > 0)
    .sort((first, second) =>
      second.outstandingCents === first.outstandingCents
        ? first.organizerName.localeCompare(second.organizerName)
        : second.outstandingCents - first.outstandingCents,
    );
});

import type { PrismaClient } from "../../generated/prisma/client.js";

type PayoutAmounts = {
  grossCents: number;
  platformFeeCents: number;
  transferredCents: number;
};

export function payoutBalanceOf({ grossCents, platformFeeCents, transferredCents }: PayoutAmounts) {
  const earnedCents = grossCents - platformFeeCents;

  return {
    grossCents,
    platformFeeCents,
    earnedCents,
    transferredCents,
    outstandingCents: earnedCents - transferredCents,
  };
}

export async function readPayoutBalanceOfOrganizer(
  prisma: Pick<PrismaClient, "order" | "payout">,
  organizerId: string,
) {
  const [paidOrders, transferredPayouts] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID", event: { organizerId } },
      _sum: { totalCents: true, platformFeeCents: true },
    }),
    prisma.payout.aggregate({
      where: { organizerId },
      _sum: { amountCents: true },
    }),
  ]);

  return payoutBalanceOf({
    grossCents: paidOrders._sum.totalCents ?? 0,
    platformFeeCents: paidOrders._sum.platformFeeCents ?? 0,
    transferredCents: transferredPayouts._sum.amountCents ?? 0,
  });
}

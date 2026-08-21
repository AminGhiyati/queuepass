import { describe, expect, it, vi } from "vitest";
import { payoutBalanceOf, readPayoutBalanceOfOrganizer } from "./payoutBalance.js";

describe("payoutBalanceOf", () => {
  it("leaves the platform fee with the platform", () => {
    const balance = payoutBalanceOf({
      grossCents: 10_000,
      platformFeeCents: 500,
      transferredCents: 0,
    });

    expect(balance.earnedCents).toBe(9_500);
    expect(balance.outstandingCents).toBe(9_500);
  });

  it("subtracts what was already transferred", () => {
    const balance = payoutBalanceOf({
      grossCents: 10_000,
      platformFeeCents: 500,
      transferredCents: 4_000,
    });

    expect(balance.outstandingCents).toBe(5_500);
  });

  it("owes nothing once everything is transferred", () => {
    const balance = payoutBalanceOf({
      grossCents: 10_000,
      platformFeeCents: 500,
      transferredCents: 9_500,
    });

    expect(balance.outstandingCents).toBe(0);
  });
});

describe("readPayoutBalanceOfOrganizer", () => {
  function prismaWith(
    orderSums: { totalCents: number | null; platformFeeCents: number | null },
    payoutSum: number | null,
  ) {
    return {
      order: { aggregate: vi.fn().mockResolvedValue({ _sum: orderSums }) },
      payout: { aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: payoutSum } }) },
    };
  }

  it("counts only the paid orders of that organizer", async () => {
    const prisma = prismaWith({ totalCents: 7_500, platformFeeCents: 375 }, 1_000);

    const balance = await readPayoutBalanceOfOrganizer(
      prisma as unknown as Parameters<typeof readPayoutBalanceOfOrganizer>[0],
      "clara",
    );

    expect(prisma.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PAID", event: { organizerId: "clara" } } }),
    );
    expect(balance.outstandingCents).toBe(6_125);
  });

  it("reads an organizer without any sale as zero", async () => {
    const prisma = prismaWith({ totalCents: null, platformFeeCents: null }, null);

    const balance = await readPayoutBalanceOfOrganizer(
      prisma as unknown as Parameters<typeof readPayoutBalanceOfOrganizer>[0],
      "clara",
    );

    expect(balance).toEqual({
      grossCents: 0,
      platformFeeCents: 0,
      earnedCents: 0,
      transferredCents: 0,
      outstandingCents: 0,
    });
  });
});

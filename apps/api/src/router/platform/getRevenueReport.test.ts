import { describe, expect, it, vi } from "vitest";
import { adminUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";

function paidOrder(organizerName: string, totalCents: number, platformFeeCents: number, quantity = 1) {
  return {
    quantity,
    totalCents,
    platformFeeCents,
    event: {
      organizer: {
        id: organizerName.toLowerCase(),
        name: organizerName,
        email: `${organizerName.toLowerCase()}@example.com`,
      },
    },
  };
}

function reportCaller(orders: ReturnType<typeof paidOrder>[], currentUser = adminUser) {
  const findMany = vi.fn().mockResolvedValue(orders);

  return { findMany, caller: createTestCaller({ currentUser, prisma: { order: { findMany } } }) };
}

describe("getRevenueReport", () => {
  it("counts only paid orders", async () => {
    const { caller, findMany } = reportCaller([]);

    await caller.platform.getRevenueReport();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "PAID" } }));
  });

  it("sums gross, fee and payout per organizer", async () => {
    const { caller } = reportCaller([
      paidOrder("Clara", 10_000, 500, 4),
      paidOrder("Clara", 5_000, 250, 2),
    ]);

    const report = await caller.platform.getRevenueReport();

    expect(report.organizers).toEqual([
      expect.objectContaining({
        organizerName: "Clara",
        ticketsSold: 6,
        grossCents: 15_000,
        platformFeeCents: 750,
        payoutCents: 14_250,
      }),
    ]);
  });

  it("sorts the strongest seller first", async () => {
    const { caller } = reportCaller([paidOrder("Small", 1_000, 50), paidOrder("Big", 9_000, 450)]);

    const report = await caller.platform.getRevenueReport();

    expect(report.organizers.map((entry) => entry.organizerName)).toEqual(["Big", "Small"]);
  });

  it("totals the whole platform", async () => {
    const { caller } = reportCaller([
      paidOrder("Clara", 10_000, 500, 4),
      paidOrder("Bruno", 2_000, 100, 1),
    ]);

    const report = await caller.platform.getRevenueReport();

    expect(report.totals).toEqual({
      ticketsSold: 5,
      grossCents: 12_000,
      platformFeeCents: 600,
      payoutCents: 11_400,
    });
  });

  it("reports zeroes instead of failing on an empty platform", async () => {
    const { caller } = reportCaller([]);

    const report = await caller.platform.getRevenueReport();

    expect(report.organizers).toEqual([]);
    expect(report.totals.grossCents).toBe(0);
  });

  it("keeps organizers out of the platform report", async () => {
    const { caller } = reportCaller([], organizerUser);

    await expect(caller.platform.getRevenueReport()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

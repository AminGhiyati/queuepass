import { describe, expect, it, vi } from "vitest";
import { adminUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";

const VALID_IBAN = "DE44500105175407324931";

type PayoutOrganizer = { id: string; name: string; email: string; payoutIban: string | null };

const clara: PayoutOrganizer = {
  id: "clara",
  name: "Clara Vogt",
  email: "clara@example.com",
  payoutIban: VALID_IBAN,
};

const tom: PayoutOrganizer = {
  id: "tom",
  name: "Tom Berg",
  email: "tom@example.com",
  payoutIban: null,
};

type PaidOrder = { totalCents: number; platformFeeCents: number; organizerId: string };
type TransferredPayout = { organizerId: string; amountCents: number; transferredAt: Date };

function listCaller({
  organizers = [clara],
  paidOrders = [] as PaidOrder[],
  payouts = [] as TransferredPayout[],
  currentUser = adminUser,
} = {}) {
  return createTestCaller({
    currentUser,
    prisma: {
      user: { findMany: vi.fn().mockResolvedValue(organizers) },
      order: {
        findMany: vi.fn().mockResolvedValue(
          paidOrders.map(({ organizerId, ...order }) => ({ ...order, event: { organizerId } })),
        ),
      },
      payout: { findMany: vi.fn().mockResolvedValue(payouts) },
    },
  });
}

function markCaller({
  organizer = clara as { id: string; payoutIban: string | null } | null,
  grossCents = 10_000,
  platformFeeCents = 500,
  transferredCents = 0,
  currentUser = adminUser,
} = {}) {
  const create = vi
    .fn()
    .mockImplementation(({ data }) =>
      Promise.resolve({ id: "payout-id", transferredAt: new Date("2026-08-11T10:00:00Z"), ...data }),
    );

  return {
    create,
    caller: createTestCaller({
      currentUser,
      prisma: {
        user: { findFirst: vi.fn().mockResolvedValue(organizer) },
        order: {
          aggregate: vi.fn().mockResolvedValue({ _sum: { totalCents: grossCents, platformFeeCents } }),
        },
        payout: {
          aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: transferredCents } }),
          create,
        },
      },
    }),
  };
}

describe("listOrganizerPayouts", () => {
  it("owes an organizer the sales minus the platform fee", async () => {
    const caller = listCaller({
      paidOrders: [
        { totalCents: 5_000, platformFeeCents: 250, organizerId: clara.id },
        { totalCents: 2_500, platformFeeCents: 125, organizerId: clara.id },
      ],
    });

    await expect(caller.payout.listOrganizerPayouts()).resolves.toEqual([
      expect.objectContaining({
        organizerId: clara.id,
        organizerName: clara.name,
        organizerEmail: clara.email,
        payoutIban: VALID_IBAN,
        grossCents: 7_500,
        platformFeeCents: 375,
        earnedCents: 7_125,
        transferredCents: 0,
        outstandingCents: 7_125,
        lastTransferredAt: null,
      }),
    ]);
  });

  it("counts a transferred payout against what is still owed", async () => {
    const transferredAt = new Date("2026-08-10T09:00:00Z");
    const caller = listCaller({
      paidOrders: [{ totalCents: 5_000, platformFeeCents: 250, organizerId: clara.id }],
      payouts: [{ organizerId: clara.id, amountCents: 3_000, transferredAt }],
    });

    await expect(caller.payout.listOrganizerPayouts()).resolves.toEqual([
      expect.objectContaining({
        transferredCents: 3_000,
        outstandingCents: 1_750,
        lastTransferredAt: transferredAt,
      }),
    ]);
  });

  it("keeps the sales of another organizer out of the row", async () => {
    const caller = listCaller({
      organizers: [clara, tom],
      paidOrders: [{ totalCents: 5_000, platformFeeCents: 250, organizerId: tom.id }],
    });

    await expect(caller.payout.listOrganizerPayouts()).resolves.toEqual([
      expect.objectContaining({ organizerId: tom.id, outstandingCents: 4_750, payoutIban: null }),
    ]);
  });

  it("puts the largest open amount first", async () => {
    const caller = listCaller({
      organizers: [clara, tom],
      paidOrders: [
        { totalCents: 1_000, platformFeeCents: 0, organizerId: clara.id },
        { totalCents: 9_000, platformFeeCents: 0, organizerId: tom.id },
      ],
    });

    const rows = await caller.payout.listOrganizerPayouts();

    expect(rows.map((row) => row.organizerId)).toEqual([tom.id, clara.id]);
  });

  it("leaves out an organizer who has neither sold nor been paid", async () => {
    const caller = listCaller({ organizers: [clara, tom] });

    await expect(caller.payout.listOrganizerPayouts()).resolves.toEqual([]);
  });

  it("keeps organizers out of the payout overview", async () => {
    const caller = listCaller({ currentUser: organizerUser });

    await expect(caller.payout.listOrganizerPayouts()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

describe("markOrganizerPayoutTransferred", () => {
  it("records the open amount as transferred to the stored iban", async () => {
    const { caller, create } = markCaller();

    await expect(
      caller.payout.markOrganizerPayoutTransferred({ organizerId: clara.id }),
    ).resolves.toEqual(
      expect.objectContaining({ amountCents: 9_500, iban: VALID_IBAN }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizerId: clara.id,
          amountCents: 9_500,
          iban: VALID_IBAN,
          markedByAdminId: adminUser.id,
        },
      }),
    );
  });

  it("records only what is left after an earlier payout", async () => {
    const { caller, create } = markCaller({ transferredCents: 4_000 });

    await caller.payout.markOrganizerPayoutTransferred({ organizerId: clara.id });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountCents: 5_500 }) }),
    );
  });

  it("refuses a payout while no iban is stored", async () => {
    const { caller, create } = markCaller({ organizer: { id: tom.id, payoutIban: null } });

    await expect(
      caller.payout.markOrganizerPayoutTransferred({ organizerId: tom.id }),
    ).rejects.toThrow(expect.objectContaining({ code: "PRECONDITION_FAILED" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a payout when nothing is owed", async () => {
    const { caller, create } = markCaller({ transferredCents: 9_500 });

    await expect(
      caller.payout.markOrganizerPayoutTransferred({ organizerId: clara.id }),
    ).rejects.toThrow(expect.objectContaining({ code: "PRECONDITION_FAILED" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a payout for an account that is no organizer", async () => {
    const { caller } = markCaller({ organizer: null });

    await expect(
      caller.payout.markOrganizerPayoutTransferred({ organizerId: "unknown" }),
    ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("keeps organizers from marking their own payout", async () => {
    const { caller, create } = markCaller({ currentUser: organizerUser });

    await expect(
      caller.payout.markOrganizerPayoutTransferred({ organizerId: organizerUser.id }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(create).not.toHaveBeenCalled();
  });
});

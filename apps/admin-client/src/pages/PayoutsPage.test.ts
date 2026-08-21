import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PayoutsPage from "@/pages/PayoutsPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listOrganizerPayouts, markOrganizerPayoutTransferred } = vi.hoisted(() => ({
  listOrganizerPayouts: vi.fn(),
  markOrganizerPayoutTransferred: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    payout: {
      listOrganizerPayouts: { query: listOrganizerPayouts },
      markOrganizerPayoutTransferred: { mutate: markOrganizerPayoutTransferred },
    },
  },
}));

type PayoutRow = {
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  payoutIban: string | null;
  grossCents: number;
  platformFeeCents: number;
  earnedCents: number;
  transferredCents: number;
  outstandingCents: number;
  lastTransferredAt: Date | null;
};

function payoutRow(overrides: Partial<PayoutRow> = {}): PayoutRow {
  return {
    organizerId: "clara",
    organizerName: "Clara Vogt",
    organizerEmail: "clara@example.com",
    payoutIban: "DE44500105175407324931",
    grossCents: 15_000,
    platformFeeCents: 750,
    earnedCents: 14_250,
    transferredCents: 0,
    outstandingCents: 14_250,
    lastTransferredAt: null,
    ...overrides,
  };
}

function markButtonOf(page: ReturnType<typeof mountWithPlugins>, organizerName: string) {
  const row = page
    .findAll('[data-testid="payout-row"]')
    .find((candidate) => candidate.text().includes(organizerName));

  if (!row) {
    throw new Error(`No payout row for "${organizerName}"`);
  }

  return row.get('[data-testid="mark-payout"]');
}

async function mountPayouts(rows: PayoutRow[] = [payoutRow()]) {
  listOrganizerPayouts.mockResolvedValue(rows);

  const page = mountWithPlugins(PayoutsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("PayoutsPage", () => {
  it("shows what an organizer earned and what is still open", async () => {
    const page = await mountPayouts([
      payoutRow({ transferredCents: 4_000, outstandingCents: 10_250 }),
    ]);

    expect(page.get('[data-testid="payout-organizer"]').text()).toBe("Clara Vogt");
    expect(page.get('[data-testid="payout-iban"]').text()).toBe("DE44500105175407324931");
    expect(page.get('[data-testid="payout-outstanding"]').text()).toContain("102.50");
  });

  it("marks the open amount as transferred", async () => {
    markOrganizerPayoutTransferred.mockResolvedValue({ amountCents: 14_250 });

    const page = await mountPayouts();
    listOrganizerPayouts.mockResolvedValue([
      payoutRow({ transferredCents: 14_250, outstandingCents: 0 }),
    ]);
    await page.get('[data-testid="mark-payout"]').trigger("click");
    await flushPromises();

    expect(markOrganizerPayoutTransferred).toHaveBeenCalledWith({ organizerId: "clara" });
    expect(page.get('[data-testid="mark-payout-done"]').text()).toBe("Marked as transferred.");
  });

  it("cannot mark a payout without a stored iban", async () => {
    const page = await mountPayouts([payoutRow({ payoutIban: null })]);

    expect(page.get('[data-testid="payout-iban-missing"]').text()).toBe("No IBAN stored");
    expect(page.get('[data-testid="mark-payout"]').attributes("disabled")).toBeDefined();
  });

  it("cannot mark a payout while nothing is open", async () => {
    const page = await mountPayouts([
      payoutRow({ transferredCents: 14_250, outstandingCents: 0 }),
    ]);

    expect(page.get('[data-testid="mark-payout"]').attributes("disabled")).toBeDefined();
  });

  it("blocks a second press while the payout is being recorded", async () => {
    markOrganizerPayoutTransferred.mockReturnValue(new Promise(() => {}));

    const page = await mountPayouts();
    await page.get('[data-testid="mark-payout"]').trigger("click");

    expect(page.get('[data-testid="mark-payout"]').attributes("disabled")).toBeDefined();
    expect(markOrganizerPayoutTransferred).toHaveBeenCalledOnce();
  });

  it("reports a payout that could not be recorded", async () => {
    markOrganizerPayoutTransferred.mockRejectedValue(new Error("PAYOUT_IBAN_MISSING"));

    const page = await mountPayouts();
    await page.get('[data-testid="mark-payout"]').trigger("click");
    await flushPromises();

    expect(page.get('[data-testid="mark-payout-failed"]').text()).toBe(
      "The payout could not be marked as transferred.",
    );
  });

  it("keeps the mark of one organizer out of the row of another", async () => {
    markOrganizerPayoutTransferred.mockResolvedValue({ amountCents: 14_250 });

    const page = await mountPayouts([
      payoutRow(),
      payoutRow({ organizerId: "tom", organizerName: "Tom Berg", organizerEmail: "tom@e.com" }),
    ]);
    await markButtonOf(page, "Tom Berg").trigger("click");
    await flushPromises();

    expect(markOrganizerPayoutTransferred).toHaveBeenCalledWith({ organizerId: "tom" });
    expect(page.findAll('[data-testid="mark-payout-done"]')).toHaveLength(1);
  });

  it("explains a platform without any earnings", async () => {
    const page = await mountPayouts([]);

    expect(page.get('[data-testid="payouts-empty"]').text()).toBe(
      "No organiser has earned anything yet.",
    );
  });

  it("reports a failed load", async () => {
    listOrganizerPayouts.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(PayoutsPage);
    await flushPromises();

    expect(page.text()).toContain("The payout list could not be loaded.");
  });
});

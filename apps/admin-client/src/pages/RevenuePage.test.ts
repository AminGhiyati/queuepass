import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RevenuePage from "@/pages/RevenuePage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getRevenueReport, getPlatformSettings, updatePlatformSettings } = vi.hoisted(() => ({
  getRevenueReport: vi.fn(),
  getPlatformSettings: vi.fn(),
  updatePlatformSettings: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    platform: {
      getRevenueReport: { query: getRevenueReport },
      getPlatformSettings: { query: getPlatformSettings },
      updatePlatformSettings: { mutate: updatePlatformSettings },
    },
  },
}));

const reportWithOneOrganizer = {
  organizers: [
    {
      organizerId: "clara",
      organizerName: "Clara Vogt",
      organizerEmail: "clara@example.com",
      ticketsSold: 6,
      grossCents: 15_000,
      platformFeeCents: 750,
      payoutCents: 14_250,
    },
  ],
  totals: {
    ticketsSold: 6,
    grossCents: 15_000,
    platformFeeCents: 750,
    payoutCents: 14_250,
  },
};

async function mountRevenue(report = reportWithOneOrganizer, feePercent = 5) {
  getRevenueReport.mockResolvedValue(report);
  getPlatformSettings.mockResolvedValue({ feePercent });

  const page = mountWithPlugins(RevenuePage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("RevenuePage", () => {
  it("shows what the platform took in", async () => {
    const page = await mountRevenue();

    expect(page.get('[data-testid="total-tickets"]').text()).toBe("6");
    expect(page.get('[data-testid="total-gross"]').text()).toContain("150.00");
    expect(page.get('[data-testid="total-fee"]').text()).toContain("7.50");
    expect(page.get('[data-testid="total-payout"]').text()).toContain("142.50");
  });

  it("lists one row per organizer", async () => {
    const page = await mountRevenue();

    expect(page.findAll('[data-testid="revenue-row"]')).toHaveLength(1);
    expect(page.get('[data-testid="revenue-organizer"]').text()).toBe("Clara Vogt");
  });

  it("explains an empty platform", async () => {
    const page = await mountRevenue({
      organizers: [],
      totals: { ticketsSold: 0, grossCents: 0, platformFeeCents: 0, payoutCents: 0 },
    });

    expect(page.get('[data-testid="revenue-empty"]').text()).toBe("No paid orders yet.");
  });

  it("loads the configured fee into the form", async () => {
    const page = await mountRevenue(reportWithOneOrganizer, 12);

    expect(page.find<HTMLInputElement>("#fee").element.value).toBe("12");
  });

  it("shows no fee form before the stored fee arrived, so typing cannot be overwritten", async () => {
    getRevenueReport.mockResolvedValue(reportWithOneOrganizer);
    getPlatformSettings.mockReturnValue(new Promise(() => {}));

    const page = mountWithPlugins(RevenuePage);
    await flushPromises();

    expect(page.find("#fee").exists()).toBe(false);
    expect(page.text()).toContain("Loading the fee…");
  });

  it("saves a new fee", async () => {
    updatePlatformSettings.mockResolvedValue({ feePercent: 8 });

    const page = await mountRevenue();
    await page.find("#fee").setValue("8");
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(updatePlatformSettings).toHaveBeenCalledWith({ feePercent: 8 });
    expect(page.get('[data-testid="fee-saved"]').text()).toBe("Fee saved.");
  });

  it("cannot be saved while the fee is unchanged", async () => {
    const page = await mountRevenue(reportWithOneOrganizer, 5);

    expect(page.get('[data-testid="save-fee"]').attributes("disabled")).toBeDefined();
  });

  it("can be saved once the fee actually changed", async () => {
    const page = await mountRevenue(reportWithOneOrganizer, 5);

    await page.find("#fee").setValue("8");

    expect(page.get('[data-testid="save-fee"]').attributes("disabled")).toBeUndefined();
  });

  it("cannot be saved again right after saving", async () => {
    updatePlatformSettings.mockResolvedValue({ feePercent: 8 });
    getPlatformSettings.mockResolvedValue({ feePercent: 5 });

    const page = await mountRevenue(reportWithOneOrganizer, 5);
    await page.find("#fee").setValue("8");
    getPlatformSettings.mockResolvedValue({ feePercent: 8 });
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(updatePlatformSettings).toHaveBeenCalledOnce();
    expect(page.get('[data-testid="save-fee"]').attributes("disabled")).toBeDefined();
  });

  it("can be saved again after typing the fee back", async () => {
    updatePlatformSettings.mockResolvedValue({ feePercent: 8 });

    const page = await mountRevenue(reportWithOneOrganizer, 5);
    await page.find("#fee").setValue("8");
    getPlatformSettings.mockResolvedValue({ feePercent: 8 });
    await page.find("form").trigger("submit");
    await flushPromises();

    await page.find("#fee").setValue("5");

    expect(page.get('[data-testid="save-fee"]').attributes("disabled")).toBeUndefined();
    expect(page.find('[data-testid="fee-saved"]').exists()).toBe(false);
  });

  it("refuses a fee outside the allowed range", async () => {
    const page = await mountRevenue(reportWithOneOrganizer, 5);

    await page.find("#fee").setValue("80");

    expect(page.get('[data-testid="save-fee"]').attributes("disabled")).toBeDefined();
    expect(page.get('[data-testid="fee-invalid"]').text()).toBe(
      "Enter a whole number between 0 and 50.",
    );
  });

  it("refuses an emptied fee field", async () => {
    const page = await mountRevenue(reportWithOneOrganizer, 5);

    await page.find("#fee").setValue("");

    expect(page.get('[data-testid="save-fee"]').attributes("disabled")).toBeDefined();
  });

  it("reports a fee that could not be saved", async () => {
    updatePlatformSettings.mockRejectedValue(new Error("FORBIDDEN"));

    const page = await mountRevenue();
    await page.find("#fee").setValue("8");
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="fee-failed"]').text()).toBe("The fee could not be saved.");
  });

  it("reports a failed load", async () => {
    getRevenueReport.mockRejectedValue(new Error("offline"));
    getPlatformSettings.mockResolvedValue({ feePercent: 5 });

    const page = mountWithPlugins(RevenuePage);
    await flushPromises();

    expect(page.text()).toContain("The revenue report could not be loaded.");
  });
});

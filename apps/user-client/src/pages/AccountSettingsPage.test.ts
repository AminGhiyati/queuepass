import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountSettingsPage from "@/pages/AccountSettingsPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getMyPayoutSettings, updateMyPayoutIban } = vi.hoisted(() => ({
  getMyPayoutSettings: vi.fn(),
  updateMyPayoutIban: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    payout: {
      getMyPayoutSettings: { query: getMyPayoutSettings },
      updateMyPayoutIban: { mutate: updateMyPayoutIban },
    },
  },
}));

const STORED_IBAN = "DE44500105175407324931";

async function mountAccountSettings(payoutIban: string | null = STORED_IBAN) {
  getMyPayoutSettings.mockResolvedValue({ payoutIban });

  const page = mountWithPlugins(AccountSettingsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("AccountSettingsPage", () => {
  it("shows the stored iban in the form", async () => {
    const page = await mountAccountSettings();

    expect(page.find<HTMLInputElement>("#iban").element.value).toBe(STORED_IBAN);
    expect(page.find('[data-testid="payout-iban-missing"]').exists()).toBe(false);
  });

  it("points out a missing iban, because no payout can happen without it", async () => {
    const page = await mountAccountSettings(null);

    expect(page.find<HTMLInputElement>("#iban").element.value).toBe("");
    expect(page.get('[data-testid="payout-iban-missing"]').text()).toContain("No IBAN stored yet");
  });

  it("shows no form before the stored iban arrived, so typing cannot be overwritten", async () => {
    getMyPayoutSettings.mockReturnValue(new Promise(() => {}));

    const page = mountWithPlugins(AccountSettingsPage);
    await flushPromises();

    expect(page.find("#iban").exists()).toBe(false);
    expect(page.text()).toContain("Loading your payout details…");
  });

  it("stores a new iban", async () => {
    updateMyPayoutIban.mockResolvedValue({ payoutIban: "GB33BUKB20201555555555" });

    const page = await mountAccountSettings(null);
    await page.find("#iban").setValue("GB33 BUKB 2020 1555 5555 55");
    getMyPayoutSettings.mockResolvedValue({ payoutIban: "GB33BUKB20201555555555" });
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(updateMyPayoutIban).toHaveBeenCalledWith({ iban: "GB33 BUKB 2020 1555 5555 55" });
    expect(page.get('[data-testid="iban-saved"]').text()).toBe("IBAN saved.");
  });

  it("cannot be saved while the iban is unchanged", async () => {
    const page = await mountAccountSettings();

    expect(page.get('[data-testid="save-iban"]').attributes("disabled")).toBeDefined();
  });

  it("can be saved once the iban actually changed", async () => {
    const page = await mountAccountSettings();

    await page.find("#iban").setValue("GB33BUKB20201555555555");

    expect(page.get('[data-testid="save-iban"]').attributes("disabled")).toBeUndefined();
  });

  it("cannot be saved while it is empty", async () => {
    const page = await mountAccountSettings(null);

    expect(page.get('[data-testid="save-iban"]').attributes("disabled")).toBeDefined();
  });

  it("names a rejected iban as the reason instead of blaming the connection", async () => {
    updateMyPayoutIban.mockRejectedValue(new Error("INVALID_IBAN"));

    const page = await mountAccountSettings(null);
    await page.find("#iban").setValue("DE44500105175407324932");
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="iban-error"]').text()).toBe(
      "This is not a valid IBAN. Please check it for typos.",
    );
  });

  it("reports an iban that could not be stored", async () => {
    updateMyPayoutIban.mockRejectedValue(new Error("offline"));

    const page = await mountAccountSettings(null);
    await page.find("#iban").setValue("GB33BUKB20201555555555");
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="iban-error"]').text()).toBe("The IBAN could not be saved.");
  });

  it("reports a failed load", async () => {
    getMyPayoutSettings.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(AccountSettingsPage);
    await flushPromises();

    expect(page.text()).toContain("Your payout details could not be loaded.");
  });
});

import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformOrdersPage from "@/pages/PlatformOrdersPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listAllOrders } = vi.hoisted(() => ({ listAllOrders: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { platform: { listAllOrders: { query: listAllOrders } } },
}));

function platformOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-id",
    quantity: 3,
    totalCents: 7500,
    platformFeeCents: 375,
    status: "PAID",
    paymentProvider: "SIMULATED",
    paidAt: new Date("2026-08-01T10:00:00.000Z"),
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
    eventId: "event-id",
    eventTitle: "Harbour Open Air",
    buyerName: "Anna Becker",
    buyerEmail: "anna@example.com",
    ...overrides,
  };
}

async function mountOrders(orders = [platformOrder()]) {
  listAllOrders.mockResolvedValue(orders);

  const page = mountWithPlugins(PlatformOrdersPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("PlatformOrdersPage", () => {
  it("shows the order with its total and the fee we charged", async () => {
    const page = await mountOrders();

    expect(page.get('[data-testid="platform-order-event"]').text()).toBe("Harbour Open Air");
    expect(page.get('[data-testid="platform-order-total"]').text()).toContain("75.00");
    expect(page.get('[data-testid="platform-order-fee"]').text()).toContain("3.75");
  });

  it("names the payment status", async () => {
    const page = await mountOrders([platformOrder({ status: "PENDING" })]);

    expect(page.get('[data-testid="platform-order-status"]').text()).toBe("Pending");
  });

  it("finds an order by its buyer", async () => {
    const page = await mountOrders([
      platformOrder({ id: "first", buyerName: "Anna Becker" }),
      platformOrder({ id: "second", buyerName: "Bruno Weiss" }),
    ]);

    await page.find("#order-search").setValue("bruno");

    expect(page.findAll('[data-testid="platform-order-row"]')).toHaveLength(1);
  });

  it("says when the search matches nothing", async () => {
    const page = await mountOrders();

    await page.find("#order-search").setValue("nothing here");

    expect(page.get('[data-testid="platform-orders-no-match"]').text()).toBe(
      "No order matches your search.",
    );
  });

  it("explains an empty platform", async () => {
    const page = await mountOrders([]);

    expect(page.get('[data-testid="platform-orders-empty"]').text()).toBe("No orders yet.");
  });

  it("reports a failed load", async () => {
    listAllOrders.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(PlatformOrdersPage);
    await flushPromises();

    expect(page.text()).toContain("The order list could not be loaded.");
  });
});

import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrderStatusPage from "@/pages/OrderStatusPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getMyOrder, routeQuery } = vi.hoisted(() => ({
  getMyOrder: vi.fn(),
  routeQuery: { value: {} as Record<string, string> },
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { order: { getMyOrder: { query: getMyOrder } } },
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { orderId: "order-id" }, query: routeQuery.value }),
}));

type OrderOverrides = Partial<{
  status: "PENDING" | "PAID" | "CANCELLED";
  quantity: number;
  totalCents: number;
}>;

function storedOrder({ status = "PENDING", ...overrides }: OrderOverrides = {}) {
  return {
    id: "order-id",
    status,
    quantity: 2,
    totalCents: 5000,
    isPaid: status === "PAID",
    eventId: "event-id",
    eventTitle: "Harbour Open Air",
    ...overrides,
  };
}

async function mountOrderStatus(order: ReturnType<typeof storedOrder> | Error = storedOrder()) {
  if (order instanceof Error) {
    getMyOrder.mockRejectedValue(order);
  } else {
    getMyOrder.mockResolvedValue(order);
  }

  const page = mountWithPlugins(OrderStatusPage);
  await flushPromises();

  return page;
}

beforeEach(() => {
  vi.clearAllMocks();
  routeQuery.value = {};
});

describe("OrderStatusPage", () => {
  it("confirms a payment that arrived", async () => {
    const page = await mountOrderStatus(storedOrder({ status: "PAID" }));

    expect(page.get('[data-testid="order-state"]').text()).toContain("Payment received");
    expect(page.find('[data-testid="order-show-tickets"]').exists()).toBe(true);
  });

  it("waits for a payment that is still on its way", async () => {
    const page = await mountOrderStatus();

    expect(page.get('[data-testid="order-state"]').text()).toContain("Waiting for your payment");
    expect(page.find('[data-testid="order-show-tickets"]').exists()).toBe(false);
  });

  it("offers to pay again to a buyer who left the payment page", async () => {
    routeQuery.value = { checkout: "cancelled" };

    const page = await mountOrderStatus();

    expect(page.get('[data-testid="order-state"]').text()).toContain("You left the payment page");
    expect(page.get('[data-testid="order-pay-again"]').text()).toBe("Pay now");
  });

  it("says that an unpaid reservation went back on sale", async () => {
    const page = await mountOrderStatus(storedOrder({ status: "CANCELLED" }));

    expect(page.get('[data-testid="order-state"]').text()).toContain(
      "The reservation was released",
    );
    expect(page.find('[data-testid="order-back-to-event"]').exists()).toBe(true);
  });

  it("shows what was ordered", async () => {
    const page = await mountOrderStatus(storedOrder({ status: "PAID" }));

    expect(page.get('[data-testid="order-quantity"]').text()).toBe("2");
    expect(page.get('[data-testid="order-total"]').text()).toContain("50.00");
    expect(page.text()).toContain("Harbour Open Air");
  });

  it("names a free order free instead of showing a zero total", async () => {
    const page = await mountOrderStatus(storedOrder({ status: "PAID", totalCents: 0 }));

    expect(page.get('[data-testid="order-total"]').text()).toBe("Free");
  });

  it("keeps the order of somebody else out of sight", async () => {
    const page = await mountOrderStatus(new Error("NOT_FOUND"));

    expect(page.get('[data-testid="order-load-failed"]').text()).toBe(
      "This order could not be loaded.",
    );
  });

  it("asks the api for the order in the address bar", async () => {
    await mountOrderStatus();

    expect(getMyOrder).toHaveBeenCalledWith({ orderId: "order-id" });
  });
});

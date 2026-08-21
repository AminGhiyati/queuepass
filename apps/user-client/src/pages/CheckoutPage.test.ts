import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "@/pages/CheckoutPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getPublishedEvent, createOrder, navigateTo } = vi.hoisted(() => ({
  getPublishedEvent: vi.fn(),
  createOrder: vi.fn(),
  navigateTo: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    event: { getPublishedEvent: { query: getPublishedEvent } },
    order: { createOrder: { mutate: createOrder } },
  },
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: navigateTo }),
  useRoute: () => ({ params: { eventId: "event-id" } }),
}));

async function mountCheckout(event = publicEvent()) {
  getPublishedEvent.mockResolvedValue(event);

  const page = mountWithPlugins(CheckoutPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("CheckoutPage", () => {
  it("buys one ticket by default", async () => {
    createOrder.mockResolvedValue({ orderId: "order-id", isPaid: true });

    const page = await mountCheckout();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(createOrder).toHaveBeenCalledWith({ eventId: "event-id", quantity: 1 });
  });

  it("buys the chosen number of tickets", async () => {
    createOrder.mockResolvedValue({ orderId: "order-id", isPaid: true });

    const page = await mountCheckout();
    await page.find("#quantity").setValue("4");
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(createOrder).toHaveBeenCalledWith({ eventId: "event-id", quantity: 4 });
  });

  it("multiplies the price by the number of tickets", async () => {
    const page = await mountCheckout(publicEvent({ priceCents: 2500 }));

    await page.find("#quantity").setValue("3");

    expect(page.get('[data-testid="checkout-total"]').text()).toContain("75.00");
  });

  it("caps the number input at ten tickets per order", async () => {
    const page = await mountCheckout(publicEvent({ availableCount: 400 }));

    expect(page.find("#quantity").attributes("max")).toBe("10");
    expect(page.text()).toContain("1 to 10 per order.");
  });

  it("caps the number input at the tickets that are left", async () => {
    const page = await mountCheckout(publicEvent({ availableCount: 3 }));

    expect(page.find("#quantity").attributes("max")).toBe("3");
  });

  it("refuses to buy more tickets than are left", async () => {
    const page = await mountCheckout(publicEvent({ availableCount: 3 }));

    await page.find("#quantity").setValue("4");

    expect(page.get('[data-testid="confirm-purchase"]').attributes("disabled")).toBeDefined();
  });

  it("refuses a quantity of zero", async () => {
    const page = await mountCheckout();

    await page.find("#quantity").setValue("0");

    expect(page.get('[data-testid="confirm-purchase"]').attributes("disabled")).toBeDefined();
  });

  it("refuses a fractional quantity", async () => {
    const page = await mountCheckout();

    await page.find("#quantity").setValue("1.5");

    expect(page.get('[data-testid="confirm-purchase"]').attributes("disabled")).toBeDefined();
  });

  it("opens the ticket list after a successful purchase", async () => {
    createOrder.mockResolvedValue({ orderId: "order-id", isPaid: true });

    const page = await mountCheckout();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(navigateTo).toHaveBeenCalledWith({ name: "myTickets" });
  });

  it("sends the buyer to the payment page when the payment happens off site", async () => {
    createOrder.mockResolvedValue({
      orderId: "order-id",
      isPaid: false,
      redirectUrl: "https://checkout.stripe.com/c/pay/1",
    });
    const redirect = vi.spyOn(window.location, "assign").mockImplementation(() => {});

    const page = await mountCheckout();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/1");
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("opens the order while a payment is still on its way", async () => {
    createOrder.mockResolvedValue({ orderId: "order-id", isPaid: false, redirectUrl: null });

    const page = await mountCheckout();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(navigateTo).toHaveBeenCalledWith({
      name: "orderStatus",
      params: { orderId: "order-id" },
    });
  });

  it("explains that someone else took the last tickets", async () => {
    createOrder.mockRejectedValue(new Error("NOT_ENOUGH_TICKETS_LEFT"));

    const page = await mountCheckout();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="checkout-error"]').text()).toBe(
      "There are not that many tickets left.",
    );
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("explains that the ticket price is too low to be charged", async () => {
    createOrder.mockRejectedValue(new Error("PRICE_BELOW_MINIMUM"));

    const page = await mountCheckout();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="checkout-error"]').text()).toBe(
      "These tickets cannot be sold at their current price.",
    );
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("offers no purchase for a sold out event", async () => {
    const page = await mountCheckout(publicEvent({ isSoldOut: true, availableCount: 0 }));

    expect(page.find('[data-testid="confirm-purchase"]').exists()).toBe(false);
    expect(page.get('[data-testid="checkout-unavailable"]').text()).toBe(
      "This event is sold out.",
    );
  });

  it("offers no purchase for an event that is over", async () => {
    const page = await mountCheckout(publicEvent({ hasEnded: true }));

    expect(page.find('[data-testid="confirm-purchase"]').exists()).toBe(false);
    expect(page.get('[data-testid="checkout-unavailable"]').text()).toBe(
      "This event is over, tickets are no longer on sale.",
    );
  });

  it("offers no purchase for a cancelled event", async () => {
    const page = await mountCheckout(publicEvent({ status: "CANCELLED" }));

    expect(page.find('[data-testid="confirm-purchase"]').exists()).toBe(false);
    expect(page.get('[data-testid="checkout-unavailable"]').text()).toContain("was cancelled");
  });

  it("names a free event free instead of showing a zero total", async () => {
    const page = await mountCheckout(publicEvent({ priceCents: 0 }));

    expect(page.get('[data-testid="checkout-total"]').text()).toBe("Free");
  });
});

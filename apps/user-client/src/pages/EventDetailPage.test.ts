import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "@/pages/EventDetailPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getPublishedEvent } = vi.hoisted(() => ({ getPublishedEvent: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { event: { getPublishedEvent: { query: getPublishedEvent } } },
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { eventId: "event-id" } }) }));

async function mountDetail() {
  const page = mountWithPlugins(EventDetailPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("EventDetailPage", () => {
  it("asks for the event named in the route", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent());

    await mountDetail();

    expect(getPublishedEvent).toHaveBeenCalledWith({ eventId: "event-id" });
  });

  it("shows the details a visitor needs before buying", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent());

    const page = await mountDetail();

    expect(page.get('[data-testid="event-title"]').text()).toBe("Harbour Open Air");
    expect(page.text()).toContain("Hamburg");
    expect(page.text()).toContain("Clara Vogt");
    expect(page.get('[data-testid="event-price"]').text()).toContain("25.00");
  });

  it("counts the remaining tickets", async () => {
    getPublishedEvent.mockResolvedValue(
      publicEvent({ capacity: 400, soldCount: 120, availableCount: 280 }),
    );

    const page = await mountDetail();

    expect(page.get('[data-testid="event-availability"]').text()).toBe(
      "280 of 400 tickets left",
    );
  });

  it("says sold out instead of counting to zero", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent({ isSoldOut: true, availableCount: 0 }));

    const page = await mountDetail();

    expect(page.get('[data-testid="event-availability"]').text()).toBe("Sold out");
  });

  it("warns that a cancelled event will not happen", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent({ status: "CANCELLED" }));

    const page = await mountDetail();

    expect(page.get('[data-testid="event-cancelled"]').text()).toContain("was cancelled");
  });

  it("shows no cancellation notice for an event that is on sale", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent());

    const page = await mountDetail();

    expect(page.find('[data-testid="event-cancelled"]').exists()).toBe(false);
  });

  it("leads to the checkout while tickets are on sale", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent());

    const page = await mountDetail();

    expect(page.get('[data-testid="buy-ticket"]').text()).toBe("Buy ticket");
  });

  it("offers no purchase for a sold out event", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent({ isSoldOut: true }));

    const page = await mountDetail();

    expect(page.find('[data-testid="buy-ticket"]').exists()).toBe(false);
    expect(page.get('[data-testid="buy-unavailable"]').text()).toBe("Sold out");
  });

  it("offers no purchase for an event that is over", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent({ hasEnded: true }));

    const page = await mountDetail();

    expect(page.find('[data-testid="buy-ticket"]').exists()).toBe(false);
    expect(page.get('[data-testid="buy-unavailable"]').text()).toBe("This event is over.");
  });

  it("offers no purchase for a cancelled event", async () => {
    getPublishedEvent.mockResolvedValue(publicEvent({ status: "CANCELLED" }));

    const page = await mountDetail();

    expect(page.find('[data-testid="buy-ticket"]').exists()).toBe(false);
  });

  it("reports an event that does not exist", async () => {
    getPublishedEvent.mockRejectedValue(new Error("NOT_FOUND"));

    const page = await mountDetail();

    expect(page.text()).toContain("This event does not exist");
  });
});

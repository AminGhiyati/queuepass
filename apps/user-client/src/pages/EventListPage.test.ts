import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventListPage from "@/pages/EventListPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listPublishedEvents } = vi.hoisted(() => ({ listPublishedEvents: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { event: { listPublishedEvents: { query: listPublishedEvents } } },
}));

async function mountList() {
  const page = mountWithPlugins(EventListPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("EventListPage", () => {
  it("shows every event that is on sale", async () => {
    listPublishedEvents.mockResolvedValue([
      publicEvent({ id: "first", title: "Harbour Open Air" }),
      publicEvent({ id: "second", title: "Winter Jazz" }),
    ]);

    const page = await mountList();

    expect(page.findAll('[data-testid="event-card"]')).toHaveLength(2);
    expect(page.text()).toContain("Winter Jazz");
  });

  it("explains an empty catalogue", async () => {
    listPublishedEvents.mockResolvedValue([]);

    const page = await mountList();

    expect(page.get('[data-testid="events-empty"]').text()).toBe(
      "No events are on sale right now. Check back soon.",
    );
  });

  it("passes the search term to the server", async () => {
    listPublishedEvents.mockResolvedValue([]);

    const page = await mountList();
    await page.find("#search").setValue("hamburg");
    await flushPromises();

    expect(listPublishedEvents).toHaveBeenLastCalledWith({ search: "hamburg" });
  });

  it("distinguishes an empty search result from an empty catalogue", async () => {
    listPublishedEvents.mockResolvedValue([]);

    const page = await mountList();
    await page.find("#search").setValue("nothing matches this");
    await flushPromises();

    expect(page.get('[data-testid="events-empty"]').text()).toBe(
      "No event matches your search.",
    );
  });

  it("reports a failed load", async () => {
    listPublishedEvents.mockRejectedValue(new Error("offline"));

    const page = await mountList();

    expect(page.text()).toContain("Events could not be loaded.");
  });
});

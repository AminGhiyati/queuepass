import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PastEventsPage from "@/pages/PastEventsPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listMyEvents } = vi.hoisted(() => ({ listMyEvents: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { event: { listMyEvents: { query: listMyEvents } } },
}));

async function mountPastEvents(events = [publicEvent({ status: "PUBLISHED", hasEnded: true })]) {
  listMyEvents.mockResolvedValue(events);

  const page = mountWithPlugins(PastEventsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("PastEventsPage", () => {
  it("asks only for the events that are over", async () => {
    await mountPastEvents();

    expect(listMyEvents).toHaveBeenCalledWith({ timeframe: "PAST" });
  });

  it("lists every past event with its ticket sales", async () => {
    const page = await mountPastEvents([
      publicEvent({ id: "spring", title: "Spring Rave", soldCount: 42, capacity: 400 }),
      publicEvent({ id: "winter", title: "Winter Jazz" }),
    ]);

    expect(page.findAll('[data-testid="organizer-event-row"]')).toHaveLength(2);
    expect(page.text()).toContain("Spring Rave");
    expect(page.get('[data-testid="organizer-event-sales"]').text()).toBe("42 of 400 sold");
  });

  it("marks an event that is over as over instead of on sale", async () => {
    const page = await mountPastEvents([publicEvent({ status: "PUBLISHED", hasEnded: true })]);

    expect(page.get('[data-testid="organizer-event-status"]').text()).toBe("Over");
  });

  it("keeps a cancelled event marked as cancelled, though its date is still ahead", async () => {
    const page = await mountPastEvents([publicEvent({ status: "CANCELLED", hasEnded: false })]);

    expect(page.get('[data-testid="organizer-event-status"]').text()).toBe("Cancelled");
  });

  it("keeps the attendee list of a past event reachable", async () => {
    const page = await mountPastEvents();

    expect(page.text()).toContain("Attendees");
  });

  it("offers no action that would change a past event", async () => {
    const page = await mountPastEvents([publicEvent({ status: "PUBLISHED", hasEnded: true })]);

    expect(page.find('[data-testid="cancel-event"]').exists()).toBe(false);
    expect(page.find('[data-testid="publish-event"]').exists()).toBe(false);
    expect(page.find('[data-testid="delete-event"]').exists()).toBe(false);
  });

  it("says when nothing is over yet", async () => {
    const page = await mountPastEvents([]);

    expect(page.get('[data-testid="past-events-empty"]').text()).toBe(
      "None of your events is over or cancelled yet.",
    );
  });

  it("reports that the archive could not be loaded", async () => {
    listMyEvents.mockRejectedValue(new Error("FORBIDDEN"));

    const page = mountWithPlugins(PastEventsPage);
    await flushPromises();

    expect(page.text()).toContain("Your past events could not be loaded.");
  });
});

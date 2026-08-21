import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformEventsPage from "@/pages/PlatformEventsPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listAllEvents } = vi.hoisted(() => ({ listAllEvents: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { platform: { listAllEvents: { query: listAllEvents } } },
}));

function platformEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-id",
    title: "Harbour Open Air",
    location: "Hamburg",
    startsAt: new Date("2026-09-01T18:00:00.000Z"),
    status: "PUBLISHED",
    priceCents: 2500,
    capacity: 400,
    soldCount: 42,
    organizerName: "Clara Vogt",
    organizerEmail: "clara@example.com",
    ...overrides,
  };
}

async function mountEvents(events = [platformEvent()]) {
  listAllEvents.mockResolvedValue(events);

  const page = mountWithPlugins(PlatformEventsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("PlatformEventsPage", () => {
  it("lists every event with its organizer and sales", async () => {
    const page = await mountEvents();

    expect(page.get('[data-testid="platform-event-title"]').text()).toBe("Harbour Open Air");
    expect(page.text()).toContain("clara@example.com");
    expect(page.text()).toContain("42 / 400");
  });

  it("shows drafts too, so the platform sees what is coming", async () => {
    const page = await mountEvents([platformEvent({ status: "DRAFT" })]);

    expect(page.get('[data-testid="platform-event-status"]').text()).toBe("Draft");
  });

  it("names a free event free", async () => {
    const page = await mountEvents([platformEvent({ priceCents: 0 })]);

    expect(page.text()).toContain("Free");
  });

  it("finds an event by its organizer", async () => {
    const page = await mountEvents([
      platformEvent({ id: "first", organizerName: "Clara Vogt" }),
      platformEvent({ id: "second", organizerName: "Bruno Weiss" }),
    ]);

    await page.find("#event-search").setValue("bruno");

    expect(page.findAll('[data-testid="platform-event-row"]')).toHaveLength(1);
  });

  it("says when the search matches nothing", async () => {
    const page = await mountEvents();

    await page.find("#event-search").setValue("nothing here");

    expect(page.get('[data-testid="platform-events-no-match"]').text()).toBe(
      "No event matches your search.",
    );
  });

  it("explains an empty platform", async () => {
    const page = await mountEvents([]);

    expect(page.get('[data-testid="platform-events-empty"]').text()).toBe("No events yet.");
  });

  it("reports a failed load", async () => {
    listAllEvents.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(PlatformEventsPage);
    await flushPromises();

    expect(page.text()).toContain("The event list could not be loaded.");
  });
});

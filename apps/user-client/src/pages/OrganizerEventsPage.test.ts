import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizerEventsPage from "@/pages/OrganizerEventsPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listMyEvents, publishEvent, cancelEvent, deleteEvent } = vi.hoisted(() => ({
  listMyEvents: vi.fn(),
  publishEvent: vi.fn(),
  cancelEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    event: {
      listMyEvents: { query: listMyEvents },
      publishEvent: { mutate: publishEvent },
      cancelEvent: { mutate: cancelEvent },
      deleteEvent: { mutate: deleteEvent },
    },
  },
}));

async function mountOrganizerEvents(events = [publicEvent({ status: "DRAFT" })]) {
  listMyEvents.mockResolvedValue(events);

  const page = mountWithPlugins(OrganizerEventsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("OrganizerEventsPage", () => {
  it("lists the events of the organizer with their status", async () => {
    const page = await mountOrganizerEvents([
      publicEvent({ id: "draft", title: "Harbour Open Air", status: "DRAFT" }),
      publicEvent({ id: "live", title: "Winter Jazz", status: "PUBLISHED" }),
    ]);

    expect(page.findAll('[data-testid="organizer-event-row"]')).toHaveLength(2);
    expect(page.findAll('[data-testid="organizer-event-status"]').map((tag) => tag.text())).toEqual([
      "Draft",
      "On sale",
    ]);
  });

  it("shows how many tickets are sold", async () => {
    const page = await mountOrganizerEvents([publicEvent({ soldCount: 42, capacity: 400 })]);

    expect(page.get('[data-testid="organizer-event-sales"]').text()).toBe("42 of 400 sold");
  });

  it("puts a draft on sale", async () => {
    publishEvent.mockResolvedValue(publicEvent({ status: "PUBLISHED" }));

    const page = await mountOrganizerEvents([publicEvent({ id: "draft", status: "DRAFT" })]);
    await page.get('[data-testid="publish-event"]').trigger("click");
    await flushPromises();

    expect(publishEvent).toHaveBeenCalledWith({ eventId: "draft" });
  });

  it("offers cancelling only for an event that is on sale", async () => {
    const page = await mountOrganizerEvents([publicEvent({ status: "PUBLISHED" })]);

    expect(page.find('[data-testid="cancel-event"]').exists()).toBe(true);
    expect(page.find('[data-testid="publish-event"]').exists()).toBe(false);
    expect(page.find('[data-testid="delete-event"]').exists()).toBe(false);
  });

  it("names the tickets and the money at stake before cancelling anything", async () => {
    const page = await mountOrganizerEvents([
      publicEvent({ status: "PUBLISHED", soldCount: 12, capacity: 400, priceCents: 2500 }),
    ]);
    await page.get('[data-testid="cancel-event"]').trigger("click");

    expect(page.get('[data-testid="cancel-event-warning"]').text()).toContain("12 of 400");
    expect(page.get('[data-testid="cancel-event-warning"]').text()).toContain("€300.00");
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  it("cancels the event only after the organizer confirms", async () => {
    cancelEvent.mockResolvedValue({
      refundedOrderCount: 3,
      failedRefundCount: 0,
      refundedCents: 7500,
    });

    const page = await mountOrganizerEvents([publicEvent({ id: "live", status: "PUBLISHED" })]);
    await page.get('[data-testid="cancel-event"]').trigger("click");
    await page.get('[data-testid="confirm-cancel-event"]').trigger("click");
    await flushPromises();

    expect(cancelEvent).toHaveBeenCalledWith({ eventId: "live" });
    expect(page.get('[data-testid="cancel-event-summary"]').text()).toContain(
      "€75.00 refunded to 3 buyers",
    );
  });

  it("keeps the event when the organizer backs out", async () => {
    const page = await mountOrganizerEvents([publicEvent({ status: "PUBLISHED" })]);
    await page.get('[data-testid="cancel-event"]').trigger("click");
    await page
      .findAll("button")
      .find((button) => button.text() === "Keep event")
      ?.trigger("click");

    expect(page.find('[data-testid="cancel-event-warning"]').exists()).toBe(false);
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  it("says how many refunds need to be sorted out by hand", async () => {
    cancelEvent.mockResolvedValue({
      refundedOrderCount: 2,
      failedRefundCount: 1,
      refundedCents: 5000,
    });

    const page = await mountOrganizerEvents([publicEvent({ status: "PUBLISHED" })]);
    await page.get('[data-testid="cancel-event"]').trigger("click");
    await page.get('[data-testid="confirm-cancel-event"]').trigger("click");
    await flushPromises();

    expect(page.get('[data-testid="cancel-refund-failed"]').text()).toContain("1 refund did not");
  });

  it("offers deleting only for a draft, because a published event may have tickets", async () => {
    const page = await mountOrganizerEvents([publicEvent({ status: "DRAFT" })]);

    expect(page.find('[data-testid="delete-event"]').exists()).toBe(true);
  });

  it("reports a failed action instead of failing silently", async () => {
    publishEvent.mockRejectedValue(new Error("BAD_REQUEST"));

    const page = await mountOrganizerEvents([publicEvent({ status: "DRAFT" })]);
    await page.get('[data-testid="publish-event"]').trigger("click");
    await flushPromises();

    expect(page.text()).toContain("That did not work.");
  });

  it("asks only for the events that are still ahead", async () => {
    await mountOrganizerEvents();

    expect(listMyEvents).toHaveBeenCalledWith({ timeframe: "UPCOMING" });
  });

  it("points to the events that are already over", async () => {
    const page = await mountOrganizerEvents();

    expect(page.get('[data-testid="past-events-link"]').text()).toBe("Past events");
  });

  it("invites the organizer to create their first event", async () => {
    const page = await mountOrganizerEvents([]);

    expect(page.get('[data-testid="organizer-events-empty"]').text()).toBe(
      "You have no upcoming events.",
    );
  });
});

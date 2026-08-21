import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PastTicketsPage from "@/pages/PastTicketsPage.vue";
import { myTicket } from "@/testing/ticketFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listMyTickets } = vi.hoisted(() => ({ listMyTickets: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { ticket: { listMyTickets: { query: listMyTickets } } },
}));

async function mountPastTickets(tickets = [myTicket()]) {
  listMyTickets.mockResolvedValue(tickets);

  const page = mountWithPlugins(PastTicketsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("PastTicketsPage", () => {
  it("asks only for the tickets of events that are over", async () => {
    await mountPastTickets();

    expect(listMyTickets).toHaveBeenCalledWith({ timeframe: "PAST" });
  });

  it("lists every past ticket with its event", async () => {
    const page = await mountPastTickets([
      myTicket({ id: "spring" }),
      myTicket({ id: "winter", event: { ...myTicket().event, title: "Winter Jazz" } }),
    ]);

    expect(page.findAll('[data-testid="ticket-row"]')).toHaveLength(2);
    expect(page.text()).toContain("Winter Jazz");
  });

  it("still opens the ticket itself, so the buyer keeps their receipt", async () => {
    const page = await mountPastTickets();

    expect(page.text()).toContain("Show ticket");
  });

  it("says when no event of the buyer is over yet", async () => {
    const page = await mountPastTickets([]);

    expect(page.get('[data-testid="past-tickets-empty"]').text()).toBe(
      "None of your events is over yet.",
    );
  });

  it("reports a failed load", async () => {
    listMyTickets.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(PastTicketsPage);
    await flushPromises();

    expect(page.text()).toContain("Your past tickets could not be loaded.");
  });
});

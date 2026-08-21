import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyTicketsPage from "@/pages/MyTicketsPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";
import { myTicket } from "@/testing/ticketFixtures";

const { listMyTickets } = vi.hoisted(() => ({ listMyTickets: vi.fn() }));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { ticket: { listMyTickets: { query: listMyTickets } } },
}));

async function mountMyTickets(tickets = [myTicket()]) {
  listMyTickets.mockResolvedValue(tickets);

  const page = mountWithPlugins(MyTicketsPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("MyTicketsPage", () => {
  it("lists one row per ticket", async () => {
    const page = await mountMyTickets([
      myTicket({ id: "first" }),
      myTicket({ id: "second" }),
      myTicket({ id: "third" }),
    ]);

    expect(page.findAll('[data-testid="ticket-row"]')).toHaveLength(3);
  });

  it("names the event and where it happens", async () => {
    const page = await mountMyTickets();

    expect(page.get('[data-testid="ticket-event-title"]').text()).toBe("Harbour Open Air");
    expect(page.text()).toContain("Hamburg");
  });

  it("links to the ticket with its qr code", async () => {
    const page = await mountMyTickets();

    const ticketRow = page.get('[data-testid="ticket-row"]');

    expect(ticketRow.getComponent({ name: "RouterLink" }).props("to")).toEqual({
      name: "ticketDetail",
      params: { ticketId: "ticket-id" },
    });
  });

  it("marks a ticket that was already scanned", async () => {
    const page = await mountMyTickets([myTicket({ isCheckedIn: true })]);

    expect(page.get('[data-testid="ticket-checked-in"]').text()).toBe("Already scanned");
  });

  it("keeps a cancelled ticket in the list and marks it as cancelled", async () => {
    const page = await mountMyTickets([myTicket({ status: "CANCELLED", isValid: false })]);

    expect(page.get('[data-testid="ticket-cancelled"]').text()).toBe("Cancelled");
  });

  it("says nothing about scanning for a fresh ticket", async () => {
    const page = await mountMyTickets();

    expect(page.find('[data-testid="ticket-checked-in"]').exists()).toBe(false);
  });

  it("asks only for the tickets of events that are still ahead", async () => {
    await mountMyTickets();

    expect(listMyTickets).toHaveBeenCalledWith({ timeframe: "UPCOMING" });
  });

  it("points to the tickets of events that are over", async () => {
    const page = await mountMyTickets();

    expect(page.get('[data-testid="past-tickets-link"]').text()).toBe("Past tickets");
  });

  it("explains an empty ticket list", async () => {
    const page = await mountMyTickets([]);

    expect(page.get('[data-testid="my-tickets-empty"]').text()).toBe(
      "You have no tickets for upcoming events.",
    );
  });

  it("reports a failed load", async () => {
    listMyTickets.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(MyTicketsPage);
    await flushPromises();

    expect(page.text()).toContain("Your tickets could not be loaded.");
  });
});

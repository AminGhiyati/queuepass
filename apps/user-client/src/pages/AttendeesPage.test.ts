import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendeesPage from "@/pages/AttendeesPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";
import { eventAttendee } from "@/testing/ticketFixtures";

const { getMyEvent, listEventTickets, checkInTicket, undoTicketCheckIn } = vi.hoisted(() => ({
  getMyEvent: vi.fn(),
  listEventTickets: vi.fn(),
  checkInTicket: vi.fn(),
  undoTicketCheckIn: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    event: { getMyEvent: { query: getMyEvent } },
    ticket: { listEventTickets: { query: listEventTickets } },
    checkIn: {
      checkInTicket: { mutate: checkInTicket },
      undoTicketCheckIn: { mutate: undoTicketCheckIn },
    },
  },
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { eventId: "event-id" } }) }));

async function mountAttendees(attendees = [eventAttendee()], event = publicEvent()) {
  getMyEvent.mockResolvedValue({ ...event, imageKey: null });
  listEventTickets.mockResolvedValue(attendees);

  const page = mountWithPlugins(AttendeesPage);
  await flushPromises();

  return page;
}

beforeEach(() => vi.clearAllMocks());

describe("AttendeesPage", () => {
  it("lists one row per sold ticket", async () => {
    const page = await mountAttendees([
      eventAttendee({ id: "first" }),
      eventAttendee({ id: "second" }),
    ]);

    expect(page.findAll('[data-testid="attendee-row"]')).toHaveLength(2);
  });

  it("names the buyer with their email", async () => {
    const page = await mountAttendees();

    expect(page.get('[data-testid="attendee-name"]').text()).toBe("Anna Becker");
    expect(page.text()).toContain("anna@example.com");
  });

  it("names the event the list belongs to", async () => {
    const page = await mountAttendees();

    expect(page.text()).toContain("Harbour Open Air");
  });

  it("counts how many tickets were scanned", async () => {
    const page = await mountAttendees([
      eventAttendee({ id: "first", isCheckedIn: true }),
      eventAttendee({ id: "second", isCheckedIn: false }),
      eventAttendee({ id: "third", isCheckedIn: false }),
    ]);

    expect(page.get('[data-testid="attendees-summary"]').text()).toBe("1 of 3 tickets scanned");
  });

  it("marks each ticket as scanned or not", async () => {
    const page = await mountAttendees([
      eventAttendee({ id: "first", isCheckedIn: true }),
      eventAttendee({ id: "second", isCheckedIn: false }),
    ]);

    expect(page.findAll('[data-testid="attendee-status"]').map((cell) => cell.text())).toEqual([
      "Scanned",
      "Not scanned",
    ]);
  });

  it("explains that nothing has been sold yet", async () => {
    const page = await mountAttendees([]);

    expect(page.get('[data-testid="attendees-empty"]').text()).toBe(
      "No tickets have been sold yet.",
    );
  });

  it("finds an attendee by name", async () => {
    const page = await mountAttendees([
      eventAttendee({ id: "first", buyerName: "Anna Becker" }),
      eventAttendee({ id: "second", buyerName: "Bruno Weiss" }),
    ]);

    await page.find("#attendee-search").setValue("bruno");

    expect(page.findAll('[data-testid="attendee-row"]')).toHaveLength(1);
    expect(page.get('[data-testid="attendee-name"]').text()).toBe("Bruno Weiss");
  });

  it("finds an attendee by ticket code", async () => {
    const page = await mountAttendees([
      eventAttendee({ id: "first", code: "aaa111" }),
      eventAttendee({ id: "second", code: "bbb222" }),
    ]);

    await page.find("#attendee-search").setValue("bbb");

    expect(page.findAll('[data-testid="attendee-row"]')).toHaveLength(1);
  });

  it("says when the search matches nobody", async () => {
    const page = await mountAttendees();

    await page.find("#attendee-search").setValue("nobody by that name");

    expect(page.get('[data-testid="attendees-no-match"]').text()).toBe(
      "No attendee matches your search.",
    );
  });

  it("lets an attendee in by hand, without a scan", async () => {
    checkInTicket.mockResolvedValue({ outcome: "CHECKED_IN" });

    const page = await mountAttendees([eventAttendee({ code: "aaa111", isCheckedIn: false })]);
    await page.get('[data-testid="check-in-attendee"]').trigger("click");
    await flushPromises();

    expect(checkInTicket).toHaveBeenCalledWith({ eventId: "event-id", code: "aaa111" });
  });

  it("takes a check-in back", async () => {
    undoTicketCheckIn.mockResolvedValue({ isCheckedIn: false });

    const page = await mountAttendees([eventAttendee({ id: "ticket-id", isCheckedIn: true })]);
    await page.get('[data-testid="undo-check-in"]').trigger("click");
    await flushPromises();

    expect(undoTicketCheckIn).toHaveBeenCalledWith({
      eventId: "event-id",
      ticketId: "ticket-id",
    });
  });

  it("offers only the fitting action per ticket", async () => {
    const page = await mountAttendees([eventAttendee({ isCheckedIn: true })]);

    expect(page.find('[data-testid="undo-check-in"]').exists()).toBe(true);
    expect(page.find('[data-testid="check-in-attendee"]').exists()).toBe(false);
  });

  it("reports a failed action instead of failing silently", async () => {
    checkInTicket.mockRejectedValue(new Error("NOT_FOUND"));

    const page = await mountAttendees([eventAttendee({ isCheckedIn: false })]);
    await page.get('[data-testid="check-in-attendee"]').trigger("click");
    await flushPromises();

    expect(page.get('[data-testid="attendees-error"]').text()).toContain("did not work");
  });

  it("reports a failed load", async () => {
    getMyEvent.mockResolvedValue({ ...publicEvent(), imageKey: null });
    listEventTickets.mockRejectedValue(new Error("offline"));

    const page = mountWithPlugins(AttendeesPage);
    await flushPromises();

    expect(page.text()).toContain("The attendee list could not be loaded.");
  });
});

describe("AttendeesPage of an event that is over", () => {
  const eventThatIsOver = publicEvent({ hasEnded: true });

  it("says that the entrance is closed", async () => {
    const page = await mountAttendees([eventAttendee()], eventThatIsOver);

    expect(page.get('[data-testid="attendees-entrance-closed"]').text()).toBe(
      "This event is over. The entrance is closed, the list stays here to read.",
    );
  });

  it("offers no way to let an attendee in", async () => {
    const page = await mountAttendees(
      [
        eventAttendee({ id: "first", isCheckedIn: false }),
        eventAttendee({ id: "second", isCheckedIn: true }),
      ],
      eventThatIsOver,
    );

    expect(page.find('[data-testid="check-in-attendee"]').exists()).toBe(false);
    expect(page.find('[data-testid="undo-check-in"]').exists()).toBe(false);
  });

  it("drops the link to the entrance", async () => {
    const page = await mountAttendees([eventAttendee()], eventThatIsOver);

    expect(page.text()).not.toContain("Entrance");
  });

  it("keeps the sold tickets readable", async () => {
    const page = await mountAttendees(
      [eventAttendee({ id: "first", isCheckedIn: true }), eventAttendee({ id: "second" })],
      eventThatIsOver,
    );

    expect(page.findAll('[data-testid="attendee-row"]')).toHaveLength(2);
    expect(page.get('[data-testid="attendees-summary"]').text()).toBe("1 of 2 tickets scanned");
  });
});

describe("AttendeesPage of a cancelled event whose date is still ahead", () => {
  const cancelledEvent = publicEvent({ status: "CANCELLED", hasEnded: false });

  it("says that the entrance is closed", async () => {
    const page = await mountAttendees([eventAttendee()], cancelledEvent);

    expect(page.get('[data-testid="attendees-entrance-closed"]').text()).toBe(
      "This event is cancelled. The entrance is closed, the list stays here to read.",
    );
  });

  it("offers no way to let an attendee in", async () => {
    const page = await mountAttendees(
      [
        eventAttendee({ id: "first", isCheckedIn: false }),
        eventAttendee({ id: "second", isCheckedIn: true }),
      ],
      cancelledEvent,
    );

    expect(page.find('[data-testid="check-in-attendee"]').exists()).toBe(false);
    expect(page.find('[data-testid="undo-check-in"]').exists()).toBe(false);
  });

  it("drops the link to the entrance", async () => {
    const page = await mountAttendees([eventAttendee()], cancelledEvent);

    expect(page.text()).not.toContain("Entrance");
  });

  it("keeps the sold tickets readable", async () => {
    const page = await mountAttendees(
      [eventAttendee({ id: "first", isCheckedIn: true }), eventAttendee({ id: "second" })],
      cancelledEvent,
    );

    expect(page.findAll('[data-testid="attendee-row"]')).toHaveLength(2);
    expect(page.get('[data-testid="attendees-summary"]').text()).toBe("1 of 2 tickets scanned");
  });
});

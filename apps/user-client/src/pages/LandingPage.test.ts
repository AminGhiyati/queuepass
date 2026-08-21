import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/pages/LandingPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { listPublishedEvents, getCurrentUser, sessionState } = vi.hoisted(() => ({
  listPublishedEvents: vi.fn(),
  getCurrentUser: vi.fn(),
  sessionState: { value: null as { data: unknown } | null },
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    event: { listPublishedEvents: { query: listPublishedEvents } },
    user: { getCurrentUser: { query: getCurrentUser } },
  },
}));
vi.mock("@/lib/authClient", () => ({ useSession: () => sessionState }));

function signIn(role: "ATTENDEE" | "ORGANIZER" | "ADMIN") {
  sessionState.value = { data: { user: { id: "user-id" } } };
  getCurrentUser.mockResolvedValue({ id: "user-id", role });
}

async function mountLanding(events = [publicEvent()]) {
  listPublishedEvents.mockResolvedValue(events);

  const page = mountWithPlugins(LandingPage);
  await flushPromises();

  return page;
}

function linkTargetsOf(page: Awaited<ReturnType<typeof mountLanding>>) {
  return page.findAllComponents({ name: "RouterLink" }).map((link) => link.props("to"));
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.value = null;
});

describe("LandingPage", () => {
  it("states what the product does", async () => {
    const page = await mountLanding();

    expect(page.text()).toContain("Ticketing without the queue");
    expect(page.text()).toContain("Sell out your event");
  });

  it("names a benefit for organisers and one for guests", async () => {
    const page = await mountLanding();

    expect(page.text()).toContain("For organisers");
    expect(page.text()).toContain("For guests");
    expect(page.text()).toContain("Publish an event in minutes");
    expect(page.text()).toContain("Apple Wallet or Google Wallet");
  });

  it("shows a handful of events that are on sale", async () => {
    const page = await mountLanding([
      publicEvent({ id: "first", title: "Harbour Open Air" }),
      publicEvent({ id: "second", title: "Winter Jazz" }),
    ]);

    expect(page.findAll('[data-testid="event-card"]')).toHaveLength(2);
    expect(page.text()).toContain("On sale now");
  });

  it("asks the server for a short list, not the whole catalogue", async () => {
    await mountLanding();

    expect(listPublishedEvents).toHaveBeenCalledWith({ limit: 6 });
  });

  it("hides the event section entirely while nothing is on sale", async () => {
    const page = await mountLanding([]);

    expect(page.find('[data-testid="highlighted-events"]').exists()).toBe(false);
    expect(page.text()).toContain("Sell out your event");
  });

  it("always leads to the event list", async () => {
    const page = await mountLanding();

    expect(linkTargetsOf(page)).toContainEqual({ name: "events" });
  });

  it("sends a visitor without an account to organiser registration", async () => {
    const page = await mountLanding();

    expect(linkTargetsOf(page)).toContainEqual({
      name: "register",
      query: { role: "organizer" },
    });
  });

  it("sends a signed in attendee to the organiser upgrade instead of registration", async () => {
    signIn("ATTENDEE");

    const page = await mountLanding();
    const targets = linkTargetsOf(page);

    expect(targets).toContainEqual({ name: "becomeOrganizer" });
    expect(targets).not.toContainEqual({ name: "register", query: { role: "organizer" } });
  });

  it("sends a backoffice account to registration, not to the organiser upgrade", async () => {
    signIn("ADMIN");

    const page = await mountLanding();
    const targets = linkTargetsOf(page);

    expect(targets).toContainEqual({ name: "register", query: { role: "organizer" } });
    expect(targets).not.toContainEqual({ name: "becomeOrganizer" });
  });

  it("sends an organiser straight to their events", async () => {
    signIn("ORGANIZER");

    const page = await mountLanding();
    const targets = linkTargetsOf(page);

    expect(targets).toContainEqual({ name: "organizerEvents" });
    expect(targets).not.toContainEqual({ name: "becomeOrganizer" });
  });
});

import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MainNavigation from "@/components/MainNavigation.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getCurrentUser, signOutOfSession, navigateTo, sessionState } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  signOutOfSession: vi.fn(),
  navigateTo: vi.fn(),
  sessionState: { value: null as { data: unknown } | null },
}));

vi.mock("@/lib/authClient", () => ({
  useSession: () => sessionState,
  signOut: signOutOfSession,
}));
vi.mock("@/lib/trpcClient", () => ({
  trpc: { user: { getCurrentUser: { query: getCurrentUser } } },
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: navigateTo }) }));

async function mountNavigation() {
  const navigation = mountWithPlugins(MainNavigation);
  await flushPromises();

  return navigation;
}

function buttonLabelled(navigation: Awaited<ReturnType<typeof mountNavigation>>, label: string) {
  const button = navigation.findAll("button").find((candidate) => candidate.text() === label);

  if (!button) {
    throw new Error(`No button labelled "${label}"`);
  }

  return button;
}

function signIn(role: "ATTENDEE" | "ORGANIZER" | "ADMIN") {
  sessionState.value = { data: { user: { id: "user-id" } } };
  getCurrentUser.mockResolvedValue({ id: "user-id", role });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.value = null;
});

describe("MainNavigation", () => {
  it("keeps the mobile menu closed until the burger is pressed", async () => {
    const navigation = await mountNavigation();

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(false);

    await navigation.get('[data-testid="menu-toggle"]').trigger("click");

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(true);
  });

  it("tells assistive technology whether the menu is open", async () => {
    const navigation = await mountNavigation();
    const toggle = navigation.get('[data-testid="menu-toggle"]');

    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-label")).toBe("Open menu");

    await toggle.trigger("click");

    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-label")).toBe("Close menu");
  });

  it("closes the menu again on the second press", async () => {
    const navigation = await mountNavigation();
    const toggle = navigation.get('[data-testid="menu-toggle"]');

    await toggle.trigger("click");
    await toggle.trigger("click");

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(false);
  });

  it("closes the menu when a link inside it is followed", async () => {
    const navigation = await mountNavigation();

    await navigation.get('[data-testid="menu-toggle"]').trigger("click");
    await navigation.get('[data-testid="mobile-menu"]').find("a").trigger("click");

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(false);
  });

  it("offers sign in to visitors without an account", async () => {
    const navigation = await mountNavigation();

    expect(navigation.text()).toContain("Sign in");
    expect(navigation.text()).not.toContain("Sign out");
  });

  it("shows the organizer area only to organizers", async () => {
    signIn("ORGANIZER");

    const navigation = await mountNavigation();

    expect(navigation.text()).toContain("My events");
  });

  it("hides the organizer area from attendees", async () => {
    signIn("ATTENDEE");

    const navigation = await mountNavigation();

    expect(navigation.text()).not.toContain("My events");
    expect(navigation.text()).toContain("Sign out");
  });

  it("offers the ticket list to everyone who is signed in", async () => {
    signIn("ATTENDEE");

    const navigation = await mountNavigation();

    expect(navigation.text()).toContain("My tickets");
  });

  it("hides the ticket list from visitors without an account", async () => {
    const navigation = await mountNavigation();

    expect(navigation.text()).not.toContain("My tickets");
  });

  it("treats an administrator session as not signed in", async () => {
    signIn("ADMIN");

    const navigation = await mountNavigation();

    expect(navigation.text()).not.toContain("My tickets");
    expect(navigation.text()).not.toContain("My events");
    expect(navigation.text()).not.toContain("Sign out");
    expect(navigation.text()).toContain("Sign in");
  });

  it("offers no session control while the signed in account is still loading", async () => {
    sessionState.value = { data: { user: { id: "user-id" } } };
    getCurrentUser.mockReturnValue(new Promise(() => {}));

    const navigation = await mountNavigation();

    expect(navigation.text()).not.toContain("Sign out");
    expect(navigation.text()).not.toContain("Sign in");
  });

  it("signs out and returns to the start page", async () => {
    signIn("ATTENDEE");

    const navigation = await mountNavigation();
    await buttonLabelled(navigation, "Sign out").trigger("click");
    await flushPromises();

    expect(signOutOfSession).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith({ name: "landing" });
  });
});

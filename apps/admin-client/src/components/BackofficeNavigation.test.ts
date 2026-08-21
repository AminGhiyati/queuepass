import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BackofficeNavigation from "@/components/BackofficeNavigation.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { signOutOfSession, navigateTo, sessionState } = vi.hoisted(() => ({
  signOutOfSession: vi.fn(),
  navigateTo: vi.fn(),
  sessionState: { value: null as { data: unknown } | null },
}));

vi.mock("@/lib/authClient", () => ({
  useSession: () => sessionState,
  signOut: signOutOfSession,
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: navigateTo }) }));

function signIn() {
  sessionState.value = { data: { user: { id: "admin-id" } } };
}

function buttonLabelled(
  navigation: ReturnType<typeof mountWithPlugins>,
  label: string,
) {
  const button = navigation.findAll("button").find((candidate) => candidate.text() === label);

  if (!button) {
    throw new Error(`No button labelled "${label}"`);
  }

  return button;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.value = null;
});

describe("BackofficeNavigation", () => {
  it("keeps the mobile menu closed until the burger is pressed", async () => {
    signIn();

    const navigation = mountWithPlugins(BackofficeNavigation);

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(false);

    await navigation.get('[data-testid="menu-toggle"]').trigger("click");

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(true);
  });

  it("tells assistive technology whether the menu is open", async () => {
    signIn();

    const navigation = mountWithPlugins(BackofficeNavigation);
    const toggle = navigation.get('[data-testid="menu-toggle"]');

    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-label")).toBe("Open menu");

    await toggle.trigger("click");

    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-label")).toBe("Close menu");
  });

  it("closes the menu when a link inside it is followed", async () => {
    signIn();

    const navigation = mountWithPlugins(BackofficeNavigation);
    await navigation.get('[data-testid="menu-toggle"]').trigger("click");
    await navigation.get('[data-testid="mobile-menu"]').find("a").trigger("click");

    expect(navigation.find('[data-testid="mobile-menu"]').exists()).toBe(false);
  });

  it("offers the three backoffice areas to a signed in administrator", () => {
    signIn();

    const navigation = mountWithPlugins(BackofficeNavigation);

    expect(navigation.text()).toContain("Revenue");
    expect(navigation.text()).toContain("Events");
    expect(navigation.text()).toContain("Orders");
  });

  it("shows no navigation on the login page", () => {
    const navigation = mountWithPlugins(BackofficeNavigation);

    expect(navigation.text()).not.toContain("Revenue");
    expect(navigation.text()).not.toContain("Sign out");
  });

  it("signs out and returns to the login form", async () => {
    signIn();

    const navigation = mountWithPlugins(BackofficeNavigation);
    await buttonLabelled(navigation, "Sign out").trigger("click");
    await flushPromises();

    expect(signOutOfSession).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith({ name: "login" });
  });
});

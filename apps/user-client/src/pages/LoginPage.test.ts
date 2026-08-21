import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/pages/LoginPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { signInWithEmail, signOutOfSession, getSession, getCurrentUser, navigateTo, routeQuery } =
  vi.hoisted(() => ({
    signInWithEmail: vi.fn(),
    signOutOfSession: vi.fn(),
    getSession: vi.fn(),
    getCurrentUser: vi.fn(),
    navigateTo: vi.fn(),
    routeQuery: {} as Record<string, string>,
  }));

vi.mock("@/lib/authClient", () => ({
  signIn: { email: signInWithEmail },
  signOut: signOutOfSession,
  authClient: { getSession },
}));
vi.mock("@/lib/trpcClient", () => ({
  trpc: { user: { getCurrentUser: { query: getCurrentUser } } },
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: navigateTo }),
  useRoute: () => ({ query: routeQuery }),
}));

async function submitCredentials(email: string, password: string) {
  const page = mountWithPlugins(LoginPage);

  await page.find("#email").setValue(email);
  await page.find("#password").setValue(password);
  await page.find("form").trigger("submit");
  await flushPromises();

  return page;
}

function accountWithRole(role: "ATTENDEE" | "ORGANIZER" | "ADMIN") {
  getSession.mockResolvedValue({ data: { user: { id: "user-id" } } });
  getCurrentUser.mockResolvedValue({ id: "user-id", role });
}

beforeEach(() => {
  vi.clearAllMocks();
  accountWithRole("ATTENDEE");
  for (const key of Object.keys(routeQuery)) {
    delete routeQuery[key];
  }
});

describe("LoginPage", () => {
  it("signs in with the entered credentials", async () => {
    signInWithEmail.mockResolvedValue({ error: null });

    await submitCredentials("anna@example.com", "user12345");

    expect(signInWithEmail).toHaveBeenCalledWith({
      email: "anna@example.com",
      password: "user12345",
    });
  });

  it("opens the landing page after a successful sign in", async () => {
    signInWithEmail.mockResolvedValue({ error: null });

    await submitCredentials("anna@example.com", "user12345");

    expect(navigateTo).toHaveBeenCalledWith({ name: "landing" });
  });

  it("returns to the page the visitor was sent away from", async () => {
    routeQuery.redirectTo = "/my-tickets";
    signInWithEmail.mockResolvedValue({ error: null });

    await submitCredentials("anna@example.com", "user12345");

    expect(navigateTo).toHaveBeenCalledWith("/my-tickets");
  });

  it("shows an error message when the credentials are rejected", async () => {
    signInWithEmail.mockResolvedValue({ error: { message: "Invalid credentials" } });

    const page = await submitCredentials("anna@example.com", "wrong-password");

    expect(page.text()).toContain("Email or password is incorrect.");
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("signs a backoffice account back out instead of opening the shop", async () => {
    signInWithEmail.mockResolvedValue({ error: null });
    accountWithRole("ADMIN");

    const page = await submitCredentials("admin@example.com", "admin12345");

    expect(signOutOfSession).toHaveBeenCalledOnce();
    expect(navigateTo).not.toHaveBeenCalled();
    expect(page.get('[data-testid="backoffice-account-notice"]').text()).toContain(
      "Backoffice accounts have no tickets",
    );
  });

  it("explains why an administrator session was sent to the login form", () => {
    routeQuery.rejected = "administrator";

    const page = mountWithPlugins(LoginPage);

    expect(page.get('[data-testid="backoffice-account-notice"]').text()).toContain(
      "Backoffice accounts have no tickets",
    );
  });

  it("shows no backoffice notice to ordinary visitors", () => {
    const page = mountWithPlugins(LoginPage);

    expect(page.find('[data-testid="backoffice-account-notice"]').exists()).toBe(false);
  });

  it("offers registration to visitors without an account", () => {
    const page = mountWithPlugins(LoginPage);

    expect(page.text()).toContain("No account yet?");
    expect(page.text()).toContain("Create account");
  });

  it("keeps the user on the page while signing in", async () => {
    signInWithEmail.mockReturnValue(new Promise(() => {}));

    const page = mountWithPlugins(LoginPage);
    await page.find("#email").setValue("anna@example.com");
    await page.find("#password").setValue("user12345");
    await page.find("form").trigger("submit");

    expect(page.find("button[type=submit]").attributes("disabled")).toBeDefined();
  });
});

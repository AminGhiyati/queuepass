import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n/i18n";
import LoginPage from "@/pages/LoginPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { signInWithEmail, signOutOfSession, fetchCurrentAdmin, navigateTo, routeQuery } =
  vi.hoisted(() => ({
    signInWithEmail: vi.fn(),
    signOutOfSession: vi.fn(),
    fetchCurrentAdmin: vi.fn(),
    navigateTo: vi.fn(),
    routeQuery: {} as Record<string, string>,
  }));

vi.mock("@/lib/authClient", () => ({
  signIn: { email: signInWithEmail },
  signOut: signOutOfSession,
}));
vi.mock("@/lib/currentAdmin", () => ({ fetchCurrentAdmin }));
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

beforeEach(() => {
  vi.clearAllMocks();
  changeLocale("en");
  for (const key of Object.keys(routeQuery)) {
    delete routeQuery[key];
  }
});

describe("LoginPage", () => {
  it("opens the revenue report when an administrator signs in", async () => {
    signInWithEmail.mockResolvedValue({ error: null });
    fetchCurrentAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });

    await submitCredentials("admin@example.com", "admin12345");

    expect(navigateTo).toHaveBeenCalledWith({ name: "revenue" });
  });

  it("signs a non-administrator back out", async () => {
    signInWithEmail.mockResolvedValue({ error: null });
    fetchCurrentAdmin.mockResolvedValue(null);

    const page = await submitCredentials("anna@example.com", "user12345");

    expect(signOutOfSession).toHaveBeenCalledOnce();
    expect(navigateTo).not.toHaveBeenCalled();
    expect(page.text()).toContain("This account has no administrator permissions.");
  });

  it("translates the shown error as soon as the language changes", async () => {
    signInWithEmail.mockResolvedValue({ error: { message: "Invalid credentials" } });

    const page = await submitCredentials("admin@example.com", "wrong-password");
    changeLocale("de");
    await flushPromises();

    expect(page.text()).toContain("E-Mail oder Passwort ist falsch.");
    expect(page.text()).not.toContain("Email or password is incorrect.");
  });

  it("explains a session that the route guard rejected as non-administrator", async () => {
    routeQuery.rejected = "notAnAdmin";

    const page = mountWithPlugins(LoginPage);

    expect(page.text()).toContain("This account has no administrator permissions.");
  });

  it("shows an error message when the credentials are rejected", async () => {
    signInWithEmail.mockResolvedValue({ error: { message: "Invalid credentials" } });

    const page = await submitCredentials("admin@example.com", "wrong-password");

    expect(page.text()).toContain("Email or password is incorrect.");
    expect(fetchCurrentAdmin).not.toHaveBeenCalled();
  });
});

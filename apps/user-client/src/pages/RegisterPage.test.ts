import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/pages/RegisterPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { signUpWithEmail, becomeOrganizer, navigateTo, routeQuery } = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  becomeOrganizer: vi.fn(),
  navigateTo: vi.fn(),
  routeQuery: {} as Record<string, string>,
}));

vi.mock("@/lib/authClient", () => ({ signUp: { email: signUpWithEmail } }));
vi.mock("@/lib/trpcClient", () => ({
  trpc: { user: { becomeOrganizer: { mutate: becomeOrganizer } } },
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: navigateTo }),
  useRoute: () => ({ query: routeQuery }),
}));

const newAccount = {
  name: "Dora Klein",
  email: "dora@example.com",
  password: "user12345",
};

function organizerRadio(page: ReturnType<typeof mountWithPlugins>) {
  return page.find<HTMLInputElement>('input[type=radio][value="organizer"]');
}

async function submitRegistration(page = mountWithPlugins(RegisterPage)) {
  await page.find("#name").setValue(newAccount.name);
  await page.find("#email").setValue(newAccount.email);
  await page.find("#password").setValue(newAccount.password);
  await page.find("form").trigger("submit");
  await flushPromises();

  return page;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(routeQuery)) {
    delete routeQuery[key];
  }
});

describe("RegisterPage", () => {
  it("registers the entered account", async () => {
    signUpWithEmail.mockResolvedValue({ error: null });

    await submitRegistration();

    expect(signUpWithEmail).toHaveBeenCalledWith(newAccount);
  });

  it("opens the landing page after registering", async () => {
    signUpWithEmail.mockResolvedValue({ error: null });

    await submitRegistration();

    expect(navigateTo).toHaveBeenCalledWith({ name: "landing" });
  });

  it("registers an attendee without asking for organizer access", async () => {
    signUpWithEmail.mockResolvedValue({ error: null });

    await submitRegistration();

    expect(becomeOrganizer).not.toHaveBeenCalled();
  });

  it("grants organizer access when that role was chosen", async () => {
    signUpWithEmail.mockResolvedValue({ error: null });
    becomeOrganizer.mockResolvedValue({ role: "ORGANIZER" });

    const page = mountWithPlugins(RegisterPage);
    await organizerRadio(page).setValue();
    await submitRegistration(page);

    expect(becomeOrganizer).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith({ name: "landing" });
  });

  it("preselects the organizer role when the visitor came from the host call to action", () => {
    routeQuery.role = "organizer";

    const page = mountWithPlugins(RegisterPage);

    expect(organizerRadio(page).element.checked).toBe(true);
  });

  it("reports a failed organizer promotion instead of pretending it worked", async () => {
    signUpWithEmail.mockResolvedValue({ error: null });
    becomeOrganizer.mockRejectedValue(new Error("FORBIDDEN"));

    const page = mountWithPlugins(RegisterPage);
    await organizerRadio(page).setValue();
    await submitRegistration(page);

    expect(page.text()).toContain("organiser access could not be granted");
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("reports an email that is already registered", async () => {
    signUpWithEmail.mockResolvedValue({
      error: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
    });

    const page = await submitRegistration();

    expect(page.text()).toContain("This email is already registered.");
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("reports a password that is too short", async () => {
    signUpWithEmail.mockResolvedValue({ error: { code: "PASSWORD_TOO_SHORT" } });

    const page = await submitRegistration();

    expect(page.text()).toContain("The password needs at least 8 characters.");
  });

  it("reports an unexpected failure", async () => {
    signUpWithEmail.mockResolvedValue({ error: { code: "INTERNAL_SERVER_ERROR" } });

    const page = await submitRegistration();

    expect(page.text()).toContain("The account could not be created.");
  });

  it("asks the browser for at least eight password characters", () => {
    const page = mountWithPlugins(RegisterPage);

    expect(page.find("#password").attributes("minlength")).toBe("8");
  });

  it("blocks a second submit while registering", async () => {
    signUpWithEmail.mockReturnValue(new Promise(() => {}));

    const page = mountWithPlugins(RegisterPage);
    await page.find("#name").setValue(newAccount.name);
    await page.find("#email").setValue(newAccount.email);
    await page.find("#password").setValue(newAccount.password);
    await page.find("form").trigger("submit");

    expect(page.find("button[type=submit]").attributes("disabled")).toBeDefined();
  });

  it("links back to the login form", () => {
    const page = mountWithPlugins(RegisterPage);

    expect(page.text()).toContain("Already registered?");
  });
});

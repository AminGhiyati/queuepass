import { fileURLToPath, URL } from "node:url";
import type { Browser, Page } from "@playwright/test";
import { config as loadApiEnvironment } from "dotenv";
import { userClientUrl } from "../playwright.config";

loadApiEnvironment({
  path: fileURLToPath(new URL("../../apps/api/.env", import.meta.url)),
  quiet: true,
});

export type Account = {
  name: string;
  email: string;
  password: string;
};

function requiredEnvironmentValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing in apps/api/.env`);
  }

  return value;
}

export const seededAdmin = {
  email: requiredEnvironmentValue("ADMIN_EMAIL"),
  password: requiredEnvironmentValue("ADMIN_PASSWORD"),
};

let createdAccountCount = 0;

export function newTestAccount(): Account {
  createdAccountCount += 1;

  return {
    name: `Test User ${createdAccountCount}`,
    email: `e2e-${Date.now()}-${createdAccountCount}@example.com`,
    password: "user12345",
  };
}

export async function submitSignInForm(
  page: Page,
  account: Pick<Account, "email" | "password">,
) {
  await page.fill("#email", account.email);
  await page.fill("#password", account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signIn(page: Page, account: Pick<Account, "email" | "password">) {
  await page.goto("/login");
  await submitSignInForm(page, account);
}

export type SelectableRole = "attendee" | "organizer";

const roleLabels: Record<SelectableRole, string> = {
  attendee: "Attend events",
  organizer: "Host events",
};

export function roleRadio(page: Page, role: SelectableRole) {
  return page.getByRole("radio", { name: roleLabels[role] });
}

export async function submitRegisterForm(
  page: Page,
  account: Account,
  role: SelectableRole = "attendee",
) {
  await page.fill("#name", account.name);
  await page.fill("#email", account.email);
  await page.fill("#password", account.password);
  await roleRadio(page, role).check();
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function register(page: Page, account: Account, role: SelectableRole = "attendee") {
  await page.goto("/register");
  await submitRegisterForm(page, account, role);
}

export function signedInMarker(page: Page) {
  return page.getByRole("button", { name: "Sign out" });
}

export async function registerAndSignOut(page: Page) {
  const account = newTestAccount();

  await register(page, account);
  await signedInMarker(page).click();
  await signedInMarker(page).waitFor({ state: "detached" });

  return account;
}

export async function registerInUserClient(browser: Browser) {
  const context = await browser.newContext({ baseURL: userClientUrl });
  const page = await context.newPage();
  const account = newTestAccount();

  await register(page, account);
  await signedInMarker(page).waitFor();
  await context.close();

  return account;
}

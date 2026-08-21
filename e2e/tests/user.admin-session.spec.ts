import { expect, test, type Page } from "@playwright/test";
import { adminClientUrl } from "../playwright.config";
import { registerAndSignOut, seededAdmin, signedInMarker, submitSignInForm } from "./accounts";

async function signInAsAdministrator(page: Page) {
  await page.goto(`${adminClientUrl}/login`);
  await submitSignInForm(page, seededAdmin);

  await expect(page.getByRole("heading", { name: "Revenue" })).toBeVisible();
}

test("refuses a backoffice account at the shop login", async ({ page }) => {
  await page.goto("/login");
  await submitSignInForm(page, seededAdmin);

  await expect(page.getByTestId("backoffice-account-notice")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(signedInMarker(page)).toHaveCount(0);
});

test("sends an administrator session from the ticket area to the login form", async ({ page }) => {
  await signInAsAdministrator(page);

  await page.goto("/my-tickets");

  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByTestId("backoffice-account-notice")).toBeVisible();
});

test("shows an administrator session as not signed in", async ({ page }) => {
  await signInAsAdministrator(page);

  await page.goto("/");

  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(signedInMarker(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My tickets" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My events" })).toHaveCount(0);
});

test("leads an administrator session to registration, not into the organizer onboarding", async ({
  page,
}) => {
  await signInAsAdministrator(page);

  await page.goto("/");
  await page.getByRole("link", { name: "Host an event" }).first().click();

  await expect(page).toHaveURL(/\/register\?role=organizer$/);
  await expect(page.locator("#name")).toBeVisible();
});

test("lets an administrator session sign in with a personal account", async ({ page }) => {
  const account = await registerAndSignOut(page);

  await signInAsAdministrator(page);
  await page.goto("/login");
  await submitSignInForm(page, account);

  await expect(page.getByRole("link", { name: "My tickets" })).toBeVisible();
});

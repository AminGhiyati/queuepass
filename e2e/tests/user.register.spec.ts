import { expect, test } from "@playwright/test";
import { apiUrl } from "../playwright.config";
import { newTestAccount, register, registerAndSignOut, signedInMarker } from "./accounts";

test("registers a new attendee and opens the start page", async ({ page }) => {
  await register(page, newTestAccount());

  await expect(page).toHaveURL(/\/$/);
  await expect(signedInMarker(page)).toBeVisible();
});

test("registers a new organiser", async ({ page }) => {
  await register(page, newTestAccount(), "organizer");

  await expect(page).toHaveURL(/\/$/);
  await expect(signedInMarker(page)).toBeVisible();
  await expect(page.getByText("organiser access could not be granted")).toHaveCount(0);
});

test("rejects an email that is already registered", async ({ page }) => {
  const account = await registerAndSignOut(page);

  await register(page, account);

  await expect(page.getByText("This email is already registered.")).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});

test("leads from the login form to registration and back", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("main").getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.getByRole("main").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("refuses an account that tries to grant itself the admin role", async ({ request }) => {
  const account = newTestAccount();

  const response = await request.post(`${apiUrl}/api/auth/sign-up/email`, {
    data: { ...account, role: "ADMIN" },
  });

  expect(response.ok()).toBe(false);
  expect(await response.json()).toMatchObject({ code: "FIELD_NOT_ALLOWED" });
});

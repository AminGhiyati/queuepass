import { expect, test } from "@playwright/test";
import { userClientUrl } from "../playwright.config";
import {
  newTestAccount,
  registerInUserClient,
  signedInMarker,
  signIn,
  submitRegisterForm,
} from "./accounts";

test("sends anonymous visitors to the login form", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});

test("locks out users without the admin role", async ({ page, browser }) => {
  const account = await registerInUserClient(browser);

  await signIn(page, account);

  await expect(page.getByText("This account has no administrator permissions.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("overview-title")).toHaveCount(0);
});

test("ends a session without admin role that opens the backoffice", async ({ page }) => {
  await page.goto(`${userClientUrl}/register`);
  await submitRegisterForm(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.goto("/");

  await expect(page).toHaveURL(/\/login\?rejected=notAnAdmin$/);
  await expect(page.getByText("This account has no administrator permissions.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Orders" })).toHaveCount(0);

  await page.goto(`${userClientUrl}/`);

  await expect(signedInMarker(page)).toHaveCount(0);
});

test("offers no registration", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(0);
  await page.goto("/register");
  await expect(page).toHaveURL(/\/login$/);
});

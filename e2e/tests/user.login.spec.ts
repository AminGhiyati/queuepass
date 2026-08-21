import { expect, test } from "@playwright/test";
import { newTestAccount, register, registerAndSignOut, signedInMarker, signIn } from "./accounts";

test("lets anonymous visitors browse without an account", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
});

test("rejects a wrong password", async ({ page }) => {
  const account = await registerAndSignOut(page);

  await signIn(page, { email: account.email, password: "wrong-password" });

  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("signs a registered account back in", async ({ page }) => {
  const account = await registerAndSignOut(page);

  await signIn(page, account);

  await expect(page).toHaveURL(/\/$/);
  await expect(signedInMarker(page)).toBeVisible();
});

test("signs the user back out", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await signedInMarker(page).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(signedInMarker(page)).toHaveCount(0);
});

test("keeps signed in visitors away from the login form", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
});

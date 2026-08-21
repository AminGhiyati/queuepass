import { expect, test, type Page } from "@playwright/test";
import { newTestAccount, submitSignInForm } from "./accounts";

function localeButton(page: Page, locale: "EN" | "DE") {
  return page.getByTestId("language-switcher").getByRole("button", { name: locale, exact: true });
}

test("switches the login form to German and remembers it", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();

  await localeButton(page, "DE").click();
  await expect(page.getByRole("heading", { name: "Admin-Anmeldung" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Admin-Anmeldung" })).toBeVisible();
});

test("translates a shown login error when the language changes", async ({ page }) => {
  await page.goto("/login");
  await submitSignInForm(page, { ...newTestAccount(), password: "wrong-password" });

  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

  await localeButton(page, "DE").click();

  await expect(page.getByText("E-Mail oder Passwort ist falsch.")).toBeVisible();
  await expect(page.getByText("Email or password is incorrect.")).toHaveCount(0);
});

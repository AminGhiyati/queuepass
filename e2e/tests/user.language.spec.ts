import { expect, test, type Page } from "@playwright/test";

function localeButton(page: Page, locale: "EN" | "DE") {
  return page.getByTestId("language-switcher").getByRole("button", { name: locale, exact: true });
}

test("switches the interface to German and remembers it", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await localeButton(page, "DE").click();
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
});

test("switches back to English", async ({ page }) => {
  await page.goto("/login");

  await localeButton(page, "DE").click();
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();

  await localeButton(page, "EN").click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

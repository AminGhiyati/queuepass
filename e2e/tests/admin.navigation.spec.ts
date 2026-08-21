import { expect, test } from "@playwright/test";
import { seededAdmin, signIn } from "./accounts";

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hides the backoffice navigation behind a burger", async ({ page }) => {
    await signIn(page, seededAdmin);

    await expect(page.getByTestId("menu-toggle")).toBeVisible();
    await expect(page.getByRole("link", { name: "Orders" })).toBeHidden();
  });

  test("navigates from the menu and closes it afterwards", async ({ page }) => {
    await signIn(page, seededAdmin);

    await page.getByTestId("menu-toggle").click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Orders" }).click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByTestId("mobile-menu")).toBeHidden();
  });

  test("signs out from the menu", async ({ page }) => {
    await signIn(page, seededAdmin);

    await page.getByTestId("menu-toggle").click();
    await page.getByTestId("mobile-menu").getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test("keeps the revenue table readable by scrolling it", async ({ page }) => {
    await signIn(page, seededAdmin);

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  });
});

test("shows the backoffice navigation inline on a wide screen", async ({ page }) => {
  await signIn(page, seededAdmin);

  await expect(page.getByTestId("menu-toggle")).toBeHidden();
  await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
});

test("only enables saving the fee once it changed", async ({ page }) => {
  await signIn(page, seededAdmin);

  await expect(page.getByTestId("save-fee")).toBeDisabled();

  await page.fill("#fee", "7");
  await expect(page.getByTestId("save-fee")).toBeEnabled();

  await page.getByTestId("save-fee").click();
  await expect(page.getByTestId("fee-saved")).toBeVisible();
  await expect(page.getByTestId("save-fee")).toBeDisabled();

  await page.fill("#fee", "5");
  await page.getByTestId("save-fee").click();
  await expect(page.getByTestId("save-fee")).toBeDisabled();
});

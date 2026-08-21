import { expect, test } from "@playwright/test";
import { registerOrganizer } from "./events";

const phoneViewport = { width: 390, height: 844 };

test.describe("on a phone", () => {
  test.use({ viewport: phoneViewport });

  test("hides the navigation behind a burger", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("menu-toggle")).toBeVisible();
    await expect(page.getByRole("link", { name: "Events", exact: true })).toBeHidden();
  });

  test("opens and closes the menu", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByTestId("mobile-menu")).toBeVisible();

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByTestId("mobile-menu")).toBeHidden();
  });

  test("navigates from the menu and closes it afterwards", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("menu-toggle").click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Events" }).click();

    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByTestId("mobile-menu")).toBeHidden();
  });

  test("offers the organiser area inside the menu", async ({ page }) => {
    await registerOrganizer(page);

    await page.getByTestId("menu-toggle").click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "My events" }).click();

    await expect(page).toHaveURL(/\/organizer$/);
  });
});

test("shows the navigation inline on a wide screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("menu-toggle")).toBeHidden();
  await expect(page.getByRole("link", { name: "Events", exact: true })).toBeVisible();
});

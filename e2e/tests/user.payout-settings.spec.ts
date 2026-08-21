import { expect, test } from "@playwright/test";
import { newTestAccount, register, signedInMarker } from "./accounts";
import { registerOrganizer } from "./events";
import { STORED_IBAN, VALID_IBAN } from "./payouts";

test("stores the iban an organizer types with spaces", async ({ page }) => {
  await registerOrganizer(page);

  await page.getByRole("link", { name: "Account" }).click();
  await expect(page.getByTestId("payout-iban-missing")).toBeVisible();

  await page.fill("#iban", VALID_IBAN);
  await page.getByTestId("save-iban").click();

  await expect(page.getByTestId("iban-saved")).toBeVisible();
  await expect(page.locator("#iban")).toHaveValue(STORED_IBAN);
});

test("keeps the stored iban after a reload", async ({ page }) => {
  await registerOrganizer(page);

  await page.goto("/organizer/account");
  await page.fill("#iban", VALID_IBAN);
  await page.getByTestId("save-iban").click();
  await expect(page.getByTestId("iban-saved")).toBeVisible();

  await page.reload();

  await expect(page.locator("#iban")).toHaveValue(STORED_IBAN);
  await expect(page.getByTestId("payout-iban-missing")).toBeHidden();
});

test("names a mistyped iban as the reason it was not stored", async ({ page }) => {
  await registerOrganizer(page);

  await page.goto("/organizer/account");
  await page.fill("#iban", "DE44500105175407324932");
  await page.getByTestId("save-iban").click();

  await expect(page.getByTestId("iban-error")).toHaveText(
    "This is not a valid IBAN. Please check it for typos.",
  );
  await expect(page.getByTestId("payout-iban-missing")).toBeVisible();
});

test("keeps the payout settings away from an attendee", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await expect(page.getByRole("link", { name: "Account" })).toHaveCount(0);

  await page.goto("/organizer/account");

  await expect(page).toHaveURL(/\/$/);
});

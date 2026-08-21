import { expect, test } from "@playwright/test";
import { seededAdmin, signIn } from "./accounts";
import {
  payoutRowOf,
  sellTicketsAsNewOrganizer,
  STORED_IBAN,
  VALID_IBAN,
} from "./payouts";

test("marks the open payout of an organizer as transferred", async ({ page, browser }) => {
  const { organizer } = await sellTicketsAsNewOrganizer(browser, { iban: VALID_IBAN });

  await signIn(page, seededAdmin);
  await page.getByRole("link", { name: "Payouts" }).click();

  const row = payoutRowOf(page, organizer.email);
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId("payout-iban")).toHaveText(STORED_IBAN);

  const earned = String(await row.getByTestId("payout-earned").textContent()).trim();
  await expect(row.getByTestId("payout-outstanding")).toHaveText(earned);

  await row.getByTestId("mark-payout").click();

  await expect(row.getByTestId("mark-payout-done")).toBeVisible();
  await expect(row.getByTestId("payout-transferred")).toHaveText(earned);
  await expect(row.getByTestId("payout-outstanding")).toHaveText("€0.00");
  await expect(row.getByTestId("mark-payout")).toBeDisabled();
});

test("keeps the recorded payout after a reload", async ({ page, browser }) => {
  const { organizer } = await sellTicketsAsNewOrganizer(browser, { iban: VALID_IBAN });

  await signIn(page, seededAdmin);
  await page.getByRole("link", { name: "Payouts" }).click();

  const row = payoutRowOf(page, organizer.email);
  const earned = String(await row.getByTestId("payout-earned").textContent()).trim();
  await row.getByTestId("mark-payout").click();
  await expect(row.getByTestId("mark-payout-done")).toBeVisible();

  await page.reload();

  const reloadedRow = payoutRowOf(page, organizer.email);
  await expect(reloadedRow.getByTestId("payout-transferred")).toHaveText(earned);
  await expect(reloadedRow.getByTestId("payout-outstanding")).toHaveText("€0.00");
});

test("cannot pay out an organizer who stored no iban", async ({ page, browser }) => {
  const { organizer } = await sellTicketsAsNewOrganizer(browser);

  await signIn(page, seededAdmin);
  await page.getByRole("link", { name: "Payouts" }).click();

  const row = payoutRowOf(page, organizer.email);
  await expect(row.getByTestId("payout-iban-missing")).toHaveText("No IBAN stored");
  await expect(row.getByTestId("mark-payout")).toBeDisabled();
});

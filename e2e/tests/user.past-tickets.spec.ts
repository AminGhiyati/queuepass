import { expect, test, type Browser } from "@playwright/test";
import { newTestAccount, register, signedInMarker } from "./accounts";
import { buyTickets, createPublishedEvent, registerOrganizer } from "./events";

async function publishEventInOwnContext(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);
  await context.close();

  return draft;
}

test("keeps a ticket for an upcoming event out of the past tickets", async ({ page, browser }) => {
  const draft = await publishEventInOwnContext(browser);

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);

  await expect(page.getByTestId("ticket-row").filter({ hasText: draft.title })).toHaveCount(1);

  await page.getByTestId("past-tickets-link").click();

  await expect(page).toHaveURL(/\/my-tickets\/past$/);
  await expect(page.getByTestId("ticket-row").filter({ hasText: draft.title })).toHaveCount(0);
});

test("says that no event of a fresh buyer is over yet", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.goto("/my-tickets/past");

  await expect(page.getByTestId("past-tickets-empty")).toHaveText(
    "None of your events is over yet.",
  );
});

test("asks an anonymous visitor to sign in for the past tickets", async ({ page }) => {
  await page.goto("/my-tickets/past");

  await expect(page).toHaveURL(/redirectTo=\/my-tickets\/past/);
});

import { expect, type Browser, type Page } from "@playwright/test";
import { userClientUrl } from "../playwright.config";
import { newTestAccount, register, signedInMarker } from "./accounts";
import { buyTickets, createPublishedEvent, registerOrganizer } from "./events";

export const VALID_IBAN = "DE44 5001 0517 5407 3249 31";
export const STORED_IBAN = "DE44500105175407324931";

export async function inUserClient<Result>(
  browser: Browser,
  run: (page: Page) => Promise<Result>,
) {
  const context = await browser.newContext({ baseURL: userClientUrl });
  const page = await context.newPage();

  try {
    return await run(page);
  } finally {
    await context.close();
  }
}

export async function storePayoutIban(page: Page, iban: string) {
  await page.goto("/organizer/account");
  await page.fill("#iban", iban);
  await page.getByTestId("save-iban").click();
  await expect(page.getByTestId("iban-saved")).toBeVisible();
}

export async function sellTicketsAsNewOrganizer(
  browser: Browser,
  { quantity = 2, iban }: { quantity?: number; iban?: string } = {},
) {
  const { organizer, draft } = await inUserClient(browser, async (page) => {
    const account = await registerOrganizer(page);

    if (iban) {
      await storePayoutIban(page, iban);
    }

    return { organizer: account, draft: await createPublishedEvent(page) };
  });

  await inUserClient(browser, async (page) => {
    await register(page, newTestAccount());
    await signedInMarker(page).waitFor();
    await buyTickets(page, draft, quantity);
  });

  return { organizer, draft };
}

export function payoutRowOf(page: Page, organizerEmail: string) {
  return page.getByTestId("payout-row").filter({ hasText: organizerEmail });
}

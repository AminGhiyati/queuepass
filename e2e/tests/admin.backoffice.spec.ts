import { expect, test, type Browser } from "@playwright/test";
import { userClientUrl } from "../playwright.config";
import { newTestAccount, register, seededAdmin, signedInMarker, signIn } from "./accounts";
import {
  buyTickets,
  createDraftEvent,
  createPublishedEvent,
  registerOrganizer,
} from "./events";

async function inUserClient<Result>(browser: Browser, run: (page: Page) => Promise<Result>) {
  const context = await browser.newContext({ baseURL: userClientUrl });
  const page = await context.newPage();

  try {
    return await run(page);
  } finally {
    await context.close();
  }
}

type Page = Awaited<ReturnType<Browser["newPage"]>>;

async function sellTickets(browser: Browser, quantity: number) {
  const { organizer, draft } = await inUserClient(browser, async (page) => {
    const account = await registerOrganizer(page);

    return { organizer: account, draft: await createPublishedEvent(page) };
  });

  await inUserClient(browser, async (page) => {
    await register(page, newTestAccount());
    await signedInMarker(page).waitFor();
    await buyTickets(page, draft, quantity);
  });

  return { organizer, draft };
}

test("shows the platform revenue of a sale", async ({ page, browser }) => {
  const { organizer } = await sellTickets(browser, 2);

  await signIn(page, seededAdmin);

  await expect(page.getByRole("heading", { name: "Revenue" })).toBeVisible();
  const organizerRow = page.getByTestId("revenue-row").filter({ hasText: organizer.email });

  await expect(organizerRow).toHaveCount(1);
  await expect(organizerRow).toContainText("€50.00");
  await expect(organizerRow).toContainText("€2.50");
  await expect(organizerRow).toContainText("€47.50");
});

test("counts the whole platform in the totals", async ({ page, browser }) => {
  await sellTickets(browser, 1);

  await signIn(page, seededAdmin);

  await expect(page.getByTestId("total-tickets")).not.toHaveText("0");
  await expect(page.getByTestId("total-gross")).not.toHaveText("€0.00");
});

test("lists every event including drafts", async ({ page, browser }) => {
  const draft = await inUserClient(browser, async (organizerPage) => {
    await registerOrganizer(organizerPage);

    return createDraftEvent(organizerPage);
  });

  await signIn(page, seededAdmin);
  await page.getByRole("link", { name: "Events" }).click();

  const eventRow = page.getByTestId("platform-event-row").filter({ hasText: draft.title });

  await expect(eventRow).toHaveCount(1);
  await expect(eventRow.getByTestId("platform-event-status")).toHaveText("Draft");
});

test("finds an event by its organiser", async ({ page, browser }) => {
  const { organizer, draft } = await sellTickets(browser, 1);

  await signIn(page, seededAdmin);
  await page.getByRole("link", { name: "Events" }).click();
  await page.fill("#event-search", organizer.email);

  await expect(page.getByTestId("platform-event-row")).toHaveCount(1);
  await expect(page.getByTestId("platform-event-title")).toHaveText(draft.title);
});

test("lists the order with the fee that was charged", async ({ page, browser }) => {
  const { draft } = await sellTickets(browser, 3);

  await signIn(page, seededAdmin);
  await page.getByRole("link", { name: "Orders" }).click();

  const orderRow = page.getByTestId("platform-order-row").filter({ hasText: draft.title });

  await expect(orderRow).toHaveCount(1);
  await expect(orderRow.getByTestId("platform-order-total")).toHaveText("€75.00");
  await expect(orderRow.getByTestId("platform-order-fee")).toHaveText("€3.75");
  await expect(orderRow.getByTestId("platform-order-status")).toHaveText("Paid");
});

test("keeps the backoffice away from organisers", async ({ page, browser }) => {
  const organizer = await inUserClient(browser, (organizerPage) =>
    registerOrganizer(organizerPage),
  );

  await signIn(page, organizer);

  await expect(page.getByText("This account has no administrator permissions.")).toBeVisible();
  await expect(page.getByTestId("revenue-row")).toHaveCount(0);
});

test("changes the platform fee and charges it on the next order", async ({ page, browser }) => {
  await signIn(page, seededAdmin);

  await page.fill("#fee", "20");
  await page.getByTestId("save-fee").click();
  await expect(page.getByTestId("fee-saved")).toBeVisible();

  const { organizer } = await sellTickets(browser, 1);

  await page.reload();
  await expect(
    page.getByTestId("revenue-row").filter({ hasText: organizer.email }),
  ).toContainText("€5.00");

  await page.fill("#fee", "5");
  await page.getByTestId("save-fee").click();
  await expect(page.getByTestId("fee-saved")).toBeVisible();
});

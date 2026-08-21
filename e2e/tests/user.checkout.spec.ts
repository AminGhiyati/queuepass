import { expect, test, type Browser, type Page } from "@playwright/test";
import { newTestAccount, register, signedInMarker, submitSignInForm } from "./accounts";
import {
  buyTickets,
  createPublishedEvent,
  openPublishedEvent,
  registerOrganizer,
  type EventDraft,
} from "./events";

async function publishEventInOwnContext(browser: Browser, overrides: Partial<EventDraft> = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await registerOrganizer(page);
  const draft = await createPublishedEvent(page, overrides);

  return { draft, organizerPage: page, closeOrganizer: () => context.close() };
}

async function registerAttendee(page: Page) {
  const account = newTestAccount();

  await register(page, account);
  await signedInMarker(page).waitFor();

  return account;
}

test("buys a ticket and shows it with a qr code", async ({ page, browser }) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser);
  await closeOrganizer();

  await registerAttendee(page);
  await buyTickets(page, draft);

  const ticketRow = page.getByTestId("ticket-row").filter({ hasText: draft.title });
  await expect(ticketRow).toHaveCount(1);

  await ticketRow.getByRole("link", { name: "Show ticket" }).click();

  await expect(page.getByTestId("ticket-qr-code")).toBeVisible();
  await expect(page.getByTestId("ticket-code")).not.toBeEmpty();
  await expect(page.getByTestId("ticket-status")).toHaveText("Not scanned yet");
});

test("buys several tickets and gets one ticket each", async ({ page, browser }) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser);
  await closeOrganizer();

  await registerAttendee(page);
  await buyTickets(page, draft, 3);

  await expect(page.getByTestId("ticket-row").filter({ hasText: draft.title })).toHaveCount(3);
});

test("gives every ticket its own code", async ({ page, browser }) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser);
  await closeOrganizer();

  await registerAttendee(page);
  await buyTickets(page, draft, 2);

  const ticketLinks = page
    .getByTestId("ticket-row")
    .filter({ hasText: draft.title })
    .getByRole("link", { name: "Show ticket" });

  const codes: string[] = [];
  for (const index of [0, 1]) {
    await ticketLinks.nth(index).click();
    codes.push(String(await page.getByTestId("ticket-code").textContent()));
    await page.goBack();
  }

  expect(new Set(codes).size).toBe(2);
});

test("claims a free ticket without paying", async ({ page, browser }) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser, { priceInEuros: "0" });
  await closeOrganizer();

  await registerAttendee(page);
  await openPublishedEvent(page, draft);
  await page.getByTestId("buy-ticket").click();

  await expect(page.getByTestId("checkout-total")).toHaveText("Free");

  await page.getByTestId("confirm-purchase").click();
  await expect(page.getByTestId("ticket-row").filter({ hasText: draft.title })).toHaveCount(1);
});

test("counts the total for several tickets", async ({ page, browser }) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser);
  await closeOrganizer();

  await registerAttendee(page);
  await openPublishedEvent(page, draft);
  await page.getByTestId("buy-ticket").click();
  await page.fill("#quantity", "4");

  await expect(page.getByTestId("checkout-total")).toHaveText("€100.00");
});

test("stops selling once the last ticket is gone", async ({ page, browser }) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser, { capacity: "1" });
  await closeOrganizer();

  await registerAttendee(page);
  const eventId = await openPublishedEvent(page, draft);
  await page.getByTestId("buy-ticket").click();
  await page.getByTestId("confirm-purchase").click();
  await expect(page).toHaveURL(/\/my-tickets$/);

  await page.goto(`/events/${eventId}`);
  await expect(page.getByTestId("event-availability")).toHaveText("Sold out");
  await expect(page.getByTestId("buy-ticket")).toHaveCount(0);

  await page.goto(`/events/${eventId}/checkout`);
  await expect(page.getByTestId("checkout-unavailable")).toHaveText("This event is sold out.");
  await expect(page.getByTestId("confirm-purchase")).toHaveCount(0);
});

test("counts sold tickets on the organiser page", async ({ browser }) => {
  const { draft, organizerPage } = await publishEventInOwnContext(browser);

  const attendeeContext = await browser.newContext();
  const attendeePage = await attendeeContext.newPage();
  await registerAttendee(attendeePage);
  await buyTickets(attendeePage, draft, 2);
  await attendeeContext.close();

  await organizerPage.goto("/organizer");
  const row = organizerPage.getByTestId("organizer-event-row").filter({ hasText: draft.title });

  await expect(row.getByTestId("organizer-event-sales")).toHaveText("2 of 400 sold");
});

test("lists the buyer in the attendee list", async ({ browser }) => {
  const { draft, organizerPage } = await publishEventInOwnContext(browser);

  const attendeeContext = await browser.newContext();
  const attendeePage = await attendeeContext.newPage();
  const buyer = await registerAttendee(attendeePage);
  await buyTickets(attendeePage, draft, 2);
  await attendeeContext.close();

  await organizerPage.goto("/organizer");
  await organizerPage
    .getByTestId("organizer-event-row")
    .filter({ hasText: draft.title })
    .getByRole("link", { name: "Attendees" })
    .click();

  await expect(organizerPage.getByTestId("attendee-row")).toHaveCount(2);
  await expect(organizerPage.getByTestId("attendee-name").first()).toHaveText(buyer.name);
  await expect(organizerPage.getByText(buyer.email).first()).toBeVisible();
  await expect(organizerPage.getByTestId("attendees-summary")).toHaveText(
    "0 of 2 tickets scanned",
  );
});

test("keeps the attendee list of another organiser private", async ({ page, browser }) => {
  const { draft, organizerPage } = await publishEventInOwnContext(browser);
  const eventId = await openPublishedEvent(organizerPage, draft);

  await registerOrganizer(page);
  await page.goto(`/organizer/events/${eventId}/attendees`);

  await expect(page.getByText("The attendee list could not be loaded.")).toBeVisible();
  await expect(page.getByTestId("attendee-row")).toHaveCount(0);
});

test("asks an anonymous visitor to sign in and returns them to the checkout", async ({
  page,
  browser,
}) => {
  const { draft, closeOrganizer } = await publishEventInOwnContext(browser);
  await closeOrganizer();

  const buyer = newTestAccount();
  const registerContext = await browser.newContext();
  const registerPage = await registerContext.newPage();
  await register(registerPage, buyer);
  await signedInMarker(registerPage).waitFor();
  await registerContext.close();

  const eventId = await openPublishedEvent(page, draft);
  await page.goto(`/events/${eventId}/checkout`);

  await expect(page).toHaveURL(new RegExp(`redirectTo=/events/${eventId}/checkout`));

  await submitSignInForm(page, buyer);

  await expect(page).toHaveURL(new RegExp(`/events/${eventId}/checkout$`));
  await expect(page.getByTestId("confirm-purchase")).toBeVisible();
});

import { expect, test, type Browser, type Page } from "@playwright/test";
import { newTestAccount, register, signedInMarker } from "./accounts";
import {
  buyTickets,
  createPublishedEvent,
  openPublishedEvent,
  organizerRowOf,
  registerOrganizer,
  type EventDraft,
} from "./events";

async function eventWithOneSoldTicket(browser: Browser) {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);

  return {
    organizerPage,
    draft,
    closeOrganizer: () => organizerContext.close(),
  };
}

async function buyOneTicket(page: Page, draft: EventDraft) {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);
}

async function cancelEvent(organizerPage: Page, draft: EventDraft) {
  await organizerPage.goto("/organizer");
  await organizerRowOf(organizerPage, draft)
    .getByTestId("cancel-event")
    .click();
  await organizerRowOf(organizerPage, draft)
    .getByTestId("confirm-cancel-event")
    .click();

  await expect(organizerRowOf(organizerPage, draft)).toHaveCount(0);
}

test("warns the organizer about the sold tickets before the event is cancelled", async ({
  page,
  browser,
}) => {
  const { organizerPage, draft, closeOrganizer } =
    await eventWithOneSoldTicket(browser);
  await buyOneTicket(page, draft);

  await organizerPage.goto("/organizer");
  const row = organizerRowOf(organizerPage, draft);
  await row.getByTestId("cancel-event").click();

  await expect(row.getByTestId("cancel-event-warning")).toContainText(
    "1 of 400",
  );
  await expect(row.getByTestId("cancel-event-warning")).toContainText("€25.00");
  await expect(row.getByTestId("organizer-event-status")).toHaveText("On sale");

  await closeOrganizer();
});

test("cancels the event and refunds the buyer in full", async ({
  page,
  browser,
}) => {
  const { organizerPage, draft, closeOrganizer } =
    await eventWithOneSoldTicket(browser);
  await buyOneTicket(page, draft);

  await cancelEvent(organizerPage, draft);

  await expect(organizerPage.getByTestId("cancel-event-summary")).toContainText(
    "€25.00",
  );
  await expect(organizerPage.getByTestId("cancel-refund-failed")).toHaveCount(
    0,
  );

  await closeOrganizer();
});

test("files a cancelled event under the past events, though its date is still ahead", async ({
  page,
  browser,
}) => {
  const { organizerPage, draft, closeOrganizer } =
    await eventWithOneSoldTicket(browser);
  await buyOneTicket(page, draft);
  await cancelEvent(organizerPage, draft);

  await organizerPage.goto("/organizer/events/past");
  const row = organizerRowOf(organizerPage, draft);

  await expect(row.getByTestId("organizer-event-status")).toHaveText(
    "Cancelled",
  );
  await expect(row.getByTestId("cancel-event")).toHaveCount(0);

  await closeOrganizer();
});

test("closes the entrance of a cancelled event, though its date is still ahead", async ({
  page,
  browser,
}) => {
  const { organizerPage, draft, closeOrganizer } =
    await eventWithOneSoldTicket(browser);
  const eventId = await openPublishedEvent(organizerPage, draft);
  await buyOneTicket(page, draft);
  await cancelEvent(organizerPage, draft);

  await organizerPage.goto(`/organizer/events/${eventId}/attendees`);

  await expect(organizerPage.getByTestId("attendee-row")).toHaveCount(1);
  await expect(
    organizerPage.getByTestId("attendees-entrance-closed"),
  ).toContainText("This event is cancelled");
  await expect(organizerPage.getByTestId("check-in-attendee")).toHaveCount(0);
  await expect(organizerPage.getByTestId("undo-check-in")).toHaveCount(0);
  await expect(
    organizerPage.getByRole("link", { name: "Entrance" }),
  ).toHaveCount(0);

  await organizerPage.goto(`/organizer/events/${eventId}/scan`);

  await expect(
    organizerPage.getByTestId("scanner-entrance-closed"),
  ).toBeVisible();
  await expect(organizerPage.getByTestId("camera-preview")).toHaveCount(0);
  await expect(organizerPage.getByTestId("start-camera")).toHaveCount(0);

  await closeOrganizer();
});

test("shows the buyer the cancellation and the refund on their ticket", async ({
  page,
  browser,
}) => {
  const { organizerPage, draft, closeOrganizer } =
    await eventWithOneSoldTicket(browser);
  await buyOneTicket(page, draft);
  await cancelEvent(organizerPage, draft);
  await closeOrganizer();

  await page.goto("/my-tickets");
  const ticketRow = page
    .getByTestId("ticket-row")
    .filter({ hasText: draft.title });

  await expect(ticketRow.getByTestId("ticket-cancelled")).toHaveText(
    "Cancelled",
  );

  await ticketRow.getByRole("link", { name: "Show ticket" }).click();

  await expect(page.getByTestId("ticket-event-cancelled")).toContainText(
    "no longer valid",
  );
  await expect(page.getByTestId("ticket-refund")).toContainText("€25.00");
  await expect(page.getByTestId("ticket-qr-code")).toHaveCount(0);
  await expect(page.getByTestId("ticket-pdf-link")).toHaveCount(0);
});

test("takes a cancelled event off sale for everyone", async ({
  page,
  browser,
}) => {
  const { organizerPage, draft, closeOrganizer } =
    await eventWithOneSoldTicket(browser);
  await buyOneTicket(page, draft);
  await cancelEvent(organizerPage, draft);
  await closeOrganizer();

  await page.goto("/events");

  await expect(
    page.getByTestId("event-card").filter({ hasText: draft.title }),
  ).toHaveCount(0);
});

import { expect, test, type Page } from "@playwright/test";
import { newTestAccount, register, signedInMarker } from "./accounts";
import {
  buyTickets,
  createDraftEvent,
  createPublishedEvent,
  letEventPass,
  openPublishedEvent,
  organizerRowOf,
  registerOrganizer,
} from "./events";

async function createEventThatIsOver(page: Page) {
  const draft = await createDraftEvent(page);

  await letEventPass(page, draft);

  return draft;
}

async function publishEventAndLetItPass(page: Page) {
  const draft = await createPublishedEvent(page);
  const eventId = await openPublishedEvent(page, draft);

  await letEventPass(page, draft);

  return { draft, eventId };
}

test("keeps an event that is over out of the event list", async ({ page }) => {
  await registerOrganizer(page);
  const upcoming = await createDraftEvent(page);
  const over = await createEventThatIsOver(page);

  await expect(organizerRowOf(page, upcoming)).toHaveCount(1);
  await expect(organizerRowOf(page, over)).toHaveCount(0);
});

test("collects the events that are over on their own page", async ({ page }) => {
  await registerOrganizer(page);
  const upcoming = await createDraftEvent(page);
  const over = await createEventThatIsOver(page);

  await page.getByTestId("past-events-link").click();

  await expect(page).toHaveURL(/\/organizer\/events\/past$/);
  await expect(organizerRowOf(page, over)).toHaveCount(1);
  await expect(organizerRowOf(page, upcoming)).toHaveCount(0);
});

test("says an event is over instead of on sale once it lies behind", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);
  await letEventPass(page, draft);

  await page.goto("/organizer/events/past");

  await expect(organizerRowOf(page, draft).getByTestId("organizer-event-status")).toHaveText(
    "Over",
  );
});

test("offers no action that would change a past event", async ({ page }) => {
  await registerOrganizer(page);
  const over = await createEventThatIsOver(page);

  await page.goto("/organizer/events/past");
  const row = organizerRowOf(page, over);

  await expect(row.getByTestId("publish-event")).toHaveCount(0);
  await expect(row.getByTestId("delete-event")).toHaveCount(0);
  await expect(row.getByTestId("cancel-event")).toHaveCount(0);
});

test("keeps the attendee list of a past event readable", async ({ page, browser }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);

  const attendeeContext = await browser.newContext();
  const attendeePage = await attendeeContext.newPage();
  await register(attendeePage, newTestAccount());
  await signedInMarker(attendeePage).waitFor();
  await buyTickets(attendeePage, draft);
  await attendeeContext.close();

  await letEventPass(page, draft);

  await page.goto("/organizer/events/past");
  await organizerRowOf(page, draft).getByRole("link", { name: "Attendees" }).click();

  await expect(page.getByTestId("attendee-row")).toHaveCount(1);
});

test("takes the entrance out of the attendee list of a past event", async ({ page, browser }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);
  const eventId = await openPublishedEvent(page, draft);

  const attendeeContext = await browser.newContext();
  const attendeePage = await attendeeContext.newPage();
  await register(attendeePage, newTestAccount());
  await signedInMarker(attendeePage).waitFor();
  await buyTickets(attendeePage, draft);
  await attendeeContext.close();

  await letEventPass(page, draft);

  await page.goto(`/organizer/events/${eventId}/attendees`);

  await expect(page.getByTestId("attendee-row")).toHaveCount(1);
  await expect(page.getByTestId("attendees-entrance-closed")).toBeVisible();
  await expect(page.getByTestId("check-in-attendee")).toHaveCount(0);
  await expect(page.getByTestId("undo-check-in")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Entrance" })).toHaveCount(0);
});

test("takes an event that is over out of the sale", async ({ page }) => {
  await registerOrganizer(page);
  const { draft, eventId } = await publishEventAndLetItPass(page);

  await page.goto("/events");
  await page.fill("#search", draft.title);
  await expect(page.getByTestId("event-card").filter({ hasText: draft.title })).toHaveCount(0);

  await page.goto(`/events/${eventId}`);
  await expect(page.getByTestId("buy-ticket")).toHaveCount(0);
  await expect(page.getByTestId("buy-unavailable")).toHaveText("This event is over.");

  await page.goto(`/events/${eventId}/checkout`);
  await expect(page.getByTestId("confirm-purchase")).toHaveCount(0);
  await expect(page.getByTestId("checkout-unavailable")).toHaveText(
    "This event is over, tickets are no longer on sale.",
  );
});

test("closes the entrance of an event that is over", async ({ page }) => {
  await registerOrganizer(page);
  const { eventId } = await publishEventAndLetItPass(page);

  await page.goto(`/organizer/events/${eventId}/scan`);

  await expect(page.getByTestId("scanner-entrance-closed")).toBeVisible();
  await expect(page.getByTestId("camera-preview")).toHaveCount(0);
  await expect(page.getByTestId("start-camera")).toHaveCount(0);
});

test("keeps the past events away from an attendee", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.goto("/organizer/events/past");

  await expect(page).toHaveURL(/\/$/);
});

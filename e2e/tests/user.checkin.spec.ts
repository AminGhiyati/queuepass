import { expect, test, type Browser, type Page } from "@playwright/test";
import { newTestAccount, register, signedInMarker, type Account } from "./accounts";
import {
  buyTickets,
  collectTicketCodes,
  createPublishedEvent,
  registerOrganizer,
  type EventDraft,
} from "./events";

type SoldOutSetup = {
  organizerPage: Page;
  organizer: Account;
  draft: EventDraft;
  codes: string[];
};

async function eventWithSoldTickets(browser: Browser, quantity: number): Promise<SoldOutSetup> {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  const organizer = await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);

  const attendeeContext = await browser.newContext();
  const attendeePage = await attendeeContext.newPage();
  await register(attendeePage, newTestAccount());
  await signedInMarker(attendeePage).waitFor();
  await buyTickets(attendeePage, draft, quantity);
  const codes = await collectTicketCodes(attendeePage, quantity);
  await attendeeContext.close();

  return { organizerPage, organizer, draft, codes };
}

async function openAttendees(page: Page, draft: EventDraft) {
  await page.goto("/organizer");
  await page
    .getByTestId("organizer-event-row")
    .filter({ hasText: draft.title })
    .getByRole("link", { name: "Attendees" })
    .click();
  await expect(page.getByRole("heading", { name: "Attendees" })).toBeVisible();
}

test("opens the entrance with a camera and no way to type a code", async ({ browser }) => {
  const { organizerPage, draft } = await eventWithSoldTickets(browser, 1);

  await organizerPage.goto("/organizer");
  await organizerPage
    .getByTestId("organizer-event-row")
    .filter({ hasText: draft.title })
    .getByRole("link", { name: "Entrance" })
    .click();

  await expect(organizerPage.getByRole("heading", { name: "Entrance" })).toBeVisible();
  await expect(organizerPage.getByTestId("camera-preview")).toHaveCount(1);
  await expect(organizerPage.locator("#code")).toHaveCount(0);
});

test("lets an attendee in from the list and takes it back", async ({ browser }) => {
  const { organizerPage, draft } = await eventWithSoldTickets(browser, 1);

  await openAttendees(organizerPage, draft);

  await organizerPage.getByTestId("check-in-attendee").click();
  await expect(organizerPage.getByTestId("attendee-status")).toHaveText("Scanned");
  await expect(organizerPage.getByTestId("attendees-summary")).toHaveText("1 of 1 tickets scanned");

  await organizerPage.getByTestId("undo-check-in").click();
  await expect(organizerPage.getByTestId("attendee-status")).toHaveText("Not scanned");
  await expect(organizerPage.getByTestId("attendees-summary")).toHaveText("0 of 1 tickets scanned");
});

test("keeps the scan of one attendee after a reload", async ({ browser }) => {
  const { organizerPage, draft } = await eventWithSoldTickets(browser, 2);

  await openAttendees(organizerPage, draft);
  await organizerPage.getByTestId("check-in-attendee").first().click();
  await expect(organizerPage.getByTestId("attendees-summary")).toHaveText("1 of 2 tickets scanned");

  await organizerPage.reload();

  await expect(organizerPage.getByTestId("attendees-summary")).toHaveText("1 of 2 tickets scanned");
});

test("finds an attendee by ticket code", async ({ browser }) => {
  const { organizerPage, draft, codes } = await eventWithSoldTickets(browser, 2);

  await openAttendees(organizerPage, draft);
  await expect(organizerPage.getByTestId("attendee-row")).toHaveCount(2);

  await organizerPage.fill("#attendee-search", String(codes[0]));

  await expect(organizerPage.getByTestId("attendee-row")).toHaveCount(1);
});

test("keeps the attendees of another organiser out of reach", async ({ page, browser }) => {
  const foreign = await eventWithSoldTickets(browser, 1);
  await openAttendees(foreign.organizerPage, foreign.draft);
  const eventId = String(new URL(foreign.organizerPage.url()).pathname.split("/").at(-2));
  await foreign.organizerPage.context().close();

  await registerOrganizer(page);
  await page.goto(`/organizer/events/${eventId}/attendees`);

  await expect(page.getByText("The attendee list could not be loaded.")).toBeVisible();
  await expect(page.getByTestId("attendee-row")).toHaveCount(0);
});

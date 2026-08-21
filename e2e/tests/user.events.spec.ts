import { expect, test } from "@playwright/test";
import { newTestAccount, register, signedInMarker } from "./accounts";
import {
  createDraftEvent,
  createPublishedEvent,
  fillEventForm,
  newEventDraft,
  organizerRowOf,
  registerOrganizer,
  saveEventForm,
} from "./events";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("creates an event as a draft that visitors cannot see yet", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createDraftEvent(page);

  await expect(organizerRowOf(page, draft).getByTestId("organizer-event-status")).toHaveText(
    "Draft",
  );

  await page.goto("/events");
  await expect(page.getByTestId("event-card").filter({ hasText: draft.title })).toHaveCount(0);
});

test("puts an event on sale and shows it to visitors", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);

  await page.goto("/events");
  const card = page.getByTestId("event-card").filter({ hasText: draft.title });

  await expect(card).toHaveCount(1);
  await expect(card.getByTestId("event-price")).toHaveText("€25.00");
});

test("shows a published event to a visitor without an account", async ({ page, browser }) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  await page.goto("/events");
  await page.getByTestId("event-card").filter({ hasText: draft.title }).click();

  await expect(page.getByTestId("event-title")).toHaveText(draft.title);
  await expect(page.getByTestId("event-availability")).toHaveText("400 of 400 tickets left");
  await expect(page.getByText(draft.location)).toBeVisible();
});

test("finds an event by its city", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);

  await page.goto("/events");
  await page.fill("#search", draft.location);

  await expect(page.getByTestId("event-card")).toHaveCount(1);
  await expect(page.getByTestId("event-card")).toContainText(draft.title);
});

test("reports that no event matches a search", async ({ page }) => {
  await page.goto("/events");

  await page.fill("#search", "there-is-no-such-city-anywhere");

  await expect(page.getByTestId("events-empty")).toHaveText("No event matches your search.");
});

test("shows a free event as free", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page, { priceInEuros: "0" });

  await page.goto("/events");

  await expect(
    page.getByTestId("event-card").filter({ hasText: draft.title }).getByTestId("event-price"),
  ).toHaveText("Free");
});

test("edits an event and shows the new title to visitors", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);
  const newTitle = `${draft.title} Reloaded`;

  await organizerRowOf(page, draft).getByRole("link", { name: "Edit" }).click();
  await page.fill("#title", newTitle);
  await saveEventForm(page);

  await page.goto("/events");
  await expect(page.getByTestId("event-card").filter({ hasText: newTitle })).toHaveCount(1);
});

test("cancels an event and tells visitors on its page", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);

  await organizerRowOf(page, draft).getByTestId("cancel-event").click();
  await organizerRowOf(page, draft).getByTestId("confirm-cancel-event").click();
  await expect(organizerRowOf(page, draft)).toHaveCount(0);

  await page.goto("/events");
  await expect(page.getByTestId("event-card").filter({ hasText: draft.title })).toHaveCount(0);
});

test("deletes a draft", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createDraftEvent(page);

  await organizerRowOf(page, draft).getByTestId("delete-event").click();

  await expect(organizerRowOf(page, draft)).toHaveCount(0);
});

test("refuses an event that ends before it starts", async ({ page }) => {
  await registerOrganizer(page);
  const impossibleDraft = newEventDraft({
    startsAt: "2030-09-02T18:00",
    endsAt: "2030-09-01T18:00",
  });

  await page.goto("/organizer/events/new");
  await fillEventForm(page, impossibleDraft);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByTestId("event-form-error")).toHaveText(
    "The event has to end after it starts.",
  );
});

test("refuses an event that starts in the past", async ({ page }) => {
  await registerOrganizer(page);
  const pastDraft = newEventDraft({ startsAt: "2020-09-01T18:00", endsAt: "2020-09-02T02:00" });

  await page.goto("/organizer/events/new");
  await fillEventForm(page, pastDraft);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/organizer\/events\/new$/);

  await page.goto("/organizer");
  await expect(organizerRowOf(page, pastDraft)).toHaveCount(0);
});

test("refuses a paid event priced below what a payment provider can charge", async ({ page }) => {
  await registerOrganizer(page);
  const tooCheapDraft = newEventDraft({ priceInEuros: "0.25" });

  await page.goto("/organizer/events/new");
  await fillEventForm(page, tooCheapDraft);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByTestId("event-form-error")).toHaveText(
    "A paid ticket has to cost at least 0.50 euros.",
  );
});

test("opens the file picker from the upload button", async ({ page }) => {
  await registerOrganizer(page);

  await page.goto("/organizer/events/new");
  const [filePicker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Upload image" }).click(),
  ]);

  expect(filePicker.isMultiple()).toBe(false);
});

test("shows a placeholder picture for an event without an image", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page);

  await page.goto("/events");
  const card = page.getByTestId("event-card").filter({ hasText: draft.title });

  await expect(card.getByTestId("event-image-placeholder")).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);

  await card.click();
  await expect(page.getByTestId("event-image-placeholder")).toBeVisible();
});

test("uploads an event image and serves it to visitors", async ({ page }) => {
  await registerOrganizer(page);
  const draft = newEventDraft();

  await page.goto("/organizer/events/new");
  await fillEventForm(page, draft);
  await page.setInputFiles("#image", {
    name: "poster.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.getByTestId("image-ready")).toBeVisible();
  await saveEventForm(page);

  await organizerRowOf(page, draft).getByTestId("publish-event").click();
  await expect(organizerRowOf(page, draft).getByTestId("organizer-event-status")).toHaveText(
    "On sale",
  );

  await page.goto("/events");
  const poster = page
    .getByTestId("event-card")
    .filter({ hasText: draft.title })
    .locator("img");

  await expect(poster).toBeVisible();
  const posterUrl = String(await poster.getAttribute("src"));
  expect(posterUrl).toContain("/final-queue-pass/events/");
  expect((await page.request.get(posterUrl)).status()).toBe(200);
});

test("keeps attendees out of the organiser area", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.goto("/organizer");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "My events" })).toHaveCount(0);
});

test("sends anonymous visitors from the organiser area to the login form", async ({ page }) => {
  await page.goto("/organizer");

  await expect(page).toHaveURL(/\/login/);
});

test("puts events on sale onto the start page", async ({ page }) => {
  await registerOrganizer(page);
  const draft = await createPublishedEvent(page, {
    startsAt: "2027-01-05T18:00",
    endsAt: "2027-01-05T23:00",
  });

  await page.goto("/");

  const highlighted = page.getByTestId("highlighted-events");
  await expect(highlighted).toBeVisible();
  await expect(highlighted.getByTestId("event-card").filter({ hasText: draft.title })).toHaveCount(
    1,
  );
});

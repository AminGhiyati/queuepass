import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { expect, type Page } from "@playwright/test";
import { newTestAccount, register } from "./accounts";

const e2eRoot = fileURLToPath(new URL("..", import.meta.url));

export type EventDraft = {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  priceInEuros: string;
  capacity: string;
};

let createdEventCount = 0;

export function newEventDraft(overrides: Partial<EventDraft> = {}): EventDraft {
  createdEventCount += 1;

  return {
    title: `E2E Event ${createdEventCount}-${Date.now()}`,
    description: "Three stages, one night, right at the water.",
    location: `Testcity ${createdEventCount}-${Date.now()}`,
    startsAt: "2030-09-01T18:00",
    endsAt: "2030-09-02T02:00",
    priceInEuros: "25",
    capacity: "400",
    ...overrides,
  };
}

export async function registerOrganizer(page: Page) {
  const account = newTestAccount();

  await register(page, account, "organizer");
  await expect(page).toHaveURL(/\/$/);

  return account;
}

export async function saveEventForm(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/organizer$/);
}

export async function fillEventForm(page: Page, draft: EventDraft) {
  await page.fill("#title", draft.title);
  await page.fill("#description", draft.description);
  await page.fill("#location", draft.location);
  await page.fill("#startsAt", draft.startsAt);
  await page.fill("#endsAt", draft.endsAt);
  await page.fill("#price", draft.priceInEuros);
  await page.fill("#capacity", draft.capacity);
}

export async function letEventPass(page: Page, draft: EventDraft) {
  execSync(`pnpm --filter api db:move-event-to-the-past ${JSON.stringify(draft.title)}`, {
    cwd: e2eRoot,
    stdio: "inherit",
  });

  await page.reload();
}

export function organizerRowOf(page: Page, draft: EventDraft) {
  return page.getByTestId("organizer-event-row").filter({ hasText: draft.title });
}

export async function createDraftEvent(page: Page, overrides: Partial<EventDraft> = {}) {
  const draft = newEventDraft(overrides);

  await page.goto("/organizer/events/new");
  await fillEventForm(page, draft);
  await saveEventForm(page);
  await expect(organizerRowOf(page, draft)).toHaveCount(1);

  return draft;
}

export async function openPublishedEvent(page: Page, draft: EventDraft) {
  await page.goto("/events");
  await page.getByTestId("event-card").filter({ hasText: draft.title }).click();
  await expect(page.getByTestId("event-title")).toHaveText(draft.title);

  return String(new URL(page.url()).pathname.split("/").pop());
}

export async function buyTickets(page: Page, draft: EventDraft, quantity = 1) {
  await openPublishedEvent(page, draft);
  await page.getByTestId("buy-ticket").click();
  await page.fill("#quantity", String(quantity));
  await page.getByTestId("confirm-purchase").click();
  await expect(page).toHaveURL(/\/my-tickets$/);
}

export async function collectTicketCodes(page: Page, expectedCount: number) {
  await page.goto("/my-tickets");
  const ticketLinks = page.getByRole("link", { name: "Show ticket" });
  await expect(ticketLinks).toHaveCount(expectedCount);

  const codes: string[] = [];
  for (let index = 0; index < expectedCount; index += 1) {
    await ticketLinks.nth(index).click();
    codes.push(String(await page.getByTestId("ticket-code").textContent()).trim());
    await page.goto("/my-tickets");
  }

  return codes;
}

export async function createPublishedEvent(page: Page, overrides: Partial<EventDraft> = {}) {
  const draft = await createDraftEvent(page, overrides);

  await organizerRowOf(page, draft).getByTestId("publish-event").click();
  await expect(organizerRowOf(page, draft).getByTestId("organizer-event-status")).toHaveText(
    "On sale",
  );

  return draft;
}

import { expect, test } from "@playwright/test";
import { newTestAccount, register, roleRadio, signedInMarker } from "./accounts";
import { registerOrganizer } from "./events";

test("welcomes anonymous visitors with the pitch instead of a login form", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sell out your event");
  await expect(page.getByText("For organisers")).toBeVisible();
  await expect(page.getByText("For guests")).toBeVisible();
});

test("leads to the event list", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Discover events" }).click();

  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
});

test("leads to registration with the organiser role preselected", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Host an event" }).click();

  await expect(page).toHaveURL(/\/register\?role=organizer$/);
  await expect(roleRadio(page, "organizer")).toBeChecked();
});

test("offers a signed in attendee the organiser upgrade", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.getByRole("link", { name: "Host an event" }).click();

  await expect(page).toHaveURL(/\/become-organizer$/);
  await expect(page.getByRole("heading", { name: "Host your own events" })).toBeVisible();
});

test("turns a signed in attendee into an organiser", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByTestId("confirm-become-organizer").click();

  await expect(page).toHaveURL(/\/organizer$/);
  await expect(page.getByRole("heading", { name: "My events" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New event" })).toBeVisible();
});

test("sends an organiser straight to their events", async ({ page }) => {
  await registerOrganizer(page);

  await page.getByRole("link", { name: "Host an event" }).click();

  await expect(page).toHaveURL(/\/organizer$/);
});

test("keeps an organiser away from the upgrade page", async ({ page }) => {
  await registerOrganizer(page);

  await page.goto("/become-organizer");

  await expect(page).toHaveURL(/\/organizer$/);
});

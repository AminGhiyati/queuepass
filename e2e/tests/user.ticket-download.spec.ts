import { expect, test, type Locator, type Page } from "@playwright/test";
import { apiUrl } from "../playwright.config";
import { newTestAccount, register, signedInMarker } from "./accounts";
import { buyTickets, createPublishedEvent, registerOrganizer } from "./events";

async function isOffered(walletButton: Locator) {
  return (await walletButton.getAttribute("href")) !== null;
}

async function boughtTicketId(page: Page) {
  await page.goto("/my-tickets");
  await page.getByRole("link", { name: "Show ticket" }).first().click();
  await page.getByTestId("ticket-qr-code").waitFor();

  return String(new URL(page.url()).pathname.split("/").pop());
}

test("downloads the ticket as a pdf", async ({ page, browser }) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);
  const ticketId = await boughtTicketId(page);

  const pdf = await page.request.get(`${apiUrl}/tickets/${ticketId}/pdf`);

  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("offers the pdf from the ticket page", async ({ page, browser }) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);
  const ticketId = await boughtTicketId(page);

  await expect(page.getByTestId("ticket-pdf-link")).toHaveAttribute(
    "href",
    `${apiUrl}/tickets/${ticketId}/pdf?locale=en`,
  );
});

test("hands out the pdf in the language the page is shown in", async ({
  page,
  browser,
}) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);
  const ticketId = await boughtTicketId(page);

  await page
    .getByTestId("language-switcher")
    .getByRole("button", { name: "DE", exact: true })
    .click();

  await expect(page.getByTestId("ticket-pdf-link")).toHaveAttribute(
    "href",
    `${apiUrl}/tickets/${ticketId}/pdf?locale=de`,
  );
});

test("refuses the pdf of somebody else's ticket", async ({ page, browser }) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await register(buyerPage, newTestAccount());
  await signedInMarker(buyerPage).waitFor();
  await buyTickets(buyerPage, draft);
  const ticketId = await boughtTicketId(buyerPage);
  await buyerContext.close();

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  const pdf = await page.request.get(`${apiUrl}/tickets/${ticketId}/pdf`);

  expect(pdf.status()).toBe(404);
});

test("refuses the pdf without an account", async ({ request }) => {
  const pdf = await request.get(`${apiUrl}/tickets/any-ticket-id/pdf`);

  expect(pdf.status()).toBe(401);
});

test("hands out the Apple Wallet pass the deployment is configured for", async ({
  page,
  browser,
}) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);
  const ticketId = await boughtTicketId(page);

  const applePassButton = page.getByTestId("apple-wallet");
  const applePass = await page.request.get(
    `${apiUrl}/tickets/${ticketId}/pkpass`,
  );

  if (await isOffered(applePassButton)) {
    await expect(applePassButton).toHaveAttribute(
      "href",
      `${apiUrl}/tickets/${ticketId}/pkpass`,
    );
    expect(applePass.status()).toBe(200);
    expect(applePass.headers()["content-type"]).toContain(
      "application/vnd.apple.pkpass",
    );
    return;
  }

  await expect(applePassButton).toBeDisabled();
  expect(applePass.status()).toBe(503);
  expect(await applePass.json()).toMatchObject({ provider: "Apple Wallet" });
});

test("hands out the Google Wallet save link the deployment is configured for", async ({
  page,
  browser,
}) => {
  const organizerContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  await registerOrganizer(organizerPage);
  const draft = await createPublishedEvent(organizerPage);
  await organizerContext.close();

  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();
  await buyTickets(page, draft);
  const ticketId = await boughtTicketId(page);

  const googleWalletButton = page.getByTestId("google-wallet");
  const googlePass = await page.request.get(
    `${apiUrl}/tickets/${ticketId}/google-wallet`,
    {
      maxRedirects: 0,
    },
  );

  if (await isOffered(googleWalletButton)) {
    expect(googlePass.status()).toBe(302);
    expect(googlePass.headers()["location"]).toContain(
      "https://pay.google.com/gp/v/save/",
    );
    return;
  }

  await expect(googleWalletButton).toBeDisabled();
  expect(googlePass.status()).toBe(503);
  expect(await googlePass.json()).toMatchObject({ provider: "Google Wallet" });
});

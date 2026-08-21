import { expect, test } from "@playwright/test";
import { newTestAccount, register, signedInMarker, submitSignInForm } from "./accounts";

test("keeps an order away from someone it does not belong to", async ({ page }) => {
  await register(page, newTestAccount());
  await signedInMarker(page).waitFor();

  await page.goto("/orders/order-of-somebody-else");

  await expect(page.getByTestId("order-load-failed")).toHaveText(
    "This order could not be loaded.",
  );
  await expect(page.getByTestId("order-state")).toHaveCount(0);
});

test("asks an anonymous visitor to sign in and returns them to the order", async ({
  page,
  browser,
}) => {
  const buyer = newTestAccount();
  const registerContext = await browser.newContext();
  const registerPage = await registerContext.newPage();
  await register(registerPage, buyer);
  await signedInMarker(registerPage).waitFor();
  await registerContext.close();

  await page.goto("/orders/order-id?checkout=success");

  await expect(page).toHaveURL(/redirectTo=\/orders\/order-id/);

  await submitSignInForm(page, buyer);

  await expect(page).toHaveURL(/\/orders\/order-id\?checkout=success$/);
});

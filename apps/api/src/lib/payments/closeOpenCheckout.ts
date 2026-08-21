import { expireStripeCheckout } from "./stripePaymentProvider.js";

type OpenCheckout = {
  id: string;
  paymentProvider: string;
  paymentReference: string | null;
};

export async function closeOpenCheckout({
  id,
  paymentProvider,
  paymentReference,
}: OpenCheckout) {
  if (paymentProvider !== "STRIPE" || !paymentReference) {
    return { wasClosed: false };
  }

  try {
    await expireStripeCheckout(paymentReference);

    return { wasClosed: true };
  } catch (expiryFailure) {
    console.error(`Checkout of order ${id} could not be closed`, expiryFailure);

    return { wasClosed: false };
  }
}

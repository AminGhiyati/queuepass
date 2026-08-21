import type Stripe from "stripe";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { markOrderPaid } from "./orderPayments.js";
import {
  markRefundSettled,
  refundLatePaymentOfCancelledOrder,
} from "./orderRefunds.js";
import { releaseUnpaidOrder } from "./releaseUnpaidOrder.js";

const STRIPE_PROVIDER = "STRIPE";

function orderIdOf(session: Stripe.Checkout.Session) {
  return session.client_reference_id ?? session.metadata?.orderId ?? null;
}

function paymentReferenceOf(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.id;
}

async function settleCheckoutSession(
  prisma: PrismaClient,
  session: Stripe.Checkout.Session,
) {
  const orderId = orderIdOf(session);

  if (!orderId || session.payment_status === "unpaid") {
    return { handled: false };
  }

  const reference = paymentReferenceOf(session);
  const { wasPending } = await markOrderPaid(prisma, {
    orderId,
    provider: STRIPE_PROVIDER,
    reference,
  });

  if (!wasPending) {
    await refundLatePaymentOfCancelledOrder(prisma, {
      orderId,
      provider: STRIPE_PROVIDER,
      reference,
    });
  }

  return { handled: true };
}

async function settleRefundOfCharge(
  prisma: PrismaClient,
  charge: Stripe.Charge,
) {
  if (typeof charge.payment_intent !== "string") {
    return { handled: false };
  }

  const { wasSettled } = await markRefundSettled(prisma, charge.payment_intent);

  return { handled: wasSettled };
}

async function releaseCheckoutSession(
  prisma: PrismaClient,
  session: Stripe.Checkout.Session,
) {
  const orderId = orderIdOf(session);

  if (!orderId) {
    return { handled: false };
  }

  await releaseUnpaidOrder(prisma, orderId);

  return { handled: true };
}

export async function handleStripeEvent(
  prisma: PrismaClient,
  event: Stripe.Event,
) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return settleCheckoutSession(prisma, event.data.object);
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return releaseCheckoutSession(prisma, event.data.object);
    case "charge.refunded":
      return settleRefundOfCharge(prisma, event.data.object);
    default:
      return { handled: false };
  }
}

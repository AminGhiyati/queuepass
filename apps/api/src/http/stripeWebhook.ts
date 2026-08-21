import express, { Router, type IRouter } from "express";
import type Stripe from "stripe";
import { handleStripeEvent } from "../lib/payments/handleStripeEvent.js";
import {
  isStripeConfigured,
  stripeApi,
  stripeWebhookSecret,
} from "../lib/payments/stripeApi.js";
import { prisma } from "../lib/prisma.js";

export const STRIPE_WEBHOOK_PATH = "/stripe/webhook";

export const stripeWebhook: IRouter = Router();

stripeWebhook.post(
  STRIPE_WEBHOOK_PATH,
  express.raw({ type: "application/json" }),
  async (request, response) => {
    if (!isStripeConfigured()) {
      response.status(503).json({ error: "STRIPE_NOT_CONFIGURED" });
      return;
    }

    const signature = request.headers["stripe-signature"];

    if (typeof signature !== "string") {
      response.status(400).json({ error: "MISSING_SIGNATURE" });
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripeApi().webhooks.constructEvent(
        request.body,
        signature,
        stripeWebhookSecret(),
      );
    } catch {
      response.status(400).json({ error: "INVALID_SIGNATURE" });
      return;
    }

    await handleStripeEvent(prisma, event);

    response.json({ received: true });
  },
);

import Stripe from "stripe";
import { environment } from "../environment.js";

export const stripeConfiguration = {
  secretKey: environment.STRIPE_SECRET_KEY ?? null,
  webhookSecret: environment.STRIPE_WEBHOOK_SECRET ?? null,
};

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("STRIPE_NOT_CONFIGURED");
    this.name = "StripeNotConfiguredError";
  }
}

export function isStripeConfigured() {
  return Object.values(stripeConfiguration).every((value) => value !== null);
}

let connectedStripe: Stripe | null = null;

export function stripeApi(): Stripe {
  if (!stripeConfiguration.secretKey) {
    throw new StripeNotConfiguredError();
  }

  connectedStripe ??= new Stripe(stripeConfiguration.secretKey);

  return connectedStripe;
}

export function stripeWebhookSecret(): string {
  if (!stripeConfiguration.webhookSecret) {
    throw new StripeNotConfiguredError();
  }

  return stripeConfiguration.webhookSecret;
}

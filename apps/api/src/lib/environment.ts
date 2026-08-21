import "dotenv/config";
import { z } from "zod";

const optionalKey = z.preprocess(
  (value) => value || undefined,
  z.string().min(1).optional(),
);

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.url(),
  API_PORT: z.coerce.number().default(3000),
  USER_CLIENT_URL: z.url(),
  ADMIN_CLIENT_URL: z.url(),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.url(),
  STRIPE_SECRET_KEY: optionalKey,
  STRIPE_WEBHOOK_SECRET: optionalKey,
  APPLE_PASS_TEAM_ID: optionalKey,
  APPLE_PASS_TYPE_IDENTIFIER: optionalKey,
  APPLE_PASS_CERTIFICATE: optionalKey,
  APPLE_PASS_CERTIFICATE_KEY: optionalKey,
  APPLE_PASS_CERTIFICATE_KEY_PASSWORD: optionalKey,
  APPLE_PASS_WWDR_CERTIFICATE: optionalKey,
  GOOGLE_WALLET_ISSUER_ID: optionalKey,
  GOOGLE_WALLET_SERVICE_ACCOUNT_KEY: optionalKey,
});

export const environment = environmentSchema.parse(process.env);

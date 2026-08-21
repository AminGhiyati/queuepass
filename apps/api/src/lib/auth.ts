import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { environment } from "./environment.js";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: environment.BETTER_AUTH_SECRET,
  baseURL: environment.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: [environment.USER_CLIENT_URL, environment.ADMIN_CLIENT_URL],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
});

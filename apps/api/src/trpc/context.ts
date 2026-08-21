import type { IncomingHttpHeaders } from "node:http";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function resolveCurrentUser(headers: IncomingHttpHeaders) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function createContext({ req }: CreateExpressContextOptions) {
  return { prisma, currentUser: await resolveCurrentUser(req.headers) };
}

export type ApiContext = Awaited<ReturnType<typeof createContext>>;
export type AuthenticatedUser = NonNullable<ApiContext["currentUser"]>;

import { appRouter } from "../router/appRouter.js";
import type { ApiContext, AuthenticatedUser } from "../trpc/context.js";

type TestCallerOptions = {
  currentUser?: AuthenticatedUser | null;
  prisma?: unknown;
};

type TestCaller = ReturnType<typeof appRouter.createCaller>;

export const adminUser: AuthenticatedUser = {
  id: "admin-id",
  name: "Administrator",
  email: "admin@example.com",
  role: "ADMIN",
};

export const organizerUser: AuthenticatedUser = {
  id: "organizer-id",
  name: "Clara Vogt",
  email: "clara@example.com",
  role: "ORGANIZER",
};

export const attendeeUser: AuthenticatedUser = {
  id: "attendee-id",
  name: "Anna Becker",
  email: "anna@example.com",
  role: "ATTENDEE",
};

export function createTestCaller({
  currentUser = null,
  prisma = {},
}: TestCallerOptions = {}): TestCaller {
  return appRouter.createCaller({ currentUser, prisma } as unknown as ApiContext);
}

export function createTestContext({
  currentUser = null,
  prisma = {},
}: TestCallerOptions = {}): ApiContext {
  return { currentUser, prisma } as unknown as ApiContext;
}

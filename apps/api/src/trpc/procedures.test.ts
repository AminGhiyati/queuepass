import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import {
  adminUser,
  attendeeUser,
  createTestContext,
  organizerUser,
} from "../testing/createTestCaller.js";
import type { AuthenticatedUser } from "./context.js";
import {
  adminProcedure,
  authenticatedProcedure,
  createRouter,
  organizerProcedure,
} from "./procedures.js";

const guardedRouter = createRouter({
  forAuthenticated: authenticatedProcedure.query(({ ctx }) => ctx.currentUser),
  forOrganizers: organizerProcedure.query(({ ctx }) => ctx.currentUser),
  forAdmins: adminProcedure.query(({ ctx }) => ctx.currentUser),
});

function callerFor(currentUser: AuthenticatedUser | null) {
  return guardedRouter.createCaller(createTestContext({ currentUser }));
}

describe("authenticatedProcedure", () => {
  it("rejects anonymous callers", async () => {
    await expect(callerFor(null).forAuthenticated()).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });

  it("passes the signed in user to the resolver", async () => {
    await expect(callerFor(attendeeUser).forAuthenticated()).resolves.toEqual(attendeeUser);
  });
});

describe("organizerProcedure", () => {
  it("rejects attendees", async () => {
    await expect(callerFor(attendeeUser).forOrganizers()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("rejects administrators, who are not organizers", async () => {
    await expect(callerFor(adminUser).forOrganizers()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("allows organizers", async () => {
    await expect(callerFor(organizerUser).forOrganizers()).resolves.toEqual(organizerUser);
  });
});

describe("adminProcedure", () => {
  it("rejects signed in users without the admin role", async () => {
    await expect(callerFor(organizerUser).forAdmins()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("rejects anonymous callers before checking the role", async () => {
    await expect(callerFor(null).forAdmins()).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });

  it("allows admins", async () => {
    await expect(callerFor(adminUser).forAdmins()).resolves.toEqual(adminUser);
  });
});

describe("thrown errors", () => {
  it("are tRPC errors", async () => {
    await expect(callerFor(null).forAuthenticated()).rejects.toBeInstanceOf(TRPCError);
  });
});

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { UserRole } from "../generated/prisma/enums.js";
import type { ApiContext } from "./context.js";

const trpc = initTRPC.context<ApiContext>().create({ transformer: superjson });

export const createRouter = trpc.router;
export const mergeRouters = trpc.mergeRouters;
export const publicProcedure = trpc.procedure;

export const authenticatedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.currentUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, currentUser: ctx.currentUser } });
});

function procedureForRole(role: UserRole) {
  return authenticatedProcedure.use(({ ctx, next }) => {
    if (ctx.currentUser.role !== role) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}

export const organizerProcedure = procedureForRole("ORGANIZER");
export const adminProcedure = procedureForRole("ADMIN");

export const ownedEventProcedure = organizerProcedure
  .input(z.object({ eventId: z.string().min(1) }))
  .use(async ({ ctx, input, next }) => {
    const event = await ctx.prisma.event.findFirst({
      where: { id: input.eventId, organizerId: ctx.currentUser.id },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return next({ ctx: { ...ctx, event } });
  });

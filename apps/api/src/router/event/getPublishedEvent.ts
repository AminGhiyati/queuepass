import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../trpc/procedures.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

export const getPublishedEvent = publicProcedure
  .input(z.object({ eventId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const event = await ctx.prisma.event.findFirst({
      where: { id: input.eventId, status: { in: ["PUBLISHED", "CANCELLED"] } },
      select: publicEventSelection,
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return toPublicEvent(event);
  });

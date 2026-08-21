import { z } from "zod";
import { organizerProcedure } from "../../trpc/procedures.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

function archivedEvents(now: Date) {
  return { OR: [{ endsAt: { lt: now } }, { status: "CANCELLED" as const }] };
}

function eventsStillAhead(now: Date) {
  return { endsAt: { gte: now }, status: { not: "CANCELLED" as const } };
}

export const listMyEvents = organizerProcedure
  .input(z.object({ timeframe: z.enum(["UPCOMING", "PAST"]) }))
  .query(async ({ ctx, input }) => {
    const isArchive = input.timeframe === "PAST";
    const now = new Date();

    const events = await ctx.prisma.event.findMany({
      where: {
        organizerId: ctx.currentUser.id,
        ...(isArchive ? archivedEvents(now) : eventsStillAhead(now)),
      },
      orderBy: { startsAt: isArchive ? "desc" : "asc" },
      select: publicEventSelection,
    });

    return events.map(toPublicEvent);
  });

import { z } from "zod";
import { publicProcedure } from "../../trpc/procedures.js";
import { publicEventSelection, toPublicEvent } from "./publicEvent.js";

export const listPublishedEvents = publicProcedure
  .input(
    z
      .object({
        limit: z.number().int().min(1).max(100).default(50),
        search: z.string().trim().max(120).default(""),
      })
      .prefault({}),
  )
  .query(async ({ ctx, input }) => {
    const matchesSearch = input.search
      ? {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { location: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const events = await ctx.prisma.event.findMany({
      where: { status: "PUBLISHED", endsAt: { gte: new Date() }, ...matchesSearch },
      orderBy: { startsAt: "asc" },
      take: input.limit,
      select: publicEventSelection,
    });

    return events.map(toPublicEvent);
  });

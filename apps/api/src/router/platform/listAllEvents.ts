import { adminProcedure } from "../../trpc/procedures.js";

export const listAllEvents = adminProcedure.query(async ({ ctx }) => {
  const events = await ctx.prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      location: true,
      startsAt: true,
      status: true,
      priceCents: true,
      capacity: true,
      soldCount: true,
      organizer: { select: { name: true, email: true } },
    },
  });

  return events.map(({ organizer, ...event }) => ({
    ...event,
    organizerName: organizer.name,
    organizerEmail: organizer.email,
  }));
});

import { TRPCError } from "@trpc/server";
import { authenticatedProcedure } from "../../trpc/procedures.js";

export const becomeOrganizer = authenticatedProcedure.mutation(async ({ ctx }) => {
  const { count } = await ctx.prisma.user.updateMany({
    where: { id: ctx.currentUser.id, role: "ATTENDEE" },
    data: { role: "ORGANIZER" },
  });

  if (count === 0) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { ...ctx.currentUser, role: "ORGANIZER" as const };
});

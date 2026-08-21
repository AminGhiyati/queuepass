import { organizerProcedure } from "../../trpc/procedures.js";

export const getMyPayoutSettings = organizerProcedure.query(async ({ ctx }) => {
  const organizer = await ctx.prisma.user.findUniqueOrThrow({
    where: { id: ctx.currentUser.id },
    select: { payoutIban: true },
  });

  return { payoutIban: organizer.payoutIban };
});

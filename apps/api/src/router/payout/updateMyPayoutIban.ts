import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isValidIban, normalizeIban } from "../../lib/payouts/iban.js";
import { organizerProcedure } from "../../trpc/procedures.js";

export const updateMyPayoutIban = organizerProcedure
  .input(z.object({ iban: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const iban = normalizeIban(input.iban);

    if (!isValidIban(iban)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_IBAN" });
    }

    const organizer = await ctx.prisma.user.update({
      where: { id: ctx.currentUser.id },
      data: { payoutIban: iban },
      select: { payoutIban: true },
    });

    return { payoutIban: organizer.payoutIban };
  });

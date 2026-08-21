import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { readPayoutBalanceOfOrganizer } from "../../lib/payouts/payoutBalance.js";
import { adminProcedure } from "../../trpc/procedures.js";

export const markOrganizerPayoutTransferred = adminProcedure
  .input(z.object({ organizerId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const organizer = await ctx.prisma.user.findFirst({
      where: { id: input.organizerId, role: "ORGANIZER" },
      select: { id: true, payoutIban: true },
    });

    if (!organizer) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (!organizer.payoutIban) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PAYOUT_IBAN_MISSING" });
    }

    const { outstandingCents } = await readPayoutBalanceOfOrganizer(ctx.prisma, organizer.id);

    if (outstandingCents <= 0) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "NOTHING_OUTSTANDING" });
    }

    return ctx.prisma.payout.create({
      data: {
        organizerId: organizer.id,
        amountCents: outstandingCents,
        iban: organizer.payoutIban,
        markedByAdminId: ctx.currentUser.id,
      },
      select: { id: true, amountCents: true, iban: true, transferredAt: true },
    });
  });

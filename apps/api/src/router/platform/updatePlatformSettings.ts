import { z } from "zod";
import { adminProcedure } from "../../trpc/procedures.js";

const SINGLETON_ID = "singleton";

export const updatePlatformSettings = adminProcedure
  .input(z.object({ feePercent: z.number().int().min(0).max(50) }))
  .mutation(async ({ ctx, input }) => {
    const settings = await ctx.prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { feePercent: input.feePercent },
      create: { id: SINGLETON_ID, feePercent: input.feePercent },
    });

    return { feePercent: settings.feePercent };
  });

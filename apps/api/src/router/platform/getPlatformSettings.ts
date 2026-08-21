import { readPlatformFeePercent } from "../../lib/platformFee.js";
import { adminProcedure } from "../../trpc/procedures.js";

export const getPlatformSettings = adminProcedure.query(async ({ ctx }) => ({
  feePercent: await readPlatformFeePercent(ctx.prisma),
}));

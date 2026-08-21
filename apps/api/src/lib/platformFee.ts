import type { PrismaClient } from "../generated/prisma/client.js";

const SINGLETON_ID = "singleton";
const DEFAULT_FEE_PERCENT = 5;

export async function readPlatformFeePercent(prisma: Pick<PrismaClient, "platformSettings">) {
  const settings = await prisma.platformSettings.findUnique({ where: { id: SINGLETON_ID } });

  return settings?.feePercent ?? DEFAULT_FEE_PERCENT;
}

export function platformFeeCentsOf(totalCents: number, feePercent: number) {
  return Math.round((totalCents * feePercent) / 100);
}

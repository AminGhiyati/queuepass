import { Prisma } from "../../generated/prisma/client.js";

type CapacityClaim = {
  eventId: string;
  quantity: number;
};

type RawCapable = { $executeRaw(query: Prisma.Sql): Promise<number> };

export async function claimEventCapacity(
  transaction: RawCapable,
  { eventId, quantity }: CapacityClaim,
) {
  const claimedRows = await transaction.$executeRaw(Prisma.sql`
    UPDATE "event"
    SET "soldCount" = "soldCount" + ${quantity}
    WHERE "id" = ${eventId}
      AND "status" = 'PUBLISHED'
      AND "soldCount" + ${quantity} <= "capacity"
  `);

  return { wasClaimed: claimedRows === 1 };
}

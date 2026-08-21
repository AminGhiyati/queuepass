import type { PrismaClient } from "../../generated/prisma/client.js";

export async function releaseUnpaidOrder(prisma: PrismaClient, orderId: string) {
  return prisma.$transaction(async (transaction) => {
    const { count } = await transaction.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    if (count !== 1) {
      return { wasReleased: false };
    }

    const order = await transaction.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { eventId: true, quantity: true },
    });

    await transaction.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
    await transaction.event.update({
      where: { id: order.eventId },
      data: { soldCount: { decrement: order.quantity } },
    });

    return { wasReleased: true };
  });
}

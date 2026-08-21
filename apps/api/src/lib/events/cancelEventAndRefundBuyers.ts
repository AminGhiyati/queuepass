import type { PrismaClient } from "../../generated/prisma/client.js";
import { closeOpenCheckout } from "../payments/closeOpenCheckout.js";
import { refundableOrderSelection, refundOrder } from "../payments/orderRefunds.js";

export async function cancelEventAndRefundBuyers(prisma: PrismaClient, eventId: string) {
  const { paidOrders, openCheckouts } = await prisma.$transaction(async (transaction) => {
    await transaction.event.update({ where: { id: eventId }, data: { status: "CANCELLED" } });
    await transaction.ticket.updateMany({
      where: { eventId, status: "VALID" },
      data: { status: "CANCELLED" },
    });

    const paidOrders = await transaction.order.findMany({
      where: { eventId, status: "PAID" },
      select: refundableOrderSelection,
    });

    await transaction.order.updateMany({
      where: { eventId, status: "PAID" },
      data: { status: "REFUND_PENDING" },
    });

    const openCheckouts = await transaction.order.findMany({
      where: { eventId, status: "PENDING" },
      select: { ...refundableOrderSelection, quantity: true },
    });

    await transaction.order.updateMany({
      where: { eventId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const claimedSeats = openCheckouts.reduce((seats, order) => seats + order.quantity, 0);

    if (claimedSeats > 0) {
      await transaction.event.update({
        where: { id: eventId },
        data: { soldCount: { decrement: claimedSeats } },
      });
    }

    return { paidOrders, openCheckouts };
  });

  await Promise.all(openCheckouts.map(closeOpenCheckout));

  const refunds = await Promise.all(
    paidOrders.map(async (order) => ({
      totalCents: order.totalCents,
      ...(await refundOrder(prisma, order)),
    })),
  );

  const startedRefunds = refunds.filter((refund) => refund.wasRefundStarted);

  return {
    refundedOrderCount: startedRefunds.length,
    failedRefundCount: refunds.length - startedRefunds.length,
    refundedCents: startedRefunds.reduce((sum, refund) => sum + refund.totalCents, 0),
  };
}

import type { PrismaClient } from "../../generated/prisma/client.js";
import { refundProviderFor } from "./refundProvider.js";

export type RefundableOrder = {
  id: string;
  totalCents: number;
  paymentProvider: string;
  paymentReference: string | null;
};

type LatePayment = {
  orderId: string;
  provider: string;
  reference: string;
};

export const refundableOrderSelection = {
  id: true,
  totalCents: true,
  paymentProvider: true,
  paymentReference: true,
} as const;

export async function refundOrder(
  prisma: Pick<PrismaClient, "order">,
  order: RefundableOrder,
) {
  try {
    const refund = await refundProviderFor(order.paymentProvider).startRefund({
      orderId: order.id,
      amountCents: order.totalCents,
      paymentReference: order.paymentReference,
    });

    await prisma.order.updateMany({
      where: { id: order.id, status: "REFUND_PENDING" },
      data: refund.settlesImmediately
        ? {
            status: "REFUNDED",
            refundedAt: new Date(),
            refundReference: refund.reference,
          }
        : { refundReference: refund.reference },
    });

    return { wasRefundStarted: true };
  } catch (refundFailure) {
    console.error(`Refund failed for order ${order.id}`, refundFailure);

    await prisma.order.updateMany({
      where: { id: order.id, status: "REFUND_PENDING" },
      data: { status: "REFUND_FAILED" },
    });

    return { wasRefundStarted: false };
  }
}

export async function markRefundSettled(
  prisma: Pick<PrismaClient, "order">,
  paymentReference: string,
) {
  const { count } = await prisma.order.updateMany({
    where: { paymentReference, status: "REFUND_PENDING" },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });

  return { wasSettled: count > 0 };
}

export async function refundLatePaymentOfCancelledOrder(
  prisma: Pick<PrismaClient, "order">,
  { orderId, provider, reference }: LatePayment,
) {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "CANCELLED" },
    data: {
      status: "REFUND_PENDING",
      paymentProvider: provider,
      paymentReference: reference,
    },
  });

  if (count !== 1) {
    return { wasRefundStarted: false };
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: refundableOrderSelection,
  });

  return refundOrder(prisma, order);
}

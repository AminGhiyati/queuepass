import type { PrismaClient } from "../../generated/prisma/client.js";

type OrderPayment = {
  orderId: string;
  provider: string;
  reference: string;
};

export async function storeStartedPayment(
  prisma: Pick<PrismaClient, "order">,
  { orderId, provider, reference }: OrderPayment,
) {
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { paymentProvider: provider, paymentReference: reference },
  });
}

export async function markOrderPaid(
  prisma: Pick<PrismaClient, "order">,
  { orderId, provider, reference }: OrderPayment,
) {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentProvider: provider,
      paymentReference: reference,
    },
  });

  return { wasPending: count === 1 };
}

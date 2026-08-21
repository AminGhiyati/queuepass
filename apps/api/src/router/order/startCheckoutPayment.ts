import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  paymentProviderFor,
  type PaymentRequest,
} from "../../lib/payments/paymentProvider.js";
import { releaseUnpaidOrder } from "../../lib/payments/releaseUnpaidOrder.js";

export async function startCheckoutPayment(
  prisma: PrismaClient,
  totalCents: number,
  request: PaymentRequest,
) {
  try {
    return await paymentProviderFor(totalCents).startPayment(request);
  } catch (paymentStartError) {
    console.error(
      `Payment start failed for order ${request.orderId}`,
      paymentStartError,
    );

    await releaseUnpaidOrder(prisma, request.orderId);

    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "PAYMENT_START_FAILED",
    });
  }
}

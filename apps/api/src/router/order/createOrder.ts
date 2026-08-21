import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  markOrderPaid,
  storeStartedPayment,
} from "../../lib/payments/orderPayments.js";
import { isSellablePrice } from "../../lib/payments/sellablePrice.js";
import {
  platformFeeCentsOf,
  readPlatformFeePercent,
} from "../../lib/platformFee.js";
import { createTicketCode } from "../../lib/tickets/ticketCode.js";
import { authenticatedProcedure } from "../../trpc/procedures.js";
import { claimEventCapacity } from "./claimEventCapacity.js";
import { startCheckoutPayment } from "./startCheckoutPayment.js";

const MAXIMUM_TICKETS_PER_ORDER = 10;

export const createOrder = authenticatedProcedure
  .input(
    z.object({
      eventId: z.string().min(1),
      quantity: z.number().int().min(1).max(MAXIMUM_TICKETS_PER_ORDER),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const event = await ctx.prisma.event.findFirst({
      where: {
        id: input.eventId,
        status: "PUBLISHED",
        endsAt: { gte: new Date() },
      },
      select: { id: true, title: true, priceCents: true },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (!isSellablePrice(event.priceCents)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "PRICE_BELOW_MINIMUM",
      });
    }

    const feePercent = await readPlatformFeePercent(ctx.prisma);
    const totalCents = event.priceCents * input.quantity;

    const order = await ctx.prisma.$transaction(async (transaction) => {
      const { wasClaimed } = await claimEventCapacity(transaction, {
        eventId: event.id,
        quantity: input.quantity,
      });

      if (!wasClaimed) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "NOT_ENOUGH_TICKETS_LEFT",
        });
      }

      return transaction.order.create({
        data: {
          eventId: event.id,
          buyerId: ctx.currentUser.id,
          quantity: input.quantity,
          unitPriceCents: event.priceCents,
          totalCents,
          platformFeeCents: platformFeeCentsOf(totalCents, feePercent),
          tickets: {
            create: Array.from({ length: input.quantity }, () => ({
              code: createTicketCode(),
              eventId: event.id,
            })),
          },
        },
        select: { id: true, totalCents: true, quantity: true },
      });
    });

    const payment = await startCheckoutPayment(ctx.prisma, totalCents, {
      orderId: order.id,
      eventId: event.id,
      eventTitle: event.title,
      buyerEmail: ctx.currentUser.email,
      quantity: input.quantity,
      unitPriceCents: event.priceCents,
    });

    const startedPayment = {
      orderId: order.id,
      provider: payment.provider,
      reference: payment.reference,
    };

    if (payment.settlesImmediately) {
      await markOrderPaid(ctx.prisma, startedPayment);
    } else {
      await storeStartedPayment(ctx.prisma, startedPayment);
    }

    return {
      orderId: order.id,
      quantity: order.quantity,
      totalCents: order.totalCents,
      isPaid: payment.settlesImmediately,
      redirectUrl: payment.redirectUrl,
    };
  });

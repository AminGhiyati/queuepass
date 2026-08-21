import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authenticatedProcedure } from "../../trpc/procedures.js";

export const getMyOrder = authenticatedProcedure
  .input(z.object({ orderId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const order = await ctx.prisma.order.findFirst({
      where: { id: input.orderId, buyerId: ctx.currentUser.id },
      select: {
        id: true,
        status: true,
        quantity: true,
        totalCents: true,
        event: { select: { id: true, title: true } },
      },
    });

    if (!order) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      id: order.id,
      status: order.status,
      quantity: order.quantity,
      totalCents: order.totalCents,
      isPaid: order.status === "PAID",
      eventId: order.event.id,
      eventTitle: order.event.title,
    };
  });

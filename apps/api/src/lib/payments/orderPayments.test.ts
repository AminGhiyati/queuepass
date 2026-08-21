import { describe, expect, it, vi } from "vitest";
import { markOrderPaid, storeStartedPayment } from "./orderPayments.js";

function prismaWithUpdatedRows(count: number) {
  const updateMany = vi.fn().mockResolvedValue({ count });

  return { updateMany, prisma: { order: { updateMany } } as never };
}

const payment = { orderId: "order-id", provider: "SIMULATED", reference: "reference" };

describe("markOrderPaid", () => {
  it("only settles an order that is still pending", async () => {
    const { prisma, updateMany } = prismaWithUpdatedRows(1);

    await markOrderPaid(prisma, payment);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: expect.objectContaining({
        status: "PAID",
        paymentProvider: "SIMULATED",
        paymentReference: "reference",
      }),
    });
  });

  it("records when the payment arrived", async () => {
    const { prisma, updateMany } = prismaWithUpdatedRows(1);

    await markOrderPaid(prisma, payment);

    expect(updateMany.mock.calls[0]?.[0].data.paidAt).toBeInstanceOf(Date);
  });

  it("reports that an already settled order was left alone", async () => {
    const { prisma } = prismaWithUpdatedRows(0);

    await expect(markOrderPaid(prisma, payment)).resolves.toEqual({ wasPending: false });
  });
});

describe("storeStartedPayment", () => {
  it("attaches the payment to the order without settling it", async () => {
    const { prisma, updateMany } = prismaWithUpdatedRows(1);

    await storeStartedPayment(prisma, {
      orderId: "order-id",
      provider: "STRIPE",
      reference: "cs_test_1",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "order-id", status: "PENDING" },
      data: { paymentProvider: "STRIPE", paymentReference: "cs_test_1" },
    });
  });
});

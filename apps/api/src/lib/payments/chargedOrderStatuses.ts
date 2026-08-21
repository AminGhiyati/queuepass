import type { OrderStatus } from "../../generated/prisma/enums.js";

export const chargedOrderStatuses: OrderStatus[] = [
  "PAID",
  "REFUND_PENDING",
  "REFUNDED",
  "REFUND_FAILED",
];

import { createRouter } from "../../trpc/procedures.js";
import { createOrder } from "./createOrder.js";
import { getMyOrder } from "./getMyOrder.js";

export const orderRouter = createRouter({
  createOrder,
  getMyOrder,
});

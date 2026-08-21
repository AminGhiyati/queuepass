import { createRouter } from "../trpc/procedures.js";
import { checkInRouter } from "./checkIn/checkInRouter.js";
import { eventRouter } from "./event/eventRouter.js";
import { orderRouter } from "./order/orderRouter.js";
import { payoutRouter } from "./payout/payoutRouter.js";
import { platformRouter } from "./platform/platformRouter.js";
import { ticketRouter } from "./ticket/ticketRouter.js";
import { userRouter } from "./user/userRouter.js";

export const appRouter = createRouter({
  user: userRouter,
  event: eventRouter,
  order: orderRouter,
  ticket: ticketRouter,
  checkIn: checkInRouter,
  payout: payoutRouter,
  platform: platformRouter,
});

export type AppRouter = typeof appRouter;

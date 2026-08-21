import { createRouter } from "../../trpc/procedures.js";
import { getPlatformSettings } from "./getPlatformSettings.js";
import { getRevenueReport } from "./getRevenueReport.js";
import { listAllEvents } from "./listAllEvents.js";
import { listAllOrders } from "./listAllOrders.js";
import { updatePlatformSettings } from "./updatePlatformSettings.js";

export const platformRouter = createRouter({
  listAllEvents,
  listAllOrders,
  getRevenueReport,
  getPlatformSettings,
  updatePlatformSettings,
});

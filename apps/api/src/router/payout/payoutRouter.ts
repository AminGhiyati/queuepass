import { createRouter } from "../../trpc/procedures.js";
import { getMyPayoutSettings } from "./getMyPayoutSettings.js";
import { listOrganizerPayouts } from "./listOrganizerPayouts.js";
import { markOrganizerPayoutTransferred } from "./markOrganizerPayoutTransferred.js";
import { updateMyPayoutIban } from "./updateMyPayoutIban.js";

export const payoutRouter = createRouter({
  getMyPayoutSettings,
  updateMyPayoutIban,
  listOrganizerPayouts,
  markOrganizerPayoutTransferred,
});

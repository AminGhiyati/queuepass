import { createRouter } from "../../trpc/procedures.js";
import { checkInTicket } from "./checkInTicket.js";
import { undoTicketCheckIn } from "./undoTicketCheckIn.js";

export const checkInRouter = createRouter({
  checkInTicket,
  undoTicketCheckIn,
});

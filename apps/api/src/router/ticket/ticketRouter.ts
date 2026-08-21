import { createRouter } from "../../trpc/procedures.js";
import { getMyTicket } from "./getMyTicket.js";
import { getWalletAvailability } from "./getWalletAvailability.js";
import { listEventTickets } from "./listEventTickets.js";
import { listMyTickets } from "./listMyTickets.js";

export const ticketRouter = createRouter({
  listMyTickets,
  getMyTicket,
  getWalletAvailability,
  listEventTickets,
});

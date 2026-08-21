import { randomBytes } from "node:crypto";

const TICKET_CODE_BYTES = 16;

export function createTicketCode() {
  return randomBytes(TICKET_CODE_BYTES).toString("base64url");
}

export const checkInOutcomes = [
  "CHECKED_IN",
  "ALREADY_CHECKED_IN",
  "UNKNOWN_CODE",
  "WRONG_EVENT",
  "CANCELLED",
  "EVENT_OVER",
] as const;

export type CheckInOutcome = (typeof checkInOutcomes)[number];

export type CheckInReport = {
  code: string;
  outcome: CheckInOutcome;
  checkedInAt: Date | null;
  buyerName: string | null;
};

type TicketUnderScan = {
  eventId: string;
  status: string;
  checkedInAt: Date | null;
} | null;

export function outcomeOfRejectedScan(ticket: TicketUnderScan, eventId: string): CheckInOutcome {
  if (!ticket) {
    return "UNKNOWN_CODE";
  }
  if (ticket.eventId !== eventId) {
    return "WRONG_EVENT";
  }
  if (ticket.status === "CANCELLED") {
    return "CANCELLED";
  }
  return "ALREADY_CHECKED_IN";
}

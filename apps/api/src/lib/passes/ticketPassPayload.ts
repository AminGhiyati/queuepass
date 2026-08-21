export type TicketPassPayload = {
  ticketId: string;
  eventId: string;
  code: string;
  eventTitle: string;
  eventLocation: string;
  startsAt: Date;
  endsAt: Date;
  organizerName: string;
  holderName: string;
};

export class PassNotConfiguredError extends Error {
  constructor(public readonly provider: string) {
    super(`${provider} passes are not configured`);
    this.name = "PassNotConfiguredError";
  }
}

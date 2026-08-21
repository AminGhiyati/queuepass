export const availableTicketPdfLocales = ["en", "de"] as const;

export type TicketPdfLocale = (typeof availableTicketPdfLocales)[number];

export type TicketPdfStrings = {
  dateTimeLocale: string;
  ticketCode: string;
  ticketFor: (holderName: string) => string;
};

const englishStrings: TicketPdfStrings = {
  dateTimeLocale: "en-GB",
  ticketCode: "Ticket code",
  ticketFor: (holderName) => `Ticket for ${holderName}`,
};

const germanStrings: TicketPdfStrings = {
  dateTimeLocale: "de-DE",
  ticketCode: "Ticketcode",
  ticketFor: (holderName) => `Ticket für ${holderName}`,
};

export function ticketPdfStringsFor(locale: TicketPdfLocale): TicketPdfStrings {
  return locale === "de" ? germanStrings : englishStrings;
}

// A ticket is worth printing even when the link carries a locale nobody translated, so an unknown
// value falls back instead of failing the download.
export function parseTicketPdfLocale(value: unknown): TicketPdfLocale {
  return availableTicketPdfLocales.includes(value as TicketPdfLocale)
    ? (value as TicketPdfLocale)
    : "en";
}

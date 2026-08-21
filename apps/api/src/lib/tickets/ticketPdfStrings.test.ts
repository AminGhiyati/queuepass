import { describe, expect, it } from "vitest";
import { parseTicketPdfLocale, ticketPdfStringsFor } from "./ticketPdfStrings.js";

describe("parseTicketPdfLocale", () => {
  it("keeps a locale the pdf is translated into", () => {
    expect(parseTicketPdfLocale("de")).toBe("de");
    expect(parseTicketPdfLocale("en")).toBe("en");
  });

  it("falls back to english for a locale nobody translated", () => {
    expect(parseTicketPdfLocale("fr")).toBe("en");
  });

  it("falls back to english when the link carries no locale at all", () => {
    expect(parseTicketPdfLocale(undefined)).toBe("en");
  });

  it("falls back to english when the query parameter arrives repeated", () => {
    expect(parseTicketPdfLocale(["de", "en"])).toBe("en");
  });
});

describe("ticketPdfStringsFor", () => {
  it("translates every label into german", () => {
    const strings = ticketPdfStringsFor("de");

    expect(strings.ticketCode).toBe("Ticketcode");
    expect(strings.ticketFor("Anna Becker")).toBe("Ticket für Anna Becker");
  });

  it("translates every label into english", () => {
    const strings = ticketPdfStringsFor("en");

    expect(strings.ticketCode).toBe("Ticket code");
    expect(strings.ticketFor("Anna Becker")).toBe("Ticket for Anna Becker");
  });
});

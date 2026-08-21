import { describe, expect, it } from "vitest";
import { renderTicketPdf } from "./ticketPdf.js";

const printableTicket = {
  code: "QiavGEQuqLB5tn7Vs8MUHg",
  eventTitle: "Harbour Open Air",
  eventLocation: "Hamburg",
  startsAt: new Date("2026-09-01T18:00:00.000Z"),
  organizerName: "Clara Vogt",
  holderName: "Anna Becker",
};

function textOf(pdf: Buffer) {
  return [...pdf.toString("latin1").matchAll(/<([0-9a-f]+)>/g)]
    .map((match) => Buffer.from(match[1] ?? "", "hex").toString("latin1"))
    .join("");
}

describe("renderTicketPdf", () => {
  it("produces a pdf file", async () => {
    const pdf = await renderTicketPdf(printableTicket, "en");

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("writes the ticket code as text, so it stays usable when scanning fails", async () => {
    const pdf = await renderTicketPdf(printableTicket, "en");

    expect(textOf(pdf)).toContain(printableTicket.code);
  });

  it("names the event, the place and the organizer", async () => {
    const text = textOf(await renderTicketPdf(printableTicket, "en"));

    expect(text).toContain("Harbour Open Air");
    expect(text).toContain("Hamburg");
    expect(text).toContain("Clara Vogt");
  });

  it("names who the ticket was bought for", async () => {
    const text = textOf(await renderTicketPdf(printableTicket, "en"));

    expect(text).toContain("Anna Becker");
  });

  it("embeds the qr code image", async () => {
    const pdf = await renderTicketPdf(printableTicket, "en");

    expect(pdf.toString("latin1")).toContain("/Image");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });

  it("prints its labels in english", async () => {
    const text = textOf(await renderTicketPdf(printableTicket, "en"));

    expect(text).toContain("Ticket code");
    expect(text).toContain("Ticket for Anna Becker");
  });

  it("prints its labels in german", async () => {
    const text = textOf(await renderTicketPdf(printableTicket, "de"));

    expect(text).toContain("Ticketcode");
    expect(text).toContain("Ticket für Anna Becker");
  });

  it("prints the start in the language of the ticket", async () => {
    const english = textOf(await renderTicketPdf(printableTicket, "en"));
    const german = textOf(await renderTicketPdf(printableTicket, "de"));

    expect(english).toContain("September");
    expect(german).toContain("September");
    expect(english).toContain("Tuesday");
    expect(german).toContain("Dienstag");
  });

  it("prints the local time at the venue, not the time zone of the reader", async () => {
    const text = textOf(await renderTicketPdf(printableTicket, "de"));

    expect(text).toContain("20:00");
  });
});

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  ticketPdfStringsFor,
  type TicketPdfLocale,
  type TicketPdfStrings,
} from "./ticketPdfStrings.js";

const QR_CODE_SIZE_IN_POINTS = 220;
const PAGE_MARGIN_IN_POINTS = 56;

const EVENT_TIME_ZONE = "Europe/Berlin";

export type PrintableTicket = {
  code: string;
  eventTitle: string;
  eventLocation: string;
  startsAt: Date;
  organizerName: string;
  holderName: string;
};

function formatDateTimeForPrint(value: Date, strings: TicketPdfStrings) {
  return new Intl.DateTimeFormat(strings.dateTimeLocale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(value);
}

export async function renderTicketPdf(
  ticket: PrintableTicket,
  locale: TicketPdfLocale,
) {
  const strings = ticketPdfStringsFor(locale);
  const qrCode = await QRCode.toBuffer(ticket.code, { margin: 1, width: 600 });
  const document = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN_IN_POINTS,
    compress: false,
  });
  const chunks: Buffer[] = [];

  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  document
    .fontSize(10)
    .fillColor("#666666")
    .text("QueuePass", { align: "right" });

  document.moveDown(2);
  document.fontSize(26).fillColor("#000000").text(ticket.eventTitle);

  document.moveDown(0.5);
  document
    .fontSize(12)
    .fillColor("#444444")
    .text(formatDateTimeForPrint(ticket.startsAt, strings));
  document.text(ticket.eventLocation);
  document.text(ticket.organizerName);

  document.moveDown(2);
  const qrCodeLeft = (document.page.width - QR_CODE_SIZE_IN_POINTS) / 2;
  document.image(qrCode, qrCodeLeft, document.y, {
    width: QR_CODE_SIZE_IN_POINTS,
    height: QR_CODE_SIZE_IN_POINTS,
  });

  document.y += QR_CODE_SIZE_IN_POINTS + 24;
  document
    .fontSize(10)
    .fillColor("#666666")
    .text(strings.ticketCode, { align: "center" });
  document
    .fontSize(14)
    .fillColor("#000000")
    .text(ticket.code, { align: "center" });

  document.moveDown(2);
  document
    .fontSize(10)
    .fillColor("#666666")
    .text(strings.ticketFor(ticket.holderName), { align: "center" });

  document.end();

  await new Promise((resolve) => document.on("end", resolve));

  return Buffer.concat(chunks);
}

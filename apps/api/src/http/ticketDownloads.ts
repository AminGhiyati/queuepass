import { Router, type IRouter } from "express";
import { renderApplePkpass } from "../lib/passes/applePkpass.js";
import { createGoogleWalletSaveUrl } from "../lib/passes/googleWallet.js";
import { PassNotConfiguredError } from "../lib/passes/ticketPassPayload.js";
import { prisma } from "../lib/prisma.js";
import { renderTicketPdf } from "../lib/tickets/ticketPdf.js";
import { parseTicketPdfLocale } from "../lib/tickets/ticketPdfStrings.js";
import { resolveCurrentUser } from "../trpc/context.js";

const ticketSelection = {
  id: true,
  code: true,
  event: {
    select: {
      id: true,
      title: true,
      location: true,
      startsAt: true,
      endsAt: true,
      organizer: { select: { name: true } },
    },
  },
  order: { select: { buyer: { select: { name: true } } } },
} as const;

async function findTicketOfCurrentUser(
  headers: Parameters<typeof resolveCurrentUser>[0],
  ticketId: string,
) {
  const currentUser = await resolveCurrentUser(headers);

  if (!currentUser) {
    return { status: 401 as const, ticket: null };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, order: { buyerId: currentUser.id, status: "PAID" } },
    select: ticketSelection,
  });

  return ticket
    ? { status: 200 as const, ticket }
    : { status: 404 as const, ticket: null };
}

type FoundTicket = NonNullable<
  Awaited<ReturnType<typeof findTicketOfCurrentUser>>["ticket"]
>;

function toPassPayload(ticket: FoundTicket) {
  return {
    ticketId: ticket.id,
    eventId: ticket.event.id,
    code: ticket.code,
    eventTitle: ticket.event.title,
    eventLocation: ticket.event.location,
    startsAt: ticket.event.startsAt,
    endsAt: ticket.event.endsAt,
    organizerName: ticket.event.organizer.name,
    holderName: ticket.order.buyer.name,
  };
}

export const ticketDownloads: IRouter = Router();

ticketDownloads.get("/tickets/:ticketId/pdf", async (request, response) => {
  const { status, ticket } = await findTicketOfCurrentUser(
    request.headers,
    request.params.ticketId,
  );

  if (!ticket) {
    response
      .status(status)
      .json({ error: status === 401 ? "UNAUTHORIZED" : "NOT_FOUND" });
    return;
  }

  const pdf = await renderTicketPdf(toPassPayload(ticket), parseTicketPdfLocale(request.query.locale));

  response
    .status(200)
    .setHeader("Content-Type", "application/pdf")
    .setHeader(
      "Content-Disposition",
      `attachment; filename="ticket-${ticket.id}.pdf"`,
    )
    .send(pdf);
});

ticketDownloads.get("/tickets/:ticketId/pkpass", async (request, response) => {
  const { status, ticket } = await findTicketOfCurrentUser(
    request.headers,
    request.params.ticketId,
  );

  if (!ticket) {
    response
      .status(status)
      .json({ error: status === 401 ? "UNAUTHORIZED" : "NOT_FOUND" });
    return;
  }

  try {
    const pass = await renderApplePkpass(toPassPayload(ticket));

    response
      .status(200)
      .setHeader("Content-Type", "application/vnd.apple.pkpass")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="ticket-${ticket.id}.pkpass"`,
      )
      .send(pass);
  } catch (failure) {
    if (failure instanceof PassNotConfiguredError) {
      response
        .status(503)
        .json({ error: "WALLET_NOT_CONFIGURED", provider: failure.provider });
      return;
    }
    throw failure;
  }
});

ticketDownloads.get(
  "/tickets/:ticketId/google-wallet",
  async (request, response) => {
    const { status, ticket } = await findTicketOfCurrentUser(
      request.headers,
      request.params.ticketId,
    );

    if (!ticket) {
      response
        .status(status)
        .json({ error: status === 401 ? "UNAUTHORIZED" : "NOT_FOUND" });
      return;
    }

    try {
      response.redirect(await createGoogleWalletSaveUrl(toPassPayload(ticket)));
    } catch (failure) {
      if (failure instanceof PassNotConfiguredError) {
        response
          .status(503)
          .json({ error: "WALLET_NOT_CONFIGURED", provider: failure.provider });
        return;
      }
      throw failure;
    }
  },
);

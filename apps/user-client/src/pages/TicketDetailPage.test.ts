import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n/i18n";
import TicketDetailPage from "@/pages/TicketDetailPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";
import { myTicket } from "@/testing/ticketFixtures";

const { getMyTicket, getWalletAvailability, renderQrCodeDataUrl } = vi.hoisted(() => ({
  getMyTicket: vi.fn(),
  getWalletAvailability: vi.fn(),
  renderQrCodeDataUrl: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    ticket: {
      getMyTicket: { query: getMyTicket },
      getWalletAvailability: { query: getWalletAvailability },
    },
  },
}));
vi.mock("@/lib/qrCode", () => ({ renderQrCodeDataUrl }));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { ticketId: "ticket-id" } }) }));

async function mountTicket(ticket = myTicket()) {
  getMyTicket.mockResolvedValue(ticket);

  const page = mountWithPlugins(TicketDetailPage);
  await flushPromises();
  await flushPromises();

  return page;
}

beforeEach(() => {
  vi.clearAllMocks();
  renderQrCodeDataUrl.mockResolvedValue("data:image/png;base64,qr");
  getWalletAvailability.mockResolvedValue({ applePass: false, googleWallet: false });
});

describe("TicketDetailPage", () => {
  it("asks for the ticket named in the route", async () => {
    await mountTicket();

    expect(getMyTicket).toHaveBeenCalledWith({ ticketId: "ticket-id" });
  });

  it("turns the ticket code into a qr code", async () => {
    const page = await mountTicket(myTicket({ code: "abc123" }));

    expect(renderQrCodeDataUrl).toHaveBeenCalledWith("abc123");
    expect(page.get('[data-testid="ticket-qr-code"]').attributes("src")).toBe(
      "data:image/png;base64,qr",
    );
  });

  it("shows the code as text as well, in case scanning fails", async () => {
    const page = await mountTicket(myTicket({ code: "abc123" }));

    expect(page.get('[data-testid="ticket-code"]').text()).toBe("abc123");
  });

  it("names the event the ticket belongs to", async () => {
    const page = await mountTicket();

    expect(page.get('[data-testid="ticket-event-title"]').text()).toBe("Harbour Open Air");
    expect(page.text()).toContain("Hamburg");
  });

  it("says the ticket was not scanned yet", async () => {
    const page = await mountTicket();

    expect(page.get('[data-testid="ticket-status"]').text()).toBe("Not scanned yet");
  });

  it("says when the ticket was scanned", async () => {
    const page = await mountTicket(
      myTicket({ isCheckedIn: true, checkedInAt: new Date(2026, 8, 1, 18, 30) }),
    );

    expect(page.get('[data-testid="ticket-status"]').text()).toContain("Sep 1, 2026");
  });

  it("warns when the event behind the ticket was cancelled", async () => {
    const page = await mountTicket(
      myTicket({ event: { ...myTicket().event, status: "CANCELLED" } }),
    );

    expect(page.get('[data-testid="ticket-event-cancelled"]').text()).toContain(
      "no longer valid",
    );
  });

  it("tells the buyer that the money is on its way back", async () => {
    const page = await mountTicket(
      myTicket({
        status: "CANCELLED",
        isValid: false,
        orderStatus: "REFUND_PENDING",
        event: { ...myTicket().event, status: "CANCELLED" },
      }),
    );

    expect(page.get('[data-testid="ticket-refund"]').text()).toContain("€25.00");
    expect(page.get('[data-testid="ticket-refund"]').text()).toContain("on the way back");
  });

  it("tells the buyer when the refund arrived", async () => {
    const page = await mountTicket(
      myTicket({
        status: "CANCELLED",
        isValid: false,
        orderStatus: "REFUNDED",
        refundedAt: new Date(2026, 7, 15, 10, 0),
        event: { ...myTicket().event, status: "CANCELLED" },
      }),
    );

    expect(page.get('[data-testid="ticket-refund"]').text()).toContain("Aug 15, 2026");
  });

  it("does not let a refunded ticket be scanned, printed or put into a wallet", async () => {
    const page = await mountTicket(
      myTicket({
        status: "CANCELLED",
        isValid: false,
        orderStatus: "REFUNDED",
        event: { ...myTicket().event, status: "CANCELLED" },
      }),
    );

    expect(page.find('[data-testid="ticket-qr-code"]').exists()).toBe(false);
    expect(page.find('[data-testid="ticket-pdf-link"]').exists()).toBe(false);
    expect(page.find('[data-testid="apple-wallet"]').exists()).toBe(false);
  });

  it("links to the pdf of exactly this ticket", async () => {
    const page = await mountTicket();

    expect(page.get('[data-testid="ticket-pdf-link"]').attributes("href")).toContain(
      "/tickets/ticket-id/pdf",
    );
  });

  it("asks for the pdf in the language the page is shown in", async () => {
    changeLocale("de");

    const page = await mountTicket();

    expect(page.get('[data-testid="ticket-pdf-link"]').attributes("href")).toContain(
      "/tickets/ticket-id/pdf?locale=de",
    );

    changeLocale("en");
  });

  it("shows the wallet buttons as not available while the keys are missing", async () => {
    const page = await mountTicket();

    expect(page.get('[data-testid="apple-wallet"]').attributes("disabled")).toBeDefined();
    expect(page.get('[data-testid="google-wallet"]').attributes("disabled")).toBeDefined();
    expect(page.text()).toContain("Greyed out wallets are not set up yet.");
  });

  it("links to the Apple Wallet pass once the pass certificates are configured", async () => {
    getWalletAvailability.mockResolvedValue({ applePass: true, googleWallet: false });

    const page = await mountTicket();

    expect(page.get('[data-testid="apple-wallet"]').attributes("href")).toContain(
      "/tickets/ticket-id/pkpass",
    );
    expect(page.get('[data-testid="google-wallet"]').attributes("disabled")).toBeDefined();
  });

  it("links to the Google Wallet save link once the issuer is configured", async () => {
    getWalletAvailability.mockResolvedValue({ applePass: false, googleWallet: true });

    const page = await mountTicket();

    expect(page.get('[data-testid="google-wallet"]').attributes("href")).toContain(
      "/tickets/ticket-id/google-wallet",
    );
  });

  it("drops the hint once both wallets are configured", async () => {
    getWalletAvailability.mockResolvedValue({ applePass: true, googleWallet: true });

    const page = await mountTicket();

    expect(page.text()).not.toContain("Greyed out wallets are not set up yet.");
  });

  it("reports a ticket that does not belong to this account", async () => {
    getMyTicket.mockRejectedValue(new Error("NOT_FOUND"));

    const page = mountWithPlugins(TicketDetailPage);
    await flushPromises();

    expect(page.text()).toContain("This ticket does not exist.");
    expect(page.find('[data-testid="ticket-qr-code"]').exists()).toBe(false);
  });
});

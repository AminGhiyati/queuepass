import { describe, expect, it } from "vitest";
import { createTicketCode } from "./ticketCode.js";

describe("createTicketCode", () => {
  it("is long enough that guessing it is hopeless", () => {
    expect(createTicketCode().length).toBeGreaterThanOrEqual(22);
  });

  it("uses only characters that survive a url and a qr code", () => {
    expect(createTicketCode()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats itself", () => {
    const codes = Array.from({ length: 1000 }, createTicketCode);

    expect(new Set(codes).size).toBe(1000);
  });
});

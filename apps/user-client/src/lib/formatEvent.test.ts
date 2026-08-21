import { describe, expect, it } from "vitest";
import { formatDateTime, formatPriceInCents, toDateTimeInputValue } from "./formatEvent";

describe("formatPriceInCents", () => {
  it("shows euros with cents", () => {
    expect(formatPriceInCents(2500, "en")).toContain("25.00");
    expect(formatPriceInCents(2550, "de")).toContain("25,50");
  });

  it("keeps a free event at zero instead of hiding it", () => {
    expect(formatPriceInCents(0, "en")).toContain("0.00");
  });
});

describe("formatDateTime", () => {
  it("writes the date in the order the locale expects", () => {
    const startsAt = new Date(2026, 8, 1, 18, 0);

    expect(formatDateTime(startsAt, "en")).toMatch(/Sep 1, 2026/);
    expect(formatDateTime(startsAt, "de")).toMatch(/01\.09\.2026/);
  });
});

describe("toDateTimeInputValue", () => {
  it("produces the shape a datetime-local input accepts", () => {
    expect(toDateTimeInputValue(new Date(2026, 8, 1, 18, 30))).toBe("2026-09-01T18:30");
  });

  it("keeps the local wall clock time instead of shifting to UTC", () => {
    const localNoon = new Date(2026, 0, 15, 12, 0);

    expect(toDateTimeInputValue(localNoon)).toBe("2026-01-15T12:00");
  });
});

import { describe, expect, it, vi } from "vitest";
import { platformFeeCentsOf, readPlatformFeePercent } from "./platformFee.js";

describe("readPlatformFeePercent", () => {
  it("reads the configured percentage", async () => {
    const findUnique = vi.fn().mockResolvedValue({ feePercent: 12 });

    await expect(readPlatformFeePercent({ platformSettings: { findUnique } } as never)).resolves.toBe(
      12,
    );
  });

  it("falls back to five percent when nothing is configured", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);

    await expect(readPlatformFeePercent({ platformSettings: { findUnique } } as never)).resolves.toBe(
      5,
    );
  });
});

describe("platformFeeCentsOf", () => {
  it("takes the percentage of the order total", () => {
    expect(platformFeeCentsOf(10_000, 5)).toBe(500);
  });

  it("rounds to whole cents instead of fractions", () => {
    expect(platformFeeCentsOf(999, 5)).toBe(50);
  });

  it("charges nothing on a free order", () => {
    expect(platformFeeCentsOf(0, 5)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { MINIMUM_CHARGEABLE_CENTS, isSellablePrice } from "./sellablePrice.js";

describe("isSellablePrice", () => {
  it("accepts a free ticket", () => {
    expect(isSellablePrice(0)).toBe(true);
  });

  it("accepts the smallest amount a provider can charge", () => {
    expect(isSellablePrice(MINIMUM_CHARGEABLE_CENTS)).toBe(true);
  });

  it("rejects a price that costs money but stays under the minimum", () => {
    expect(isSellablePrice(1)).toBe(false);
    expect(isSellablePrice(MINIMUM_CHARGEABLE_CENTS - 1)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { isValidIban, normalizeIban } from "./iban.js";

describe("normalizeIban", () => {
  it("drops the grouping a bank statement prints", () => {
    expect(normalizeIban("DE44 5001 0517 5407 3249 31")).toBe("DE44500105175407324931");
  });

  it("uppercases the country code", () => {
    expect(normalizeIban("de44500105175407324931")).toBe("DE44500105175407324931");
  });
});

describe("isValidIban", () => {
  it("accepts a German IBAN with its check digits", () => {
    expect(isValidIban("DE44500105175407324931")).toBe(true);
  });

  it("accepts an IBAN written with spaces", () => {
    expect(isValidIban("DE44 5001 0517 5407 3249 31")).toBe(true);
  });

  it("accepts an IBAN from another country", () => {
    expect(isValidIban("GB33BUKB20201555555555")).toBe(true);
  });

  it("rejects an IBAN with a mistyped digit", () => {
    expect(isValidIban("DE44500105175407324932")).toBe(false);
  });

  it("rejects a plain account number", () => {
    expect(isValidIban("5407324931")).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(isValidIban("")).toBe(false);
  });
});

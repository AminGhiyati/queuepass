import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";

function collectKeys(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? collectKeys(value, path) : [path];
  });
}

describe("locales", () => {
  it("translate the same keys in German and English", () => {
    expect(collectKeys(de).sort()).toEqual(collectKeys(en).sort());
  });

  it("have no empty translations", () => {
    const emptyGermanValues = collectKeys(de).filter((key) => key.trim().length === 0);

    expect(emptyGermanValues).toEqual([]);
  });

  it("are actually translated instead of copied from English", () => {
    expect(de.login.title).not.toBe(en.login.title);
    expect(de.landing.headline).not.toBe(en.landing.headline);
    expect(de.register.roleOrganizer).not.toBe(en.register.roleOrganizer);
  });
});

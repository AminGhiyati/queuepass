import { afterEach, describe, expect, it } from "vitest";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import { changeLocale, i18n } from "@/i18n/i18n";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

afterEach(() => changeLocale("en"));

describe("LanguageSwitcher", () => {
  it("offers German and English", () => {
    const switcher = mountWithPlugins(LanguageSwitcher);

    expect(switcher.text()).toContain("EN");
    expect(switcher.text()).toContain("DE");
  });

  it("switches the active locale", async () => {
    const switcher = mountWithPlugins(LanguageSwitcher);

    await switcher.findAll("button")[1]?.trigger("click");

    expect(i18n.global.locale.value).toBe("de");
  });

  it("remembers the chosen locale across visits", async () => {
    const switcher = mountWithPlugins(LanguageSwitcher);

    await switcher.findAll("button")[1]?.trigger("click");

    expect(window.localStorage.getItem("locale")).toBe("de");
  });
});

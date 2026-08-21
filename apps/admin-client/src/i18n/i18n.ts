import { createI18n } from "vue-i18n";
import { de } from "./locales/de";
import { en } from "./locales/en";

export const availableLocales = ["en", "de"] as const;
export type AvailableLocale = (typeof availableLocales)[number];

const LOCALE_STORAGE_KEY = "locale";

function isAvailableLocale(value: string | null): value is AvailableLocale {
  return availableLocales.includes(value as AvailableLocale);
}

function readStoredLocale() {
  // Browsers with blocked storage throw on access instead of returning null.
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLocale(locale: AvailableLocale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage is blocked, so the locale only lasts for this session.
  }
}

function detectInitialLocale(): AvailableLocale {
  const storedLocale = readStoredLocale();
  if (isAvailableLocale(storedLocale)) {
    return storedLocale;
  }
  return window.navigator.language.startsWith("de") ? "de" : "en";
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: "en" satisfies AvailableLocale,
  messages: { en, de },
});

export function changeLocale(locale: AvailableLocale) {
  i18n.global.locale.value = locale;
  storeLocale(locale);
  document.documentElement.lang = locale;
}

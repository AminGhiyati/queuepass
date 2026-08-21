const PLATFORM_CURRENCY = "EUR";

export function formatPriceInCents(priceCents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: PLATFORM_CURRENCY }).format(
    priceCents / 100,
  );
}

export function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value);
}

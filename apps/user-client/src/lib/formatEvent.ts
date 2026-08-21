const EVENT_CURRENCY = "EUR";

export function formatPriceInCents(priceCents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: EVENT_CURRENCY }).format(
    priceCents / 100,
  );
}

export function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export function toDateTimeInputValue(value: Date) {
  const localTime = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);

  return localTime.toISOString().slice(0, 16);
}

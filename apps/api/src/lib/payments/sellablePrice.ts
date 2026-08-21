export const MINIMUM_CHARGEABLE_CENTS = 50;

export function isSellablePrice(priceCents: number) {
  return priceCents === 0 || priceCents >= MINIMUM_CHARGEABLE_CENTS;
}

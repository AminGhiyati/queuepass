const IBAN_SHAPE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;
const LETTER = /[A-Z]/;
const VALID_CHECK_REMAINDER = 1;

export function normalizeIban(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIban(value: string) {
  const iban = normalizeIban(value);

  return (
    IBAN_SHAPE.test(iban) && checkRemainderOf(iban) === VALID_CHECK_REMAINDER
  );
}

function checkRemainderOf(iban: string) {
  const digits = [...iban.slice(4), ...iban.slice(0, 4)]
    .map((character) =>
      LETTER.test(character) ? String(character.charCodeAt(0) - 55) : character,
    )
    .join("");

  return [...digits].reduce(
    (remainder, digit) => (remainder * 10 + Number(digit)) % 97,
    0,
  );
}

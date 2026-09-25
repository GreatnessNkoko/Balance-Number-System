const NAME_PATTERN = /^[\p{L}\p{M}\p{N}.'’\-\s]+$/u;

export function cleanName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function normalizeName(value: string): string {
  return cleanName(value).toLocaleLowerCase();
}

export function isValidName(value: string): boolean {
  const cleaned = cleanName(value);
  return (
    cleaned.length > 0 &&
    cleaned.length <= 100 &&
    NAME_PATTERN.test(cleaned) &&
    /\p{L}/u.test(cleaned)
  );
}

/**
 * Parses a string into an integer, throwing if the value is not a valid integer.
 * @param value - The string to parse.
 * @returns The parsed integer.
 * @throws Error if the value is empty, non-numeric, or not a whole number.
 */
export function parseNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Invalid number: ${value}`);
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

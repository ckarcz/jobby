/**
 * Parses a string into a non-negative integer, throwing if the value is not valid.
 * @param value - The string to parse.
 * @returns The parsed non-negative integer.
 * @throws Error if the value is empty, non-numeric, not a whole number, or negative.
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
  if (parsed < 0) {
    throw new Error(`Invalid number (must be non-negative): ${value}`);
  }
  return parsed;
}

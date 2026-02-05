/**
 * Parses a string into an integer, throwing if the value is not a valid number.
 * @param value - The string to parse.
 * @returns The parsed integer.
 * @throws Error if the value cannot be parsed as a number.
 */
export function parseNumber(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

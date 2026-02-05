/**
 * Creates a promise that resolves after the specified delay.
 * @param ms - The delay duration in milliseconds.
 * @returns A promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(function delayResolver(resolve) {
    setTimeout(resolve, ms);
  });
}

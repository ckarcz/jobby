/**
 * Merges a partial config over a complete defaults object.
 * Only explicitly-provided values (not `undefined`) override defaults.
 *
 * When `defaults` is typed with `as const`, pass the wider type explicitly:
 * `resolveWithDefaults<RetryConfig>(partial, DEFAULT_RETRY_CONFIG)`
 */
export function resolveWithDefaults<T extends object>(
  partial: Partial<T> | undefined,
  defaults: T,
): T {
  if (!partial) {
    return { ...defaults };
  }
  const result = { ...defaults };
  for (const key of Object.keys(partial) as (keyof T)[]) {
    if (partial[key] !== undefined) {
      (result as Record<string, unknown>)[key as string] = partial[key];
    }
  }
  return result;
}

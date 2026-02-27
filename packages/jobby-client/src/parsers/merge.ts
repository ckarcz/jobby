import type { ParsedJobDetailsData } from './types.js';

/**
 * Merges two parsed detail records, preferring the primary source for each field.
 * Adding a new field to {@link ParsedJobDetailsData} automatically gets merged
 * here — no manual `primary.x ?? fallback.x` line required.
 *
 * Only `undefined` and `null` values fall through to the fallback.
 * Both mean "not present in this source" and will not overwrite
 * a non-nullish fallback value.
 */
export function mergeJobDetailsData(primary: ParsedJobDetailsData, fallback: ParsedJobDetailsData): ParsedJobDetailsData {
  const merged = { ...fallback };
  for (const key of Object.keys(primary) as (keyof ParsedJobDetailsData)[]) {
    const value = primary[key];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data may contain null despite types
    if (value !== undefined && value !== null) {
      (merged as Record<keyof ParsedJobDetailsData, string | undefined>)[key] = value;
    }
  }
  return merged;
}

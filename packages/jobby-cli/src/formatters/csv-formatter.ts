import { stringify } from 'csv-stringify/sync';
import type { OutputFormatter, OutputFormatterOptions } from './formatter.js';

/**
 * Recursively flattens a nested object into a single-level record with dot-separated keys.
 * Arrays are JSON-stringified, Dates are converted to ISO strings, and nullish values become empty strings.
 * @param obj - The object to flatten.
 * @param prefix - Optional key prefix for nested properties.
 * @returns A flat record mapping dot-separated keys to string values.
 */
function flattenObject(obj: Record<string, unknown>, prefix?: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      result[fullKey] = '';
    } else if (value instanceof Date) {
      result[fullKey] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value as string | number | boolean);
    }
  }
  return result;
}

/** Converts an array of flat objects to CSV format with auto-detected headers. */
function objectsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }

  const flatRows = rows.map(row => flattenObject(row));
  const allKeys = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }
  const columns = [...allKeys];

  return stringify(flatRows, { header: true, columns }).trimEnd();
}

/** Formats arbitrary data as CSV, extracting `results` arrays from search responses. */
function formatCsv(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'object' && !Array.isArray(data) && 'results' in (data as Record<string, unknown>)) {
    const results = (data as Record<string, unknown>)['results'];
    if (Array.isArray(results)) {
      return objectsToCsv(results as Record<string, unknown>[]);
    }
  }

  if (Array.isArray(data)) {
    return objectsToCsv(data as Record<string, unknown>[]);
  }

  if (typeof data === 'object') {
    return objectsToCsv([data as Record<string, unknown>]);
  }

  return String(data as string | number | boolean);
}

/** Formatter that serializes data as CSV with auto-detected columns. */
export const csvFormatter: OutputFormatter = {
  format(data: unknown, _opts: OutputFormatterOptions): Promise<string> {
    return Promise.resolve(formatCsv(data));
  },
};

import { XMLBuilder } from 'fast-xml-parser';
import type { OutputFormatter, OutputFormatterOptions } from './formatter.js';

/**
 * Recursively wraps bare arrays in an `{ item: [...] }` wrapper so they
 * serialize as named XML elements instead of anonymous entries.
 * @param data - The data structure to transform.
 * @returns The transformed data with arrays wrapped.
 */
function wrapArrays(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return { item: data.map(item => wrapArrays(item)) };
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = wrapArrays(value);
    }
    return result;
  }

  return data;
}

/** Formatter that serializes data as XML with an XML declaration header. */
export const xmlFormatter: OutputFormatter = {
  format(data: unknown, opts: OutputFormatterOptions): Promise<string> {
    const pretty = opts.pretty ?? false;
    const builder = new XMLBuilder({
      format: pretty,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
    const wrapped = wrapArrays(data);
    const xml: string = builder.build({ root: wrapped });
    const header = '<?xml version="1.0" encoding="UTF-8"?>';
    return Promise.resolve(pretty
      ? `${header}\n${xml}`.trimEnd()
      : `${header}${xml}`);
  },
};

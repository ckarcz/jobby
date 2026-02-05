import type { OutputFormatter, OutputFormatterOptions } from './formatter.js';

/** Formatter that serializes data as JSON, with optional pretty printing. */
export const jsonFormatter: OutputFormatter = {
  format(data: unknown, opts: OutputFormatterOptions): Promise<string> {
    return Promise.resolve(opts.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
  },
};

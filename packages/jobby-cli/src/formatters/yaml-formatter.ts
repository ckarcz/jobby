import { stringify } from 'yaml';
import type { OutputFormatter, OutputFormatterOptions } from './formatter.js';

/** Formatter that serializes data as YAML. The `pretty` option is intentionally unused — YAML is inherently readable. */
export const yamlFormatter: OutputFormatter = {
  format(data: unknown, _opts: OutputFormatterOptions): Promise<string> {
    return Promise.resolve(stringify(data).trimEnd());
  },
};

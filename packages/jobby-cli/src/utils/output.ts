import { writeFileSync } from 'node:fs';
import { highlight } from 'cli-highlight';
import type { OutputFormat } from '../types.js';
import { getFormatter } from '../formatters/index.js';

/** The subset of CLI args consumed by {@link outputResult}. */
export interface OutputOptions {
  format?: OutputFormat | undefined;
  pretty?: boolean | undefined;
  file?: string | undefined;
  noColor?: boolean | undefined;
}

const highlightLanguageMap: Partial<Record<OutputFormat, string>> = {
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  rawHtml: 'html',
};

/**
 * Outputs data to stdout or a file in the specified output format.
 *
 * Color handling for TTY detection, NO_COLOR, and FORCE_COLOR env vars is
 * delegated to chalk (via cli-highlight) at import time.
 * The --no-color flag bypasses highlight() entirely since chalk caches
 * color support at import time and cannot be changed after.
 *
 * @param data - The data to format and output.
 * @param opts - CLI arguments controlling format, file output, color, and pretty printing.
 * @returns Resolves when the output has been written.
 */
export async function outputResult(data: unknown, opts: OutputOptions): Promise<void> {
  const format = opts.format ?? 'json';
  const formatter = getFormatter(format);
  const output = await formatter.format(data, { pretty: opts.pretty });

  if (opts.file) {
    writeFileSync(opts.file, output + '\n', 'utf-8');
    console.info(`Output written to ${opts.file}.`);
    return;
  }

  const language = highlightLanguageMap[format];
  if (opts.noColor || !language) {
    console.log(output);
  } else {
    console.log(highlight(output, { language }));
  }
}

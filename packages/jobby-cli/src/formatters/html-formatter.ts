import jsBeautify from 'js-beautify';
import { minify } from 'html-minifier-terser';
import type { OutputFormatter, OutputFormatterOptions } from './formatter.js';

/** Formatter that outputs raw HTML, minified by default or beautified when pretty-printing. */
export const htmlFormatter: OutputFormatter = {
  async format(data: unknown, opts: OutputFormatterOptions): Promise<string> {
    const raw = typeof data === 'string' ? data : String(data);

    if (opts.pretty) {
      const stripped = await minify(raw, { removeComments: true });
      return jsBeautify.html(stripped, {
        indent_size: 2,
        preserve_newlines: false,
      });
    }

    return minify(raw, {
      collapseWhitespace: true,
      removeComments: true,
      removeEmptyAttributes: true,
    });
  },
};

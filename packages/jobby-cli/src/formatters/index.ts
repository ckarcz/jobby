export type { OutputFormatter, OutputFormatterOptions } from './formatter.js';
export { registerFormatter, getFormatter } from './formatter.js';
export { jsonFormatter } from './json-formatter.js';
export { xmlFormatter } from './xml-formatter.js';
export { yamlFormatter } from './yaml-formatter.js';
export { csvFormatter } from './csv-formatter.js';
export { htmlFormatter } from './html-formatter.js';

import { registerFormatter } from './formatter.js';
import { jsonFormatter } from './json-formatter.js';
import { xmlFormatter } from './xml-formatter.js';
import { yamlFormatter } from './yaml-formatter.js';
import { csvFormatter } from './csv-formatter.js';
import { htmlFormatter } from './html-formatter.js';

/**
 * Registers all built-in output formatters (JSON, XML, YAML, CSV, HTML).
 * Must be called once at startup before any formatter lookups.
 */
export function registerDefaultFormatters(): void {
  registerFormatter('json', jsonFormatter);
  registerFormatter('xml', xmlFormatter);
  registerFormatter('yaml', yamlFormatter);
  registerFormatter('csv', csvFormatter);
  registerFormatter('rawHtml', htmlFormatter);
}

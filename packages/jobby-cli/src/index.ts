/**
 * @module jobby-cli
 *
 * CLI for searching LinkedIn job listings.
 * Provides commands and formatters for job search and details.
 */

export type { JobbyCliArgs, JobSearchQueryCliArgs, JobDetailsQueryCliArgs, OutputFormat } from './types.js';
export type { OutputFormatter, OutputFormatterOptions } from './formatters/index.js';

export { registerFormatter, getFormatter, registerDefaultFormatters, jsonFormatter, xmlFormatter, yamlFormatter, csvFormatter, htmlFormatter } from './formatters/index.js';
export { logLevelChoices, formatChoices } from './constants.js';
export { outputResult } from './utils/output.js';
export type { OutputOptions } from './utils/output.js';
export { readFromStream } from './utils/stream.js';
export { parseNumber } from './utils/parse.js';
export { formatErrorMessage } from './utils/errors.js';
export { queryForJobs, createSearchCommand } from './commands/search.js';
export { queryForJobDetails, createDetailsCommand } from './commands/details.js';
export { createUiCommand } from './commands/ui.js';
export { createProgram, helpConfig } from './program.js';
export type { ActiveCliArgsRef } from './types.js';
export { main } from './main.js';

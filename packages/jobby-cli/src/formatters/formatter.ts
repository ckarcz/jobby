import type { OutputFormat } from '../types.js';

/** Options passed to an output formatter to control rendering behavior. */
export interface OutputFormatterOptions {
  /** Whether to pretty-print the output with indentation and whitespace. */
  pretty?: boolean | undefined;
}

/** A formatter that serializes data into a specific output format string. */
export interface OutputFormatter {
  /**
   * Formats the given data into a string representation.
   * @param data - The data to format.
   * @param opts - Formatting options such as pretty printing.
   * @returns The formatted string.
   */
  format(data: unknown, opts: OutputFormatterOptions): Promise<string>;
}

/** A registry that maps output format keys to formatter implementations. */
export interface FormatterRegistry {
  /** Registers an output formatter for the given format type. */
  register(format: OutputFormat, formatter: OutputFormatter): void;
  /** Retrieves the registered output formatter for the given format type. */
  get(format: OutputFormat): OutputFormatter;
}

/** Creates a new, independent formatter registry instance. */
export function createFormatterRegistry(): FormatterRegistry {
  const formatters = new Map<OutputFormat, OutputFormatter>();
  return {
    register(format: OutputFormat, formatter: OutputFormatter): void {
      formatters.set(format, formatter);
    },
    get(format: OutputFormat): OutputFormatter {
      const formatter = formatters.get(format);
      if (!formatter) {
        throw new Error(`Unknown output format: ${format}`);
      }
      return formatter;
    },
  };
}

/** Default shared registry used by the CLI. */
const defaultRegistry = createFormatterRegistry();

/**
 * Registers an output formatter for the given format type on the default registry.
 * @param format - The output format key to associate with the formatter.
 * @param formatter - The formatter implementation to register.
 */
export function registerFormatter(format: OutputFormat, formatter: OutputFormatter): void {
  defaultRegistry.register(format, formatter);
}

/**
 * Retrieves the registered output formatter for the given format type from the default registry.
 * @param format - The output format key to look up.
 * @returns The registered formatter for the specified format.
 * @throws Error if no formatter is registered for the given format.
 */
export function getFormatter(format: OutputFormat): OutputFormatter {
  return defaultRegistry.get(format);
}

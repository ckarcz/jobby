import type {
  JobbyError} from 'jobby-client';
import {
  RateLimitError,
  NetworkError,
  ParsingError,
  ValidationError,
} from 'jobby-client';

/**
 * Formats an error message with an actionable hint based on the error type.
 * @param error - The Jobby client error to format.
 * @returns A user-friendly error string with a contextual hint appended when applicable.
 */
export function formatErrorMessage(error: JobbyError): string {
  const base = `Error [${error.code}]: ${error.message}`;

  if (error instanceof RateLimitError) {
    const hint = error.retryAfter
      ? `Try again in ${error.retryAfter} seconds`
      : 'Try again later';
    return `${base}\nHint: ${hint}`;
  }
  if (error instanceof NetworkError) {
    return `${base}\nHint: Check your internet connection`;
  }
  if (error instanceof ValidationError) {
    return `${base}\nHint: Check your arguments. Run with --help for usage information`;
  }
  if (error instanceof ParsingError) {
    return `${base}\nHint: LinkedIn may have changed their page structure. Check for package updates`;
  }

  return base;
}

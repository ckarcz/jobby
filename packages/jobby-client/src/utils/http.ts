import axios, { type AxiosError } from 'axios';
import randomUseragent from 'random-useragent';
import type { Logger } from '../logging.js';
import { RateLimitError, NetworkError } from '../types/errors.js';

/**
 * Type guard to check if an error is an AxiosError.
 *
 * @param error - The unknown error to check
 * @returns `true` if the error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Handles HTTP errors from Axios requests by converting them into typed
 * application errors ({@link RateLimitError} or {@link NetworkError}).
 *
 * @param error - The unknown error caught during an HTTP request
 * @param logger - Logger instance for recording error context
 * @throws {RateLimitError} When the server responds with HTTP 429
 * @throws {NetworkError} For all other HTTP or network failures
 */
export function handleHttpError(error: unknown, logger: Logger): never {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      const retryAfterHeader = error.response.headers['retry-after'] as string | undefined;
      const retryAfter = typeof retryAfterHeader === 'string' ? Number(retryAfterHeader) : undefined;
      logger.warn('Rate limit reached.', { retryAfter });
      throw new RateLimitError('Rate limit reached', Number.isNaN(retryAfter) ? undefined : retryAfter);
    }
    logger.error(`HTTP error: ${error.response?.status ?? '???'}.`, { message: error.message });
    throw new NetworkError(`HTTP-${error.response?.status ?? '???'}: ${error.message}`, error, error.response?.status);
  }
  logger.error('Unknown error occurred.');
  throw new NetworkError('Unknown error occurred', error);
}

/**
 * Gets a random User-Agent string for HTTP requests.
 *
 * @returns A random browser User-Agent string, or a fallback if none is available
 */
export function getRandomUserAgent(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return randomUseragent.getRandom() ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
}

/**
 * Resolves a User-Agent value from a string, factory function, or generates a random one.
 *
 * @param userAgent - Optional static string or factory function
 * @returns The resolved User-Agent string
 */
export function resolveUserAgent(userAgent?: string | (() => string)): string {
  return typeof userAgent === 'function' ? userAgent() : (userAgent ?? getRandomUserAgent());
}

/**
 * Creates HTTP headers for LinkedIn job search API requests.
 *
 * @param userAgent - Resolved User-Agent string
 * @returns Headers object suitable for job search API requests
 */
export function createRequestHeaders(userAgent: string): Record<string, string> {
  return {
    'User-Agent': userAgent,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.linkedin.com/jobs',
    'X-Requested-With': 'XMLHttpRequest',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
}

/**
 * Creates HTTP headers for fetching LinkedIn job details pages.
 *
 * @param userAgent - Resolved User-Agent string
 * @returns Headers object suitable for job details page requests
 */
export function createDetailsRequestHeaders(userAgent: string): Record<string, string> {
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
  };
}

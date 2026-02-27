import { JobbyError, RateLimitError } from '../types/errors.js';
import { delay } from './delay.js';
import { resolveWithDefaults } from './config.js';

/** Configuration for retry behavior. */
export interface RetryConfig {
  /** Maximum number of retry attempts. @default 0 (no retries) */
  maxRetries: number;
  /** Initial backoff delay in milliseconds. Doubles on each retry. @default 1000 */
  initialDelayMs: number;
  /** Maximum backoff delay in milliseconds. @default 30000 */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 0,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
} as const satisfies RetryConfig;

/** Resolves retry config with defaults. */
export function resolveRetryConfig(config?: Partial<RetryConfig>): RetryConfig {
  return resolveWithDefaults<RetryConfig>(config, DEFAULT_RETRY_CONFIG);
}

/**
 * Executes an async function with retry logic for retryable errors.
 * Uses exponential backoff and respects RateLimitError.retryAfter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const isLastAttempt = attempt >= config.maxRetries;
      const isRetryable = error instanceof JobbyError && error.retryable;

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      let delayMs: number;
      if (error instanceof RateLimitError && error.retryAfter !== undefined) {
        delayMs = error.retryAfter * 1000;
      } else {
        delayMs = Math.min(config.initialDelayMs * 2 ** attempt, config.maxDelayMs);
      }

      await delay(delayMs);
    }
  }

  throw lastError;
}

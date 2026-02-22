import { type LoggingConfig, type Logger, createLogger } from './logging.js';
import { resolveUserAgent } from './utils/http.js';
import { type RetryConfig, type RetryConfigInput, resolveRetryConfig } from './utils/retry.js';

/** Configuration options for the LinkedIn Jobs client. */
export interface ClientConfig {
  /**
   * Base URL for LinkedIn API requests.
   * @default 'www.linkedin.com'
   */
  baseUrl?: string | undefined;

  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeout?: number | undefined;

  /**
   * Custom User-Agent string or function that returns one.
   * If not provided, a random User-Agent will be used for each request.
   */
  userAgent?: string | (() => string) | undefined;

  /**
   * AbortSignal for cancelling operations.
   */
  signal?: AbortSignal | undefined;

  /**
   * Logging configuration.
   * @default { level: 'error' }
   */
  logging?: LoggingConfig | undefined;

  /**
   * Retry configuration for retryable errors (network failures, rate limits).
   * @default { maxRetries: 0 } (no retries)
   */
  retry?: RetryConfigInput | undefined;
}

/** Resolved configuration with all required values defined. */
export interface ResolvedClientConfig {
  baseUrl: string;
  timeout: number;
  /** Always a resolved string — factory functions are evaluated in {@link resolveConfig}. */
  userAgent: string;
  signal: AbortSignal | undefined;
  logger: Logger;
  retry: RetryConfig;
}

/** Default configuration values. */
export const DEFAULT_CLIENT_CONFIG = {
  baseUrl: 'www.linkedin.com',
  timeout: 10_000,
} as const satisfies Partial<ClientConfig>;

/**
 * Resolves configuration with defaults.
 * Precedence: explicit config > environment variable > default value.
 *
 * Supported environment variables:
 * - `LINKEDIN_JOBS_BASE_URL` – overrides the default base URL
 * - `LINKEDIN_JOBS_TIMEOUT` – overrides the default timeout (in milliseconds)
 */
export function resolveConfig(config?: ClientConfig): ResolvedClientConfig {
  const envTimeout = process.env['LINKEDIN_JOBS_TIMEOUT'];
  const envBaseUrl = process.env['LINKEDIN_JOBS_BASE_URL'];

  const parsedEnvTimeout = envTimeout ? Number(envTimeout) : undefined;
  const resolvedEnvTimeout = parsedEnvTimeout !== undefined && Number.isFinite(parsedEnvTimeout)
    ? parsedEnvTimeout
    : undefined;

  const timeout = config?.timeout ?? resolvedEnvTimeout ?? DEFAULT_CLIENT_CONFIG.timeout;

  return {
    baseUrl: config?.baseUrl ?? envBaseUrl ?? DEFAULT_CLIENT_CONFIG.baseUrl,
    timeout,
    userAgent: resolveUserAgent(config?.userAgent),
    signal: config?.signal,
    logger: createLogger(config?.logging),
    retry: resolveRetryConfig(config?.retry),
  };
}

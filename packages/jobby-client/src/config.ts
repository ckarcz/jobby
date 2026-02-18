import { type LoggingConfig, type Logger, createLogger } from './logging.js';

/** Request delay configuration. */
export interface RequestDelay {
  /**
   * Base delay in milliseconds between requests.
   * @default 2000
   */
  baseMs?: number | undefined;

  /**
   * Random jitter in milliseconds to add to base delay.
   * @default 1000
   */
  jitterMs?: number | undefined;
}

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
   * Request delay configuration.
   */
  requestDelay?: RequestDelay | undefined;

  /**
   * AbortSignal for cancelling operations.
   */
  signal?: AbortSignal | undefined;

  /**
   * Logging configuration.
   * @default { level: 'error' }
   */
  logging?: LoggingConfig | undefined;
}

/** Resolved request delay with all values defined. */
export interface ResolvedRequestDelay {
  baseMs: number;
  jitterMs: number;
}

/** Resolved configuration with all required values defined. */
export interface ResolvedClientConfig {
  baseUrl: string;
  timeout: number;
  userAgent: string | (() => string) | undefined;
  requestDelay: ResolvedRequestDelay;
  signal: AbortSignal | undefined;
  logger: Logger;
}

/** Default configuration values. */
export const DEFAULT_CLIENT_CONFIG = {
  baseUrl: 'www.linkedin.com',
  timeout: 10_000,
  requestDelay: {
    baseMs: 2_000,
    jitterMs: 1_000,
  },
} as const;

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

  return {
    baseUrl: config?.baseUrl ?? envBaseUrl ?? DEFAULT_CLIENT_CONFIG.baseUrl,
    timeout: config?.timeout ?? resolvedEnvTimeout ?? DEFAULT_CLIENT_CONFIG.timeout,
    userAgent: config?.userAgent,
    requestDelay: {
      baseMs: config?.requestDelay?.baseMs ?? DEFAULT_CLIENT_CONFIG.requestDelay.baseMs,
      jitterMs: config?.requestDelay?.jitterMs ?? DEFAULT_CLIENT_CONFIG.requestDelay.jitterMs,
    },
    signal: config?.signal,
    logger: createLogger(config?.logging),
  };
}

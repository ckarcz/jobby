/** Error type identifiers for programmatic error handling. */
export const ErrorType = {
  RateLimit: 'RateLimit',
  Network: 'Network',
  Parse: 'Parse',
  Validation: 'Validation',
} as const;

/** Union type of all error type identifiers. */
export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

/** An application error. Base type used by all application errors. */
export class JobbyError extends Error {
  public readonly code: ErrorType;
  public readonly isOperational: boolean;
  public readonly originalError: unknown;
  public readonly retryable: boolean;

  constructor(
    code: ErrorType,
    message: string,
    options: {
      originalError?: unknown;
      isOperational?: boolean;
      retryable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'JobbyError';
    this.code = code;
    this.isOperational = options.isOperational ?? true;
    this.originalError = options.originalError;
    this.retryable = options.retryable ?? false;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a JobbyError from an unknown error.
   */
  static from(error: unknown): JobbyError {
    if (error instanceof JobbyError) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new JobbyError(ErrorType.Network, message, {
      originalError: error,
      isOperational: false,
      retryable: false,
    });
  }
}

/** A rate limit error. Thrown when an HTTP 429 occurs. */
export class RateLimitError extends JobbyError {
  public readonly retryAfter: number | undefined;

  constructor(message = 'Rate limit reached', retryAfter?: number, originalError?: unknown) {
    super(ErrorType.RateLimit, message, {
      originalError,
      retryable: true,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** A network error. Thrown when an HTTP error aside from HTTP 429 occurs. */
export class NetworkError extends JobbyError {
  constructor(message: string, originalError?: unknown, status?: number) {
    super(ErrorType.Network, message, {
      originalError,
      retryable: status === undefined || status >= 500,
    });
    this.name = 'NetworkError';
  }
}

/** A parsing error. Thrown when an error occurs while parsing job query result data. */
export class ParsingError extends JobbyError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.Parse, message, {
      originalError,
      retryable: false,
    });
    this.name = 'ParsingError';
  }
}

/** A validation error. Thrown when a validation error occurs when validating job query options or config values. */
export class ValidationError extends JobbyError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorType.Validation, message, {
      originalError,
      retryable: false,
    });
    this.name = 'ValidationError';
  }
}

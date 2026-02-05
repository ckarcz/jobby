/** Error codes for programmatic error handling. */
export enum ErrorCode {
  RATE_LIMIT = 'E_RATE_LIMIT',
  NETWORK = 'E_NETWORK',
  PARSE = 'E_PARSE',
  VALIDATION = 'E_VALIDATION',
}

/** An application error. Base type used by all application errors. */
export class JobbyError extends Error {
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly originalError: unknown;
  public readonly retryable: boolean;

  constructor(
    code: ErrorCode,
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
    if (error instanceof Error) {
      return new NetworkError(error.message, error);
    }
    return new NetworkError(String(error));
  }
}

/** A rate limit error. Thrown when an HTTP 429 occurs. */
export class RateLimitError extends JobbyError {
  public readonly retryAfter: number | undefined;

  constructor(message = 'Rate limit reached', retryAfter?: number, originalError?: unknown) {
    super(ErrorCode.RATE_LIMIT, message, {
      originalError,
      retryable: true,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** A network error. Thrown when an HTTP error aside from HTTP 429 occurs. */
export class NetworkError extends JobbyError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorCode.NETWORK, message, {
      originalError,
      retryable: true,
    });
    this.name = 'NetworkError';
  }
}

/** A parsing error. Thrown when an error occurs while parsing job query result data. */
export class ParsingError extends JobbyError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorCode.PARSE, message, {
      originalError,
      retryable: false,
    });
    this.name = 'ParsingError';
  }
}

/** A validation error. Thrown when a validation error occurs when validating job query options or config values. */
export class ValidationError extends JobbyError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorCode.VALIDATION, message, {
      originalError,
      retryable: false,
    });
    this.name = 'ValidationError';
  }
}

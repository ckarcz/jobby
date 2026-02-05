import { vi } from 'vitest';

export function createJobbyMock(): Record<string, unknown> {
  const mockSearch = vi.fn();
  const mockGetDetails = vi.fn();
  const mockSearchRaw = vi.fn();
  const mockGetDetailsRaw = vi.fn();

  class JobbyError extends Error {
    code: string;
    isOperational: boolean;
    originalError: unknown;
    retryable: boolean;
    constructor(code: string, message: string, options: { originalError?: unknown; retryable?: boolean } = {}) {
      super(message);
      this.name = 'JobbyError';
      this.code = code;
      this.isOperational = true;
      this.originalError = options.originalError;
      this.retryable = options.retryable ?? false;
    }
  }

  class RateLimitError extends JobbyError {
    retryAfter: number | undefined;
    constructor(message = 'Rate limit reached', retryAfter?: number, originalError?: unknown) {
      super('E_RATE_LIMIT', message, { originalError, retryable: true });
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  }

  class NetworkError extends JobbyError {
    constructor(message: string, originalError?: unknown) {
      super('E_NETWORK', message, { originalError, retryable: true });
      this.name = 'NetworkError';
    }
  }

  class ParsingError extends JobbyError {
    constructor(message: string, originalError?: unknown) {
      super('E_PARSE', message, { originalError, retryable: false });
      this.name = 'ParsingError';
    }
  }

  class ValidationError extends JobbyError {
    constructor(message: string, originalError?: unknown) {
      super('E_VALIDATION', message, { originalError, retryable: false });
      this.name = 'ValidationError';
    }
  }

  const mockGetDetailsById = vi.fn();
  const mockGetDetailsRawById = vi.fn();

  return {
    JobbyClient: vi.fn().mockImplementation(() => ({
      jobs: {
        queryForJobs: mockSearch,
        queryForJobDetailsByUrl: mockGetDetails,
        queryForJobDetailsById: mockGetDetailsById,
        queryForJobsRawHtml: mockSearchRaw,
        queryForJobDetailsRawHtmlByUrl: mockGetDetailsRaw,
        queryForJobDetailsRawHtmlById: mockGetDetailsRawById,
      },
    })),
    JobbyError,
    RateLimitError,
    NetworkError,
    ParsingError,
    ValidationError,
    JOB_TYPE_CHOICES: ['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship', 'other'],
    EXPERIENCE_LEVEL_CHOICES: ['internship', 'entry-level', 'associate', 'senior', 'director', 'executive'],
    MINIMUM_SALARY_CHOICES: ['40,000', '60,000', '80,000', '100,000', '120,000', '140,000', '160,000', '180,000', '200,000'],
    WORKPLACE_TYPE_CHOICES: ['on-site', 'remote', 'hybrid'],
    LISTING_AGE_CHOICES: ['past-24-hours', 'past-week', 'past-month'],
  };
}

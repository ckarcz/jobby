import { describe, it, expect, vi } from 'vitest';
import { createJobbyMock } from './test-helpers.js';

vi.mock('jobby-client', () => createJobbyMock());

import { formatErrorMessage } from './errors.js';

/**
 * Tests for the formatErrorMessage utility that converts LinkedIn API errors
 * into user-friendly messages with actionable hints based on error type
 * (rate limit, network, validation, parsing).
 */

describe('formatErrorMessage - error message formatting with actionable hints', () => {
  describe('base JobbyError formatting', () => {
    it('should format with error code and message', async () => {
      const { JobbyError } = await import('jobby-client');
      const error = new (JobbyError as any)('E_UNKNOWN', 'Something went wrong');
      const message = formatErrorMessage(error);
      expect(message).toBe('Error [E_UNKNOWN]: Something went wrong');
    });
  });

  describe('RateLimitError hints', () => {
    it('should add retry hint with retryAfter seconds', async () => {
      const { RateLimitError } = await import('jobby-client');
      const error = new (RateLimitError as any)('Rate limit', 30);
      const message = formatErrorMessage(error);
      expect(message).toContain('Try again in 30 seconds');
    });

    it('should add generic retry hint without retryAfter', async () => {
      const { RateLimitError } = await import('jobby-client');
      const error = new (RateLimitError as any)('Rate limit');
      const message = formatErrorMessage(error);
      expect(message).toContain('Try again later');
    });
  });

  describe('NetworkError hints', () => {
    it('should add connection hint', async () => {
      const { NetworkError } = await import('jobby-client');
      const error = new (NetworkError as any)('Connection failed');
      const message = formatErrorMessage(error);
      expect(message).toContain('Check your internet connection');
    });
  });

  describe('ValidationError hints', () => {
    it('should add arguments hint', async () => {
      const { ValidationError } = await import('jobby-client');
      const error = new (ValidationError as any)('Invalid param');
      const message = formatErrorMessage(error);
      expect(message).toContain('Check your arguments');
    });
  });

  describe('base JobbyError with no subclass hint', () => {
    it('should return only base message with no hint line', async () => {
      const { JobbyError } = await import('jobby-client');
      const error = new (JobbyError as any)('E_GENERIC', 'Generic error occurred');
      const message = formatErrorMessage(error);
      expect(message).toBe('Error [E_GENERIC]: Generic error occurred');
      expect(message).not.toContain('Hint:');
    });
  });

  describe('RateLimitError without retryAfter', () => {
    it('should show "Try again later" when retryAfter is undefined', async () => {
      const { RateLimitError } = await import('jobby-client');
      const error = new (RateLimitError as any)('Rate limited');
      const message = formatErrorMessage(error);
      expect(message).toContain('Try again later');
      expect(message).not.toContain('seconds');
    });
  });

  describe('error code in brackets', () => {
    it('should include the error code in square brackets', async () => {
      const { JobbyError } = await import('jobby-client');
      const error = new (JobbyError as any)('E_TEST_CODE', 'test message');
      const message = formatErrorMessage(error);
      expect(message).toContain('[E_TEST_CODE]');
    });

    it('should include the error code for RateLimitError', async () => {
      const { RateLimitError } = await import('jobby-client');
      const error = new (RateLimitError as any)('Rate limited', 60);
      const message = formatErrorMessage(error);
      expect(message).toContain('[E_RATE_LIMIT]');
    });

    it('should include the error code for NetworkError', async () => {
      const { NetworkError } = await import('jobby-client');
      const error = new (NetworkError as any)('Network down');
      const message = formatErrorMessage(error);
      expect(message).toContain('[E_NETWORK]');
    });
  });

  describe('ParsingError hints', () => {
    it('should add page structure hint', async () => {
      const { ParsingError } = await import('jobby-client');
      const error = new (ParsingError as any)('Parse failed');
      const message = formatErrorMessage(error);
      expect(message).toContain('LinkedIn may have changed their page structure');
    });
  });
});

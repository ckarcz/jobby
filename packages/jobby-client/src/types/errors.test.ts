import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  JobbyError,
  RateLimitError,
  NetworkError,
  ParsingError,
  ValidationError,
} from './errors.js';

/**
 * Tests for the custom error class hierarchy (JobbyError and subclasses)
 * including error codes, retryability flags, and the static from() factory method.
 */

describe('LinkedIn Jobs error types - custom error classes and codes', () => {
  describe('JobbyError', () => {
    it('should create error with code and message', () => {
      const error = new JobbyError(ErrorCode.NETWORK, 'Network failure');
      expect(error.code).toBe(ErrorCode.NETWORK);
      expect(error.message).toBe('Network failure');
      expect(error.name).toBe('JobbyError');
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
    });

    it('should store original error', () => {
      const original = new Error('Original');
      const error = new JobbyError(ErrorCode.NETWORK, 'Wrapped', { originalError: original });
      expect(error.originalError).toBe(original);
    });

    it('should allow setting isOperational', () => {
      const error = new JobbyError(ErrorCode.NETWORK, 'Error', { isOperational: false });
      expect(error.isOperational).toBe(false);
    });

    it('should allow setting retryable', () => {
      const error = new JobbyError(ErrorCode.NETWORK, 'Error', { retryable: true });
      expect(error.retryable).toBe(true);
    });

    describe('from static method', () => {
      it('should return same error if already JobbyError', () => {
        const original = new NetworkError('Already wrapped');
        const result = JobbyError.from(original);
        expect(result).toBe(original);
      });

      it('should wrap regular Error as non-operational JobbyError', () => {
        const original = new Error('Regular error');
        const result = JobbyError.from(original);
        expect(result).toBeInstanceOf(JobbyError);
        expect(result).not.toBeInstanceOf(NetworkError);
        expect(result.message).toBe('Regular error');
        expect(result.isOperational).toBe(false);
        expect(result.retryable).toBe(false);
        expect(result.originalError).toBe(original);
      });

      it('should wrap string as non-operational JobbyError', () => {
        const result = JobbyError.from('string error');
        expect(result).toBeInstanceOf(JobbyError);
        expect(result).not.toBeInstanceOf(NetworkError);
        expect(result.message).toBe('string error');
        expect(result.isOperational).toBe(false);
        expect(result.retryable).toBe(false);
      });

      it('should wrap other primitives as non-operational JobbyError', () => {
        const result = JobbyError.from(123);
        expect(result).toBeInstanceOf(JobbyError);
        expect(result).not.toBeInstanceOf(NetworkError);
        expect(result.message).toBe('123');
        expect(result.isOperational).toBe(false);
        expect(result.retryable).toBe(false);
      });
    });
  });

  describe('RateLimitError', () => {
    it('should create with default message', () => {
      const error = new RateLimitError();
      expect(error.code).toBe(ErrorCode.RATE_LIMIT);
      expect(error.message).toBe('Rate limit reached');
      expect(error.name).toBe('RateLimitError');
      expect(error.retryable).toBe(true);
    });

    it('should create with custom message', () => {
      const error = new RateLimitError('Too many requests');
      expect(error.message).toBe('Too many requests');
    });

    it('should store retryAfter value', () => {
      const error = new RateLimitError('Rate limited', 60);
      expect(error.retryAfter).toBe(60);
    });

    it('should store original error', () => {
      const original = new Error('Original');
      const error = new RateLimitError('Rate limited', 30, original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('NetworkError', () => {
    it('should create with message', () => {
      const error = new NetworkError('Connection failed');
      expect(error.code).toBe(ErrorCode.NETWORK);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('NetworkError');
      expect(error.retryable).toBe(true);
    });

    it('should store original error', () => {
      const original = new Error('Original');
      const error = new NetworkError('Wrapped', original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('ParsingError', () => {
    it('should create with message', () => {
      const error = new ParsingError('Failed to parse HTML');
      expect(error.code).toBe(ErrorCode.PARSE);
      expect(error.message).toBe('Failed to parse HTML');
      expect(error.name).toBe('ParsingError');
      expect(error.retryable).toBe(false);
    });

    it('should store original error', () => {
      const original = new SyntaxError('Invalid JSON');
      const error = new ParsingError('Parse failed', original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('ValidationError', () => {
    it('should create with message', () => {
      const error = new ValidationError('Invalid parameter');
      expect(error.code).toBe(ErrorCode.VALIDATION);
      expect(error.message).toBe('Invalid parameter');
      expect(error.name).toBe('ValidationError');
      expect(error.retryable).toBe(false);
    });

    it('should store original error', () => {
      const original = new TypeError('Wrong type');
      const error = new ValidationError('Validation failed', original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('ErrorCode enum', () => {
    it('should have expected values', () => {
      expect(ErrorCode.RATE_LIMIT).toBe('E_RATE_LIMIT');
      expect(ErrorCode.NETWORK).toBe('E_NETWORK');
      expect(ErrorCode.PARSE).toBe('E_PARSE');
      expect(ErrorCode.VALIDATION).toBe('E_VALIDATION');
    });
  });

  describe('instanceof checks across hierarchy', () => {
    it('should be instanceof Error for all error types', () => {
      expect(new RateLimitError()).toBeInstanceOf(Error);
      expect(new NetworkError('test')).toBeInstanceOf(Error);
      expect(new ParsingError('test')).toBeInstanceOf(Error);
      expect(new ValidationError('test')).toBeInstanceOf(Error);
    });

    it('should be instanceof JobbyError for all error types', () => {
      expect(new RateLimitError()).toBeInstanceOf(JobbyError);
      expect(new NetworkError('test')).toBeInstanceOf(JobbyError);
      expect(new ParsingError('test')).toBeInstanceOf(JobbyError);
      expect(new ValidationError('test')).toBeInstanceOf(JobbyError);
    });

    it('RateLimitError should not be instanceof other subclasses', () => {
      const error = new RateLimitError();
      expect(error).not.toBeInstanceOf(NetworkError);
      expect(error).not.toBeInstanceOf(ParsingError);
      expect(error).not.toBeInstanceOf(ValidationError);
    });
  });

  describe('JobbyError.from edge cases', () => {
    it('should wrap null as non-operational JobbyError', () => {
      const result = JobbyError.from(null);
      expect(result).toBeInstanceOf(JobbyError);
      expect(result).not.toBeInstanceOf(NetworkError);
      expect(result.message).toBe('null');
      expect(result.isOperational).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should wrap undefined as non-operational JobbyError', () => {
      const result = JobbyError.from(undefined);
      expect(result).toBeInstanceOf(JobbyError);
      expect(result).not.toBeInstanceOf(NetworkError);
      expect(result.message).toBe('undefined');
      expect(result.isOperational).toBe(false);
    });

    it('should wrap boolean as non-operational JobbyError', () => {
      const result = JobbyError.from(false);
      expect(result).toBeInstanceOf(JobbyError);
      expect(result).not.toBeInstanceOf(NetworkError);
      expect(result.message).toBe('false');
      expect(result.isOperational).toBe(false);
    });

    it('should preserve TypeError message when wrapping as non-operational', () => {
      const result = JobbyError.from(new TypeError('type error'));
      expect(result.message).toBe('type error');
      expect(result.originalError).toBeInstanceOf(TypeError);
      expect(result.isOperational).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should return same RateLimitError instance', () => {
      const original = new RateLimitError('rate limit', 30);
      const result = JobbyError.from(original);
      expect(result).toBe(original);
      expect((result as RateLimitError).retryAfter).toBe(30);
    });
  });
});

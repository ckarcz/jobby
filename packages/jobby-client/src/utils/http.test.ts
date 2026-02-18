import { describe, it, expect, vi } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { isAxiosError, handleHttpError, getRandomUserAgent, resolveUserAgent, createRequestHeaders, createDetailsRequestHeaders } from './http.js';
import { RateLimitError, NetworkError } from '../types/errors.js';
import type { Logger } from '../logging.js';

// Mock random-useragent
vi.mock('random-useragent', () => ({
  default: {
    getRandom: vi.fn(() => 'Mozilla/5.0 Random User Agent'),
  },
}));

/**
 * Tests for HTTP utility functions including Axios error detection,
 * random user agent generation, and request header creation for
 * both job search and job detail API requests.
 */

describe('HTTP utilities - request headers and user agent management', () => {
  describe('isAxiosError', () => {
    it('should return true for axios error objects', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Request failed',
        name: 'AxiosError',
      };
      expect(isAxiosError(axiosError)).toBe(true);
    });

    it('should return false for regular Error objects', () => {
      const error = new Error('Regular error');
      expect(isAxiosError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAxiosError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAxiosError(undefined)).toBe(false);
    });

    it('should return false for objects without isAxiosError property', () => {
      expect(isAxiosError({ message: 'error' })).toBe(false);
    });

    it('should return false for objects with isAxiosError set to false', () => {
      expect(isAxiosError({ isAxiosError: false })).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isAxiosError('error')).toBe(false);
      expect(isAxiosError(123)).toBe(false);
      expect(isAxiosError(true)).toBe(false);
    });
  });

  describe('getRandomUserAgent', () => {
    it('should return a user agent string', () => {
      const ua = getRandomUserAgent();
      expect(typeof ua).toBe('string');
      expect(ua.length).toBeGreaterThan(0);
    });

    it('should return fallback user agent when getRandom() returns null', async () => {
      const randomUseragent = await import('random-useragent');
      vi.mocked(randomUseragent.default.getRandom).mockReturnValueOnce(null as unknown as string);
      const ua = getRandomUserAgent();
      expect(ua).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    });
  });

  describe('resolveUserAgent', () => {
    it('should return the string directly', () => {
      expect(resolveUserAgent('Custom UA')).toBe('Custom UA');
    });

    it('should call factory function and return its result', () => {
      const uaFn = vi.fn(() => 'Function UA');
      expect(resolveUserAgent(uaFn)).toBe('Function UA');
      expect(uaFn).toHaveBeenCalled();
    });

    it('should return a random UA when called with no argument', () => {
      const ua = resolveUserAgent();
      expect(typeof ua).toBe('string');
      expect(ua.length).toBeGreaterThan(0);
    });
  });

  describe('createRequestHeaders', () => {
    it('should set the provided User-Agent string', () => {
      const headers = createRequestHeaders('Custom UA');
      expect(headers['User-Agent']).toBe('Custom UA');
      expect(headers['Accept']).toBe('application/json, text/javascript, */*; q=0.01');
      expect(headers['Accept-Language']).toBe('en-US,en;q=0.9');
      expect(headers['Referer']).toBe('https://www.linkedin.com/jobs');
    });

    it('should include all required headers', () => {
      const headers = createRequestHeaders('Test UA');
      expect(headers).toHaveProperty('User-Agent');
      expect(headers).toHaveProperty('Accept');
      expect(headers).toHaveProperty('Accept-Language');
      expect(headers).toHaveProperty('Accept-Encoding');
      expect(headers).toHaveProperty('Referer');
      expect(headers).toHaveProperty('X-Requested-With');
      expect(headers).toHaveProperty('Connection');
      expect(headers).toHaveProperty('Sec-Fetch-Dest');
      expect(headers).toHaveProperty('Sec-Fetch-Mode');
      expect(headers).toHaveProperty('Sec-Fetch-Site');
      expect(headers).toHaveProperty('Cache-Control');
      expect(headers).toHaveProperty('Pragma');
    });
  });

  describe('handleHttpError', () => {
    const mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    function createAxiosError(status: number, headers: Record<string, string> = {}): AxiosError {
      const error = new AxiosError(
        `Request failed with status code ${status}`,
        String(status),
        undefined,
        undefined,
        { status, headers, data: '', statusText: '', config: {} as never } as AxiosResponse,
      );
      return error;
    }

    it('should throw RateLimitError for HTTP 429', () => {
      const error = createAxiosError(429, { 'retry-after': '30' });
      expect(() => handleHttpError(error, mockLogger)).toThrow(RateLimitError);
    });

    it('should parse retry-after header on 429', () => {
      const error = createAxiosError(429, { 'retry-after': '60' });
      try {
        handleHttpError(error, mockLogger);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfter).toBe(60);
      }
    });

    it('should throw NetworkError for non-429 HTTP errors', () => {
      const error = createAxiosError(500);
      expect(() => handleHttpError(error, mockLogger)).toThrow(NetworkError);
    });

    it('should throw NetworkError for non-axios errors', () => {
      const error = new Error('connection refused');
      expect(() => handleHttpError(error, mockLogger)).toThrow(NetworkError);
    });

    it('should throw NetworkError for unknown error types', () => {
      expect(() => handleHttpError('some string error', mockLogger)).toThrow(NetworkError);
    });

    it('should handle 429 without retry-after header', () => {
      const error = createAxiosError(429, {});
      try {
        handleHttpError(error, mockLogger);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfter).toBeUndefined();
      }
    });

    it('should handle 429 with non-numeric retry-after header', () => {
      const error = createAxiosError(429, { 'retry-after': 'abc' });
      try {
        handleHttpError(error, mockLogger);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfter).toBeUndefined();
      }
    });

    it('should show ??? for axios error without response status', () => {
      const error = new AxiosError('Network error', 'ERR_NETWORK');
      try {
        handleHttpError(error, mockLogger);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(NetworkError);
        expect((e as NetworkError).message).toContain('???');
      }
    });
  });

  describe('createDetailsRequestHeaders', () => {
    it('should set the provided User-Agent string', () => {
      const headers = createDetailsRequestHeaders('Custom UA');
      expect(headers['User-Agent']).toBe('Custom UA');
      expect(headers['Accept']).toBe('text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
    });

    it('should include all required headers', () => {
      const headers = createDetailsRequestHeaders('Test UA');
      expect(headers).toHaveProperty('User-Agent');
      expect(headers).toHaveProperty('Accept');
      expect(headers).toHaveProperty('Accept-Language');
      expect(headers).toHaveProperty('Accept-Encoding');
      expect(headers).toHaveProperty('Connection');
      expect(headers).toHaveProperty('Cache-Control');
    });
  });
});

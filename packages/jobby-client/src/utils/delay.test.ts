import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delay } from './delay.js';

/** Tests for the delay utility function used for rate limiting when making HTTP requests. */

describe('delay utilities - timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('delay', () => {
    it('should return a promise that resolves after specified milliseconds', async () => {
      const promise = delay(1000);

      vi.advanceTimersByTime(999);
      expect(vi.getTimerCount()).toBe(1);

      vi.advanceTimersByTime(1);
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('should resolve immediately for 0ms delay', async () => {
      const promise = delay(0);
      vi.advanceTimersByTime(0);
      await promise;
      expect(vi.getTimerCount()).toBe(0);
    });
  });

});

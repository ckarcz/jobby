import { describe, it, expect, vi } from 'vitest';
import { withRetry, resolveRetryConfig, DEFAULT_RETRY_CONFIG } from './retry.js';
import { NetworkError, RateLimitError, ValidationError } from '../types/errors.js';

describe('resolveRetryConfig', () => {
  it('should return defaults when no config provided', () => {
    expect(resolveRetryConfig()).toEqual(DEFAULT_RETRY_CONFIG);
  });

  it('should return defaults when empty config provided', () => {
    expect(resolveRetryConfig({})).toEqual(DEFAULT_RETRY_CONFIG);
  });

  it('should override maxRetries', () => {
    expect(resolveRetryConfig({ maxRetries: 3 }).maxRetries).toBe(3);
  });

  it('should override initialDelayMs', () => {
    expect(resolveRetryConfig({ initialDelayMs: 500 }).initialDelayMs).toBe(500);
  });

  it('should override maxDelayMs', () => {
    expect(resolveRetryConfig({ maxDelayMs: 60_000 }).maxDelayMs).toBe(60_000);
  });
});

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not retry when maxRetries is 0', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('fail'));
    await expect(withRetry(fn, { maxRetries: 0, initialDelayMs: 1, maxDelayMs: 10 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry retryable errors up to maxRetries', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('fail 1'))
      .mockRejectedValueOnce(new NetworkError('fail 2'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('persistent fail'));

    await expect(withRetry(fn, { maxRetries: 2, initialDelayMs: 1, maxDelayMs: 10 })).rejects.toThrow('persistent fail');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new ValidationError('bad input'));

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 10 })).rejects.toThrow('bad input');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not retry non-JobbyError errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('generic'));

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 10 })).rejects.toThrow('generic');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry RateLimitError (retryable)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new RateLimitError('rate limited'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 1, initialDelayMs: 1, maxDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff delay', async () => {
    const delaySpy = vi.spyOn(await import('./delay.js'), 'delay').mockResolvedValue();
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('fail 1'))
      .mockRejectedValueOnce(new NetworkError('fail 2'))
      .mockResolvedValue('ok');

    await withRetry(fn, { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 1000 });

    expect(delaySpy).toHaveBeenCalledTimes(2);
    expect(delaySpy).toHaveBeenNthCalledWith(1, 100);  // 100 * 2^0
    expect(delaySpy).toHaveBeenNthCalledWith(2, 200);  // 100 * 2^1

    delaySpy.mockRestore();
  });

  it('should cap delay at maxDelayMs', async () => {
    const delaySpy = vi.spyOn(await import('./delay.js'), 'delay').mockResolvedValue();
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('fail 1'))
      .mockRejectedValueOnce(new NetworkError('fail 2'))
      .mockRejectedValueOnce(new NetworkError('fail 3'))
      .mockResolvedValue('ok');

    await withRetry(fn, { maxRetries: 4, initialDelayMs: 100, maxDelayMs: 250 });

    expect(delaySpy).toHaveBeenNthCalledWith(1, 100);  // 100 * 2^0
    expect(delaySpy).toHaveBeenNthCalledWith(2, 200);  // 100 * 2^1
    expect(delaySpy).toHaveBeenNthCalledWith(3, 250);  // capped at 250 (would be 400)

    delaySpy.mockRestore();
  });

  it('should use retryAfter from RateLimitError when available', async () => {
    const delaySpy = vi.spyOn(await import('./delay.js'), 'delay').mockResolvedValue();
    const fn = vi.fn()
      .mockRejectedValueOnce(new RateLimitError('rate limited', 5))
      .mockResolvedValue('ok');

    await withRetry(fn, { maxRetries: 1, initialDelayMs: 100, maxDelayMs: 1000 });

    expect(delaySpy).toHaveBeenCalledWith(5000); // 5 seconds * 1000

    delaySpy.mockRestore();
  });
});

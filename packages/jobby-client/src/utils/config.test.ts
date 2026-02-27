import { describe, it, expect } from 'vitest';
import { resolveWithDefaults } from './config.js';

describe('resolveWithDefaults', () => {
  const defaults = { a: 1, b: 'hello', c: true };

  it('should return defaults when partial is undefined', () => {
    expect(resolveWithDefaults(undefined, defaults)).toEqual(defaults);
  });

  it('should return defaults when partial is empty', () => {
    expect(resolveWithDefaults({}, defaults)).toEqual(defaults);
  });

  it('should override only provided values', () => {
    expect(resolveWithDefaults({ a: 42 }, defaults)).toEqual({ a: 42, b: 'hello', c: true });
  });

  it('should not override when partial value is undefined', () => {
    expect(resolveWithDefaults({ a: undefined }, defaults)).toEqual(defaults);
  });

  it('should override with falsy non-undefined values', () => {
    expect(resolveWithDefaults({ a: 0, b: '', c: false }, defaults)).toEqual({ a: 0, b: '', c: false });
  });

  it('should return a new object, not mutate defaults', () => {
    const result = resolveWithDefaults({ a: 99 }, defaults);
    expect(result).not.toBe(defaults);
    expect(defaults.a).toBe(1);
  });
});

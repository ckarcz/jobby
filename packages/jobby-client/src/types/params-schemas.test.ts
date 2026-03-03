import { describe, it, expect } from 'vitest';
import { zodEnumFromMap, MinimumSalarySchema } from './params-schemas.js';

/**
 * Tests for Zod schema helpers that derive enum schemas from parameter maps.
 */

describe('zodEnumFromMap - Zod enum schema from parameter map', () => {
  it('should create a valid Zod enum from a non-empty map', () => {
    const schema = zodEnumFromMap({ a: '1', b: '2' });
    expect(schema.parse('a')).toBe('a');
    expect(schema.parse('b')).toBe('b');
    expect(() => schema.parse('c')).toThrow();
  });

  it('should throw a descriptive error for an empty map', () => {
    expect(() => zodEnumFromMap({})).toThrow('zodEnumFromMap requires a map with at least one key');
  });
});

describe('MinimumSalarySchema - flexible salary format normalization', () => {
  it('should accept comma-formatted values', () => {
    expect(MinimumSalarySchema.parse('180,000')).toBe('180,000');
    expect(MinimumSalarySchema.parse('100,000')).toBe('100,000');
  });

  it('should accept plain numeric values and normalize to comma format', () => {
    expect(MinimumSalarySchema.parse('180000')).toBe('180,000');
    expect(MinimumSalarySchema.parse('100000')).toBe('100,000');
    expect(MinimumSalarySchema.parse('40000')).toBe('40,000');
  });

  it('should accept underscore-separated values and normalize to comma format', () => {
    expect(MinimumSalarySchema.parse('180_000')).toBe('180,000');
    expect(MinimumSalarySchema.parse('100_000')).toBe('100,000');
    expect(MinimumSalarySchema.parse('40_000')).toBe('40,000');
  });

  it('should reject invalid salary values', () => {
    expect(() => MinimumSalarySchema.parse('50000')).toThrow();
    expect(() => MinimumSalarySchema.parse('abc')).toThrow();
    expect(() => MinimumSalarySchema.parse('')).toThrow();
  });
});

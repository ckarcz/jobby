import { describe, it, expect } from 'vitest';
import { zodEnumFromMap } from './params-schemas.js';

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

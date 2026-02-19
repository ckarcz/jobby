import { describe, it, expect } from 'vitest';
import { parseNumber } from './parse.js';

/**
 * Tests for the parseNumber utility used by Commander.js option parsing
 * to convert string arguments into validated integer values.
 */

describe('parseNumber - numeric string parsing for CLI options', () => {
  describe('valid integer parsing', () => {
    it('should parse positive integers', () => {
      expect(parseNumber('42')).toBe(42);
      expect(parseNumber('100')).toBe(100);
      expect(parseNumber('123')).toBe(123);
    });

    it('should parse zero', () => {
      expect(parseNumber('0')).toBe(0);
    });

    it('should reject negative integers', () => {
      expect(() => parseNumber('-5')).toThrow('Invalid number (must be non-negative): -5');
      expect(() => parseNumber('-100')).toThrow('Invalid number (must be non-negative): -100');
    });
  });

  describe('invalid input rejection', () => {
    it('should throw for alphabetic strings', () => {
      expect(() => parseNumber('abc')).toThrow('Invalid number: abc');
    });

    it('should throw for empty string', () => {
      expect(() => parseNumber('')).toThrow('Invalid number: ');
    });

    it('should throw for strings starting with non-numeric characters', () => {
      expect(() => parseNumber('abc12')).toThrow('Invalid number: abc12');
    });
  });

  describe('additional valid parsing', () => {
    it('should parse "0" as 0', () => {
      expect(parseNumber('0')).toBe(0);
    });

    it('should reject negative numbers like "-5"', () => {
      expect(() => parseNumber('-5')).toThrow('Invalid number (must be non-negative): -5');
    });

    it('should parse numbers with leading zeros', () => {
      expect(parseNumber('007')).toBe(7);
    });
  });

  describe('additional invalid input rejection', () => {
    it('should throw for empty string', () => {
      expect(() => parseNumber('')).toThrow('Invalid number: ');
    });

    it('should throw for floating point numbers', () => {
      expect(() => parseNumber('3.14')).toThrow('Invalid number: 3.14');
    });

    it('should throw for strings with trailing non-numeric characters', () => {
      expect(() => parseNumber('12abc')).toThrow('Invalid number: 12abc');
    });
  });

  describe('edge cases', () => {
    it('should parse large numbers', () => {
      expect(parseNumber('999999')).toBe(999999);
    });
  });
});

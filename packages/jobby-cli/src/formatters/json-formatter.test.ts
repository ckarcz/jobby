import { describe, it, expect } from 'vitest';
import { jsonFormatter } from './json-formatter.js';

describe('jsonFormatter', () => {
  describe('compact output (default)', () => {
    it('should output compact JSON', async () => {
      expect(await jsonFormatter.format({ key: 'value' }, {})).toBe('{"key":"value"}');
    });

    it('should output compact nested objects', async () => {
      expect(await jsonFormatter.format({ a: { b: 1 } }, {})).toBe('{"a":{"b":1}}');
    });

    it('should output compact arrays', async () => {
      expect(await jsonFormatter.format([1, 2, 3], {})).toBe('[1,2,3]');
    });

    it('should output null', async () => {
      expect(await jsonFormatter.format(null, {})).toBe('null');
    });
  });

  describe('pretty output', () => {
    it('should output pretty-printed JSON', async () => {
      const result = await jsonFormatter.format({ key: 'value' }, { pretty: true });
      expect(result).toContain('\n');
      expect(result).toContain('  "key"');
    });

    it('should use 2-space indentation', async () => {
      const result = await jsonFormatter.format({ a: 1 }, { pretty: true });
      expect(result).toBe('{\n  "a": 1\n}');
    });
  });
});

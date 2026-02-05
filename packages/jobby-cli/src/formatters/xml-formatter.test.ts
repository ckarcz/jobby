import { describe, it, expect } from 'vitest';
import { xmlFormatter } from './xml-formatter.js';

describe('xmlFormatter', () => {
  describe('compact output (default)', () => {
    it('should output compact XML with header', async () => {
      const result = await xmlFormatter.format({ key: 'value' }, {});
      expect(result).toBe('<?xml version="1.0" encoding="UTF-8"?><root><key>value</key></root>');
    });

    it('should not contain newlines in compact mode', async () => {
      const result = await xmlFormatter.format({ a: 1, b: 2 }, {});
      expect(result).not.toContain('\n');
    });

    it('should handle nested objects', async () => {
      const result = await xmlFormatter.format({ outer: { inner: 'val' } }, {});
      expect(result).toContain('<outer><inner>val</inner></outer>');
    });

    it('should handle arrays as item elements', async () => {
      const result = await xmlFormatter.format({ items: [1, 2] }, {});
      expect(result).toContain('<items><item>1</item><item>2</item></items>');
    });

    it('should handle null/undefined values as self-closing tags', async () => {
      const result = await xmlFormatter.format({ empty: null }, {});
      expect(result).toContain('<empty/>');
    });
  });

  describe('pretty output', () => {
    it('should output indented XML', async () => {
      const result = await xmlFormatter.format({ key: 'value' }, { pretty: true });
      expect(result).toContain('\n');
      expect(result).toContain('  <key>value</key>');
    });

    it('should include XML header on its own line', async () => {
      const result = await xmlFormatter.format({ a: 1 }, { pretty: true });
      const lines = result.split('\n');
      expect(lines[0]).toBe('<?xml version="1.0" encoding="UTF-8"?>');
      expect(lines[1]).toBe('<root>');
    });
  });

  describe('wrapArrays edge cases', () => {
    it('should return null for null input', async () => {
      const result = await xmlFormatter.format(null, {});
      expect(result).toContain('<root/>');
    });

    it('should handle undefined input gracefully', async () => {
      const result = await xmlFormatter.format(undefined, {});
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should handle deeply nested objects and arrays', async () => {
      const data = {
        level1: {
          level2: {
            items: [{ name: 'a' }, { name: 'b' }],
          },
        },
      };
      const result = await xmlFormatter.format(data, {});
      expect(result).toContain('<level1>');
      expect(result).toContain('<level2>');
      expect(result).toContain('<items>');
      expect(result).toContain('<item>');
      expect(result).toContain('<name>a</name>');
      expect(result).toContain('<name>b</name>');
    });
  });

  describe('boolean and number values', () => {
    it('should handle boolean values', async () => {
      const result = await xmlFormatter.format({ active: true, deleted: false }, {});
      expect(result).toContain('<active>true</active>');
      expect(result).toContain('<deleted>false</deleted>');
    });

    it('should handle number values', async () => {
      const result = await xmlFormatter.format({ count: 42, price: 9.99 }, {});
      expect(result).toContain('<count>42</count>');
      expect(result).toContain('<price>9.99</price>');
    });
  });

  describe('empty object', () => {
    it('should output root element for empty object', async () => {
      const result = await xmlFormatter.format({}, {});
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<root');
    });
  });

  describe('XML escaping', () => {
    it('should escape special characters in values', async () => {
      const result = await xmlFormatter.format({ text: 'a < b & c > d "e" \'f\'' }, {});
      expect(result).toContain('&lt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&apos;');
    });
  });
});

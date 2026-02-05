import { describe, it, expect } from 'vitest';
import { yamlFormatter } from './yaml-formatter.js';

describe('yamlFormatter', () => {
  it('should format simple key-value pairs', async () => {
    const result = await yamlFormatter.format({ name: 'John', age: 30 }, {});
    expect(result).toContain('name: John');
    expect(result).toContain('age: 30');
  });

  it('should format nested objects with indentation', async () => {
    const result = await yamlFormatter.format({ outer: { inner: 'value' } }, {});
    expect(result).toContain('outer:');
    expect(result).toContain('  inner: value');
  });

  it('should format arrays with dash syntax', async () => {
    const result = await yamlFormatter.format({ items: [1, 2, 3] }, {});
    expect(result).toContain('items:');
    expect(result).toContain('  - 1');
    expect(result).toContain('  - 2');
    expect(result).toContain('  - 3');
  });

  it('should handle null values', async () => {
    const result = await yamlFormatter.format({ key: null }, {});
    expect(result).toContain('key: null');
  });

  it('should handle boolean values', async () => {
    const result = await yamlFormatter.format({ active: true, deleted: false }, {});
    expect(result).toContain('active: true');
    expect(result).toContain('deleted: false');
  });

  it('should quote strings that could be ambiguous', async () => {
    const result = await yamlFormatter.format({ val: 'true' }, {});
    expect(result).toContain('val: "true"');
  });

  it('should handle strings containing colons', async () => {
    const result = await yamlFormatter.format({ url: 'http://example.com' }, {});
    expect(result).toContain('url:');
    expect(result).toContain('http://example.com');
  });

  it('should handle empty objects', async () => {
    const result = await yamlFormatter.format({ empty: {} }, {});
    expect(result).toContain('empty: {}');
  });

  it('should handle empty arrays', async () => {
    const result = await yamlFormatter.format({ items: [] }, {});
    expect(result).toContain('items: []');
  });

  it('should format top-level null', async () => {
    expect(await yamlFormatter.format(null, {})).toBe('null');
  });
});

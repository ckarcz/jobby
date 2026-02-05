import { describe, it, expect, beforeAll } from 'vitest';
import { getFormatter, registerFormatter } from './formatter.js';
import { registerDefaultFormatters } from './index.js';
import type { OutputFormatter } from './formatter.js';

beforeAll(() => {
  registerDefaultFormatters();
});

describe('formatter registry', () => {
  it('should return the json formatter', () => {
    expect(getFormatter('json')).toBeDefined();
  });

  it('should return the xml formatter', () => {
    expect(getFormatter('xml')).toBeDefined();
  });

  it('should return the yaml formatter', () => {
    expect(getFormatter('yaml')).toBeDefined();
  });

  it('should return the csv formatter', () => {
    expect(getFormatter('csv')).toBeDefined();
  });

  it('should return the html formatter', () => {
    expect(getFormatter('rawHtml')).toBeDefined();
  });

  it('should throw for unknown format', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getFormatter('unknown' as any)).toThrow('Unknown output format: unknown');
  });

  it('should overwrite existing formatter when registerFormatter is called with same format', () => {
    const customFormatter: OutputFormatter = {
      format: async () => 'custom output',
    };
    registerFormatter('json', customFormatter);
    const retrieved = getFormatter('json');
    expect(retrieved).toBe(customFormatter);

    // Restore the default formatter
    registerDefaultFormatters();
  });

  it('should return the most recently registered formatter for a format', () => {
    const first: OutputFormatter = {
      format: async () => 'first',
    };
    const second: OutputFormatter = {
      format: async () => 'second',
    };
    registerFormatter('json', first);
    registerFormatter('json', second);
    const retrieved = getFormatter('json');
    expect(retrieved).toBe(second);

    // Restore the default formatter
    registerDefaultFormatters();
  });
});

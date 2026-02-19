import { describe, it, expect, beforeAll } from 'vitest';
import { getFormatter, registerFormatter, createFormatterRegistry } from './formatter.js';
import { registerDefaultFormatters } from './index.js';
import type { OutputFormatter } from './formatter.js';

beforeAll(() => {
  registerDefaultFormatters();
});

describe('default formatter registry', () => {
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

describe('createFormatterRegistry', () => {
  it('should create an independent registry', () => {
    const registry = createFormatterRegistry();
    const formatter: OutputFormatter = { format: async () => 'test' };
    registry.register('json', formatter);
    expect(registry.get('json')).toBe(formatter);
  });

  it('should throw for unregistered format', () => {
    const registry = createFormatterRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => registry.get('json' as any)).toThrow('Unknown output format: json');
  });

  it('should not share state with the default registry', () => {
    const registry = createFormatterRegistry();
    const formatter: OutputFormatter = { format: async () => 'isolated' };
    registry.register('json', formatter);

    // The default registry should still have its own json formatter (not the one we just registered)
    expect(getFormatter('json')).not.toBe(formatter);
  });

  it('should not share state between independent registries', () => {
    const registryA = createFormatterRegistry();
    const registryB = createFormatterRegistry();
    const formatter: OutputFormatter = { format: async () => 'only-in-A' };
    registryA.register('json', formatter);

    expect(registryA.get('json')).toBe(formatter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => registryB.get('json' as any)).toThrow('Unknown output format: json');
  });
});

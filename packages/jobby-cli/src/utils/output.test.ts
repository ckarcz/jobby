import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { outputResult } from './output.js';
import { registerDefaultFormatters } from '../formatters/index.js';

beforeAll(() => {
  registerDefaultFormatters();
});

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));

vi.mock('cli-highlight', () => ({
  highlight: (str: string, opts: { language: string }) => `\x1b[highlighted:${opts.language}]${str}\x1b[/highlighted]`,
}));

import { writeFileSync } from 'node:fs';

/**
 * Tests for the outputResult utility that dispatches to the
 * correct formatter and applies optional syntax highlighting via cli-highlight.
 */

describe('outputResult - output format dispatch and highlighting', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('JSON output (default)', () => {
    it('should output compact JSON by default', async () => {
      await outputResult({ key: 'value' }, {});
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('{"key":"value"}');
    });

    it('should output pretty-printed JSON with --pretty flag', async () => {
      await outputResult({ key: 'value' }, { pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\n');
      expect(output).toContain('"key"');
    });

    it('should use 2-space indentation for pretty output', async () => {
      await outputResult({ a: 1 }, { pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('  "a"');
    });

    it('should apply syntax highlighting by default for json', async () => {
      await outputResult({ key: 'value' }, {});
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\x1b[highlighted:json]');
    });

    it('should skip highlight when --no-color is set', async () => {
      await outputResult({ key: 'value' }, { noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\x1b[highlighted');
      expect(output).toBe('{"key":"value"}');
    });

    it('should skip highlight with --no-color and --pretty combined', async () => {
      await outputResult({ key: 'value' }, { noColor: true, pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\x1b[highlighted');
      expect(output).toContain('\n');
    });
  });

  describe('XML output', () => {
    it('should output compact XML by default', async () => {
      await outputResult({ key: 'value' }, { format: 'xml', noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('<?xml version="1.0"');
      expect(output).toContain('<key>value</key>');
      expect(output).not.toContain('\n');
    });

    it('should output pretty XML with --pretty', async () => {
      await outputResult({ key: 'value' }, { format: 'xml', noColor: true, pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\n');
      expect(output).toContain('  <key>value</key>');
    });

    it('should apply syntax highlighting for xml', async () => {
      await outputResult({ key: 'value' }, { format: 'xml' });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\x1b[highlighted:xml]');
    });
  });

  describe('YAML output', () => {
    it('should output YAML', async () => {
      await outputResult({ key: 'value' }, { format: 'yaml', noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('key: value');
    });

    it('should apply syntax highlighting for yaml', async () => {
      await outputResult({ key: 'value' }, { format: 'yaml' });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\x1b[highlighted:yaml]');
    });
  });

  describe('CSV output', () => {
    it('should output CSV with headers', async () => {
      await outputResult({ key: 'value', num: 1 }, { format: 'csv', noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('key,num');
      expect(output).toContain('value,1');
    });

    it('should not apply syntax highlighting for csv', async () => {
      await outputResult({ key: 'value' }, { format: 'csv' });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\x1b[highlighted');
    });
  });

  describe('default format when opts.format is undefined', () => {
    it('should default to json format when format is undefined', async () => {
      await outputResult({ key: 'value' }, { noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toBe('{"key":"value"}');
    });
  });

  describe('CSV format highlighting', () => {
    it('should not apply syntax highlighting for csv format', async () => {
      await outputResult({ key: 'value' }, { format: 'csv' });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\x1b[highlighted');
    });
  });

  describe('rawHtml format highlighting', () => {
    it('should use html language for syntax highlighting', async () => {
      await outputResult('<div>test</div>', { format: 'rawHtml' });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\x1b[highlighted:html]');
    });
  });

  describe('data serialization', () => {
    it('should serialize nested objects', async () => {
      await outputResult({ outer: { inner: 'value' } }, { noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toBe('{"outer":{"inner":"value"}}');
    });

    it('should serialize arrays', async () => {
      await outputResult([1, 2, 3], { noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toBe('[1,2,3]');
    });

    it('should serialize null', async () => {
      await outputResult(null, { noColor: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toBe('null');
    });
  });

  describe('file output (--file)', () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
    });

    afterEach(() => {
      infoSpy.mockRestore();
      vi.mocked(writeFileSync).mockClear();
    });

    it('should write output to file when --file is set', async () => {
      await outputResult({ key: 'value' }, { file: 'out.json' });
      expect(writeFileSync).toHaveBeenCalledWith('out.json', '{"key":"value"}\n', 'utf-8');
    });

    it('should not call console.log when --file is set', async () => {
      await outputResult({ key: 'value' }, { file: 'out.json' });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should print confirmation message when --file is set', async () => {
      await outputResult({ key: 'value' }, { file: 'out.json' });
      expect(infoSpy).toHaveBeenCalledWith('Output written to out.json.');
    });

    it('should write without syntax highlighting (no ANSI codes) to file', async () => {
      await outputResult({ key: 'value' }, { file: 'out.json' });
      const written = vi.mocked(writeFileSync).mock.calls[0]![1] as string;
      expect(written).not.toContain('\x1b[');
      expect(written).toBe('{"key":"value"}\n');
    });

    it('should write pretty-printed output to file when --pretty is set', async () => {
      await outputResult({ key: 'value' }, { file: 'out.json', pretty: true });
      const written = vi.mocked(writeFileSync).mock.calls[0]![1] as string;
      expect(written).toContain('\n');
      expect(written).toContain('"key"');
    });

    it('should propagate file write errors', async () => {
      vi.mocked(writeFileSync).mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });
      await expect(
        outputResult({ key: 'value' }, { file: '/readonly/out.json' }),
      ).rejects.toThrow('EACCES: permission denied');
    });
  });
});

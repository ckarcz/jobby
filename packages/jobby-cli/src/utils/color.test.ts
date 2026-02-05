import { describe, it, expect, vi } from 'vitest';

vi.mock('chalk', () => ({
  default: {
    bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
    green: (s: string) => `\x1b[32m${s}\x1b[39m`,
    magenta: (s: string) => `\x1b[35m${s}\x1b[39m`,
    dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
  },
}));

import {
  styleTitle,
  styleCommandText,
  styleOptionText,
  styleSubcommandText,
  styleArgumentText,
  styleDescriptionText,
} from './color.js';

describe('color style functions', () => {
  it('should wrap title text with bold ANSI codes', () => {
    const result = styleTitle('Usage:');
    expect(result).toBe('\x1b[1mUsage:\x1b[22m');
    expect(result).toContain('Usage:');
  });

  it('should wrap command text with cyan ANSI codes', () => {
    const result = styleCommandText('jobby');
    expect(result).toBe('\x1b[36mjobby\x1b[39m');
    expect(result).toContain('jobby');
  });

  it('should wrap option text with green ANSI codes', () => {
    const result = styleOptionText('--keyword');
    expect(result).toBe('\x1b[32m--keyword\x1b[39m');
    expect(result).toContain('--keyword');
  });

  it('should wrap subcommand text with cyan ANSI codes', () => {
    const result = styleSubcommandText('search');
    expect(result).toBe('\x1b[36msearch\x1b[39m');
    expect(result).toContain('search');
  });

  it('should wrap argument text with magenta ANSI codes', () => {
    const result = styleArgumentText('[keyword]');
    expect(result).toBe('\x1b[35m[keyword]\x1b[39m');
    expect(result).toContain('[keyword]');
  });

  it('should return description text unchanged (identity function)', () => {
    const input = 'search for jobs with filters';
    expect(styleDescriptionText(input)).toBe(input);
  });

  it('should handle empty strings', () => {
    expect(styleTitle('')).toBe('\x1b[1m\x1b[22m');
    expect(styleCommandText('')).toBe('\x1b[36m\x1b[39m');
    expect(styleOptionText('')).toBe('\x1b[32m\x1b[39m');
    expect(styleSubcommandText('')).toBe('\x1b[36m\x1b[39m');
    expect(styleArgumentText('')).toBe('\x1b[35m\x1b[39m');
    expect(styleDescriptionText('')).toBe('');
  });
});

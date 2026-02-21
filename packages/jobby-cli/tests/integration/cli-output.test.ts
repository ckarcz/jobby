import { describe, it, expect } from 'vitest';
import { runCli } from './helpers.js';

/**
 * Integration tests that spawn the real CLI process to verify output
 * formatting: --no-color ANSI suppression, NO_COLOR env support,
 * help section structure, and error routing to stderr.
 */

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[/;

describe('CLI output formatting - --no-color flag', () => {
  describe('--no-color on help output', () => {
    it('should produce no ANSI codes in root help', async () => {
      const { stdout, exitCode } = await runCli(['--help', '--no-color']);
      expect(exitCode).toBe(0);
      expect(stdout).not.toMatch(ANSI_REGEX);
    });

    it('should produce no ANSI codes in search help', async () => {
      const { stdout, exitCode } = await runCli(['search', '--help', '--no-color']);
      expect(exitCode).toBe(0);
      expect(stdout).not.toMatch(ANSI_REGEX);
    });

    it('should produce no ANSI codes in details help', async () => {
      const { stdout, exitCode } = await runCli(['details', '--help', '--no-color']);
      expect(exitCode).toBe(0);
      expect(stdout).not.toMatch(ANSI_REGEX);
    });
  });

  describe('NO_COLOR environment variable on output', () => {
    it('should produce no ANSI codes in version output', async () => {
      const { stdout, exitCode } = await runCli(['--version'], { env: { NO_COLOR: '1' } });
      expect(exitCode).toBe(0);
      expect(stdout).not.toMatch(ANSI_REGEX);
    });

    it('should produce no ANSI codes in help output', async () => {
      const { stdout, exitCode } = await runCli(['--help'], { env: { NO_COLOR: '1' } });
      expect(exitCode).toBe(0);
      expect(stdout).not.toMatch(ANSI_REGEX);
    });
  });
});

describe('CLI output formatting - help output structure', () => {
  describe('root help output sections', () => {
    it('should contain Usage, Commands, and Options sections', async () => {
      const { stdout, exitCode } = await runCli(['--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage');
      expect(stdout).toContain('Commands');
      expect(stdout).toContain('Options');
    });
  });

  describe('search help output sections', () => {
    it('should contain Options section with all flag types', async () => {
      const { stdout, exitCode } = await runCli(['search', '--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Options');
      expect(stdout).toContain('--pretty');
      expect(stdout).toContain('--no-color');
      expect(stdout).toContain('--debug');
    });
  });

  describe('details help output sections', () => {
    it('should contain Options section', async () => {
      const { stdout, exitCode } = await runCli(['details', '--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Options');
      expect(stdout).toContain('--pretty');
      expect(stdout).toContain('--no-color');
      expect(stdout).toContain('--debug');
    });
  });
});

describe('CLI output formatting - error output routing', () => {
  describe('error output on invalid arguments', () => {
    it('should write validation errors to stderr not stdout', async () => {
      const { stdout, stderr, exitCode } = await runCli(['search', '--job-type', 'invalid']);
      expect(exitCode).not.toBe(0);
      expect(stderr.length).toBeGreaterThan(0);
      expect(stdout).toBe('');
    });

    it('should write unknown command errors to stderr', async () => {
      const { stderr, exitCode } = await runCli(['nonexistent']);
      expect(exitCode).not.toBe(0);
      expect(stderr.length).toBeGreaterThan(0);
    });

    it('should write unknown option errors to stderr', async () => {
      const { stdout, stderr, exitCode } = await runCli(['search', '--foobar']);
      expect(exitCode).not.toBe(0);
      expect(stderr.length).toBeGreaterThan(0);
      expect(stdout).toBe('');
    });
  });
});

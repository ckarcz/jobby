import { describe, it, expect } from 'vitest';
import { runCli } from './helpers.js';

/**
 * Integration tests that spawn the real CLI process to verify non-query
 * behavioral flags: --format valid choices, --log-level valid choices,
 * --file flag acceptance, --no-color on error output, --debug alongside
 * errors, details missing-URL error path, and exit code consistency.
 */

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[/;

// ---------------------------------------------------------------------------
// details command - missing URL error path
// ---------------------------------------------------------------------------

describe('CLI non-query flags - details missing URL error', () => {
  it('should exit with code 1 when no URL is provided', async () => {
    const { exitCode } = await runCli(['details']);
    expect(exitCode).toBe(1);
  });

  it('should write error to stderr mentioning "url"', async () => {
    const { stderr } = await runCli(['details']);
    expect(stderr.toLowerCase()).toContain('url');
  });

  it('should produce no stdout when URL is missing', async () => {
    const { stdout } = await runCli(['details']);
    expect(stdout).toBe('');
  });

  it('should have no ANSI in stderr with --no-color', async () => {
    const { stderr, exitCode } = await runCli(['details', '--no-color']);
    expect(exitCode).toBe(1);
    expect(stderr).not.toMatch(ANSI_REGEX);
  });

  it('should still exit with code 1 when --debug is also passed', async () => {
    const { exitCode } = await runCli(['details', '--debug']);
    expect(exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// --no-color on error output (not just help)
// ---------------------------------------------------------------------------

describe('CLI non-query flags - --no-color on error output', () => {
  it('should suppress ANSI on search validation error with --no-color', async () => {
    const { stderr } = await runCli(['search', '--job-type', 'banana', '--no-color']);
    expect(stderr).not.toMatch(ANSI_REGEX);
  });

  it('should suppress ANSI on search validation error with NO_COLOR=1', async () => {
    const { stderr } = await runCli(
      ['search', '--job-type', 'banana'],
      { env: { NO_COLOR: '1' } },
    );
    expect(stderr).not.toMatch(ANSI_REGEX);
  });

  it('should suppress ANSI on details missing-URL error with --no-color', async () => {
    const { stderr } = await runCli(['details', '--no-color']);
    expect(stderr).not.toMatch(ANSI_REGEX);
  });
});

// ---------------------------------------------------------------------------
// --file flag acceptance
// ---------------------------------------------------------------------------

describe('CLI non-query flags - --file flag acceptance', () => {
  it('should show --file in search --help', async () => {
    const { stdout, exitCode } = await runCli(['search', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--file');
  });

  it('should show --file in details --help', async () => {
    const { stdout, exitCode } = await runCli(['details', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--file');
  });
});

// ---------------------------------------------------------------------------
// --format valid choices acceptance
// ---------------------------------------------------------------------------

describe('CLI non-query flags - --format valid choices acceptance', () => {
  const outputFormats = ['json', 'xml', 'yaml', 'csv', 'rawHtml'];

  describe('search command', () => {
    for (const format of outputFormats) {
      it(`should accept --format ${format} without error`, async () => {
        const { exitCode } = await runCli(['search', '--format', format, '--help']);
        expect(exitCode).toBe(0);
      });
    }
  });

  describe('details command', () => {
    for (const format of outputFormats) {
      it(`should accept --format ${format} without error`, async () => {
        const { exitCode } = await runCli(['details', '--format', format, '--help']);
        expect(exitCode).toBe(0);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// --log-level valid choices acceptance
// ---------------------------------------------------------------------------

describe('CLI non-query flags - --log-level valid choices acceptance', () => {
  const logLevels = ['silent', 'error', 'warn', 'info', 'verbose', 'debug'];

  describe('search command', () => {
    for (const level of logLevels) {
      it(`should accept --log-level ${level} without error`, async () => {
        const { exitCode } = await runCli(['search', '--log-level', level, '--help']);
        expect(exitCode).toBe(0);
      });
    }
  });

  describe('details command', () => {
    for (const level of logLevels) {
      it(`should accept --log-level ${level} without error`, async () => {
        const { exitCode } = await runCli(['details', '--log-level', level, '--help']);
        expect(exitCode).toBe(0);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Exit code consistency
// ---------------------------------------------------------------------------

describe('CLI non-query flags - exit code consistency', () => {
  it('should exit 0 for root --help', async () => {
    const { exitCode } = await runCli(['--help']);
    expect(exitCode).toBe(0);
  });

  it('should exit 0 for root --version', async () => {
    const { exitCode } = await runCli(['--version']);
    expect(exitCode).toBe(0);
  });

  it('should exit 0 for search --help', async () => {
    const { exitCode } = await runCli(['search', '--help']);
    expect(exitCode).toBe(0);
  });

  it('should exit 0 for details --help', async () => {
    const { exitCode } = await runCli(['details', '--help']);
    expect(exitCode).toBe(0);
  });

  it('should exit non-0 for invalid choice argument', async () => {
    const { exitCode } = await runCli(['search', '--format', 'invalid']);
    expect(exitCode).not.toBe(0);
  });

  it('should exit 1 for details missing URL', async () => {
    const { exitCode } = await runCli(['details']);
    expect(exitCode).toBe(1);
  });
});

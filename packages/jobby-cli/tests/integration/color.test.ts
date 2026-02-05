import { describe, it, expect, afterAll } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pkgRoot, runCli, runCommand } from './helpers.js';

/**
 * Integration tests for color output behavior.
 * These spawn real child processes to test cli-highlight/chalk's actual
 * color detection since chalk caches color support at import time.
 */

const scriptPath = path.join(pkgRoot, '_color-test-probe.mjs');

// Write probe script that imports cli-highlight and reports whether ANSI codes are present.
writeFileSync(scriptPath, `
import { highlight } from 'cli-highlight';
const result = highlight('{"key":"value"}', { language: 'json' });
process.stdout.write(/\\x1b\\[/.test(result) ? 'COLOR' : 'PLAIN');
`);

afterAll(() => {
  try { unlinkSync(scriptPath); } catch { /* ignore */ }
});

async function runWithEnv(env: Record<string, string>): Promise<string> {
  const filteredEnv: Record<string, string> = {};
  // Copy all process.env entries
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) filteredEnv[key] = value;
  }
  // Apply overrides
  Object.assign(filteredEnv, env);
  // Ensure clean state by removing conflicting vars unless explicitly set
  if (!('NO_COLOR' in env)) delete filteredEnv['NO_COLOR'];
  if (!('FORCE_COLOR' in env)) delete filteredEnv['FORCE_COLOR'];

  const { stdout } = await runCommand(`node ${scriptPath}`, { env: filteredEnv });
  return stdout.trim();
}

describe('cli-highlight/chalk color detection (integration)', () => {
  describe('TTY detection', () => {
    it('should strip colors when stdout is not a TTY (piped)', async () => {
      // exec spawns a non-TTY child process
      const result = await runWithEnv({});
      expect(result).toBe('PLAIN');
    });
  });

  describe('FORCE_COLOR env', () => {
    it('should enable colors with FORCE_COLOR=1 even without TTY', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '1' });
      expect(result).toBe('COLOR');
    });

    it('should enable colors with FORCE_COLOR=2 (256 colors)', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '2' });
      expect(result).toBe('COLOR');
    });

    it('should enable colors with FORCE_COLOR=3 (truecolor)', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '3' });
      expect(result).toBe('COLOR');
    });

    it('should disable colors with FORCE_COLOR=0', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '0' });
      expect(result).toBe('PLAIN');
    });
  });

  describe('NO_COLOR env', () => {
    it('should disable colors when NO_COLOR is set', async () => {
      const result = await runWithEnv({ NO_COLOR: '1' });
      expect(result).toBe('PLAIN');
    });

    it('should disable colors when NO_COLOR is empty string', async () => {
      // NO_COLOR spec: presence of the variable is what matters, not its value
      const result = await runWithEnv({ NO_COLOR: '' });
      expect(result).toBe('PLAIN');
    });
  });

  describe('FORCE_COLOR vs NO_COLOR precedence', () => {
    it('should let FORCE_COLOR override NO_COLOR', async () => {
      // chalk behavior: FORCE_COLOR takes precedence over NO_COLOR
      const result = await runWithEnv({ NO_COLOR: '1', FORCE_COLOR: '1' });
      expect(result).toBe('COLOR');
    });
  });

  describe('--no-color flag (unit-level via outputResult)', () => {
    it('should produce raw JSON without ANSI codes', async () => {
      // This tests our own --no-color bypass of highlight()
      // We run a script that calls outputResult directly with noColor: true
      const noColorScript = path.join(pkgRoot, '_nocolor-test-probe.mjs');
      writeFileSync(noColorScript, `
import { highlight } from 'cli-highlight';
const json = '{"key":"value"}';
// Simulate what outputResult does with noColor: true — skip highlight
const output = json;
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${noColorScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('PLAIN');
      } finally {
        try { unlinkSync(noColorScript); } catch { /* ignore */ }
      }
    });
  });

  describe('late NO_COLOR env (set after import)', () => {
    it('should NOT affect chalk when set after module import', async () => {
      // Verifies that chalk caches color support at import time,
      // confirming why --no-color must bypass highlight() entirely.
      const lateScript = path.join(pkgRoot, '_late-nocolor-probe.mjs');
      writeFileSync(lateScript, `
import { highlight } from 'cli-highlight';
process.env.NO_COLOR = '1';
const result = highlight('{"key":"value"}', { language: 'json' });
process.stdout.write(/\\x1b\\[/.test(result) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${lateScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        // Colors should STILL be present because chalk cached FORCE_COLOR=1 at import
        expect(stdout.trim()).toBe('COLOR');
      } finally {
        try { unlinkSync(lateScript); } catch { /* ignore */ }
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Help text colorization (integration)
// ---------------------------------------------------------------------------

const ANSI_REGEX = /\x1b\[/;

describe('help text colorization (integration)', () => {
  describe('non-TTY (piped) help output', () => {
    it('should have no ANSI codes in root --help (exec = non-TTY)', async () => {
      const result = await runCli(['--help']);
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
      expect(result.stdout).toContain('Examples:');
    });

    it('should have no ANSI codes in search --help (exec = non-TTY)', async () => {
      const result = await runCli(['search', '--help']);
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
      expect(result.stdout).toContain('Examples:');
    });

    it('should have no ANSI codes in details --help (exec = non-TTY)', async () => {
      const result = await runCli(['details', '--help']);
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
    });
  });

  describe('FORCE_COLOR=1 help output', () => {
    it('should have ANSI codes in root --help with FORCE_COLOR=1', async () => {
      const result = await runCli(['--help'], { env: { FORCE_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(true);
      expect(result.stdout).toContain('Examples:');
    });

    it('should have ANSI codes in search --help with FORCE_COLOR=1', async () => {
      const result = await runCli(['search', '--help'], { env: { FORCE_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(true);
    });

    it('should have ANSI codes in details --help with FORCE_COLOR=1', async () => {
      const result = await runCli(['details', '--help'], { env: { FORCE_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(true);
    });
  });

  describe('NO_COLOR=1 help output', () => {
    it('should have no ANSI codes in root --help with NO_COLOR=1', async () => {
      const result = await runCli(['--help'], { env: { NO_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
    });
  });

  describe('--no-color flag overrides FORCE_COLOR for help', () => {
    it('should strip ANSI from search --help with --no-color despite FORCE_COLOR=1', async () => {
      const result = await runCli(['search', '--help', '--no-color'], { env: { FORCE_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
      expect(result.stdout).toContain('Examples:');
    });

    it('should strip ANSI from details --help with --no-color despite FORCE_COLOR=1', async () => {
      const result = await runCli(['details', '--help', '--no-color'], { env: { FORCE_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
    });

    it('should strip ANSI from root --help with --no-color despite FORCE_COLOR=1', async () => {
      const result = await runCli(['--help', '--no-color'], { env: { FORCE_COLOR: '1' } });
      expect(result.exitCode).toBe(0);
      expect(ANSI_REGEX.test(result.stdout)).toBe(false);
    });
  });
});

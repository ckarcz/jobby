import { describe, it, expect } from 'vitest';
import { runCli } from './helpers.js';

/**
 * Integration tests that spawn the real CLI process to verify argument
 * validation: invalid choices, numeric parsing errors, and unknown
 * option rejection for both search and details commands.
 */

describe('CLI argument validation - search command', () => {
  describe('search --job-type choice validation', () => {
    it('should reject invalid --job-type value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--job-type', 'banana']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('banana');
    });

    it('should mention allowed choices in the error message', async () => {
      const { stderr } = await runCli(['search', '--job-type', 'invalid']);
      expect(stderr).toContain('full-time');
    });
  });

  describe('search --experience-level choice validation', () => {
    it('should reject invalid --experience-level value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--experience-level', 'wizard']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('wizard');
    });

    it('should mention allowed choices in the error message', async () => {
      const { stderr } = await runCli(['search', '--experience-level', 'invalid']);
      expect(stderr).toContain('senior');
    });
  });

  describe('search --minimum-salary choice validation', () => {
    it('should reject an unformatted salary number', async () => {
      const { stderr, exitCode } = await runCli(['search', '--minimum-salary', '50000']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('50000');
    });

    it('should mention allowed choices in the error message', async () => {
      const { stderr } = await runCli(['search', '--minimum-salary', 'invalid']);
      expect(stderr).toContain('100,000');
    });
  });

  describe('search --workplace-type choice validation', () => {
    it('should reject invalid --workplace-type value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--workplace-type', 'anywhere']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('anywhere');
    });

    it('should mention allowed choices in the error message', async () => {
      const { stderr } = await runCli(['search', '--workplace-type', 'invalid']);
      expect(stderr).toContain('remote');
    });
  });

  describe('search --listing-age choice validation', () => {
    it('should reject invalid --listing-age value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--listing-age', 'past-year']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('past-year');
    });

    it('should mention allowed choices in the error message', async () => {
      const { stderr } = await runCli(['search', '--listing-age', 'invalid']);
      expect(stderr).toContain('past-week');
    });
  });

  describe('search --format choice validation', () => {
    it('should reject invalid --format value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--format', 'invalid']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('invalid');
    });
  });

  describe('search --log-level choice validation', () => {
    it('should reject invalid --log-level value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--log-level', 'trace']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('trace');
    });
  });

  describe('search pagination option validation', () => {
    it('should reject non-numeric --start value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--start', 'abc']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('Invalid number');
    });

    it('should reject non-numeric --skip value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--skip', 'xyz']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('Invalid number');
    });

    it('should reject non-numeric --take value', async () => {
      const { stderr, exitCode } = await runCli(['search', '--take', 'nope']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('Invalid number');
    });
  });

  describe('search unknown option rejection', () => {
    it('should reject unknown options with error', async () => {
      const { stderr, exitCode } = await runCli(['search', '--nonexistent-flag']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('nonexistent-flag');
    });
  });
});

describe('CLI argument validation - details command', () => {
  describe('details --format choice validation', () => {
    it('should reject invalid --format value', async () => {
      const { stderr, exitCode } = await runCli(['details', '--format', 'invalid']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('invalid');
    });
  });

  describe('details --log-level choice validation', () => {
    it('should reject invalid --log-level value', async () => {
      const { stderr, exitCode } = await runCli(['details', '--log-level', 'trace']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('trace');
    });
  });

  describe('details unknown option rejection', () => {
    it('should reject unknown options with error', async () => {
      const { stderr, exitCode } = await runCli(['details', '--nonexistent-flag']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('nonexistent-flag');
    });
  });
});

describe('CLI argument validation - root program', () => {
  describe('unknown command rejection', () => {
    it('should reject unknown commands', async () => {
      const { stderr, exitCode } = await runCli(['nonexistent']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('nonexistent');
    });
  });
});

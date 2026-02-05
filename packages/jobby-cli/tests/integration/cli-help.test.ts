import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { runCli } from './helpers.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

/**
 * Integration tests that spawn the real CLI process to verify --help
 * and --version output for the root program, search command, and
 * details command.
 */

describe('CLI help output - root program', () => {
  describe('--help flag', () => {
    it('should exit with code 0', async () => {
      const { exitCode } = await runCli(['--help']);
      expect(exitCode).toBe(0);
    });

    it('should display the program name', async () => {
      const { stdout } = await runCli(['--help']);
      expect(stdout).toContain('jobby');
    });

    it('should list the search and details subcommands', async () => {
      const { stdout } = await runCli(['--help']);
      expect(stdout).toContain('search');
      expect(stdout).toContain('details');
    });

    it('should show examples section', async () => {
      const { stdout } = await runCli(['--help']);
      expect(stdout).toContain('Examples');
    });

    it('should show Usage, Commands, and Options sections', async () => {
      const { stdout } = await runCli(['--help']);
      expect(stdout).toContain('Usage');
      expect(stdout).toContain('Commands');
      expect(stdout).toContain('Options');
    });
  });

  describe('--version flag', () => {
    it('should exit with code 0', async () => {
      const { exitCode } = await runCli(['--version']);
      expect(exitCode).toBe(0);
    });

    it('should output the version from package.json', async () => {
      const { stdout } = await runCli(['--version']);
      expect(stdout.trim()).toBe(packageJson.version);
    });
  });
});

describe('CLI help output - search command', () => {
  describe('search --help flag', () => {
    it('should exit with code 0', async () => {
      const { exitCode } = await runCli(['search', '--help']);
      expect(exitCode).toBe(0);
    });

    it('should show the search command description', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('search for jobs');
    });

    it('should list all search query options', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('--keyword');
      expect(stdout).toContain('--location');
      expect(stdout).toContain('--job-type');
      expect(stdout).toContain('--experience-level');
      expect(stdout).toContain('--minimum-salary');
      expect(stdout).toContain('--workplace-type');
      expect(stdout).toContain('--listing-age');
    });

    it('should list boolean filter options', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('--easy-apply-only');
      expect(stdout).toContain('--under-10-applicants');
    });

    it('should list pagination options', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('--start');
      expect(stdout).toContain('--skip');
      expect(stdout).toContain('--take');
    });

    it('should list output and logging options', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('--format');
      expect(stdout).toContain('--pretty');
      expect(stdout).toContain('--no-color');
      expect(stdout).toContain('--log-level');
      expect(stdout).toContain('--debug');
    });

    it('should show examples section', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('Examples');
    });

    it('should show choice values for --job-type', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('full-time');
    });

    it('should show default values for --format and --log-level', async () => {
      const { stdout } = await runCli(['search', '--help']);
      expect(stdout).toContain('"json"');
      expect(stdout).toContain('"silent"');
    });
  });
});

describe('CLI help output - details command', () => {
  describe('details --help flag', () => {
    it('should exit with code 0', async () => {
      const { exitCode } = await runCli(['details', '--help']);
      expect(exitCode).toBe(0);
    });

    it('should show the details command description', async () => {
      const { stdout } = await runCli(['details', '--help']);
      expect(stdout).toContain('get detailed information');
    });

    it('should show the [url] argument', async () => {
      const { stdout } = await runCli(['details', '--help']);
      expect(stdout).toContain('[url]');
    });

    it('should list output and logging options', async () => {
      const { stdout } = await runCli(['details', '--help']);
      expect(stdout).toContain('--format');
      expect(stdout).toContain('--pretty');
      expect(stdout).toContain('--no-color');
      expect(stdout).toContain('--log-level');
      expect(stdout).toContain('--debug');
    });

    it('should show examples section', async () => {
      const { stdout } = await runCli(['details', '--help']);
      expect(stdout).toContain('Examples');
    });
  });
});

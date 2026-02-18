import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createJobbyMock } from './utils/test-helpers.js';

vi.mock('cli-highlight', () => ({
  highlight: (str: string) => `\x1b[highlighted]${str}\x1b[/highlighted]`,
}));

vi.mock('jobby-client', () => createJobbyMock());

import { JobbyClient } from 'jobby-client';
import { main } from './main.js';

const MockedJobbyClient = vi.mocked(JobbyClient);

/**
 * Tests for the main CLI entrypoint focusing on error handling behavior:
 * LinkedIn API errors with actionable hints, debug mode stack traces,
 * unexpected error fallback, and signal handler registration.
 */

describe('main - CLI entrypoint error handling', () => {
  let mockProcessExit: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let originalArgv: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    originalArgv = process.argv;
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    mockProcessExit.mockRestore();
    mockConsoleError.mockRestore();
    process.argv = originalArgv;
  });

  describe('LinkedIn API error handling', () => {
    it('should exit with code 1 for JobbyError', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      const { JobbyError } = await import('jobby-client');
      const error = new (JobbyError as any)('E_RATE_LIMIT', 'Rate limit reached');
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error'));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should show retry hint for RateLimitError with retryAfter', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      const { RateLimitError } = await import('jobby-client');
      const error = new (RateLimitError as any)('Rate limit reached', 30);
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Try again in 30 seconds'));
    });

    it('should show connection hint for NetworkError', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      const { NetworkError } = await import('jobby-client');
      const error = new (NetworkError as any)('Connection failed');
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Check your internet connection'));
    });

    it('should show arguments hint for ValidationError', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      const { ValidationError } = await import('jobby-client');
      const error = new (ValidationError as any)('Invalid parameter');
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Check your arguments'));
    });

    it('should show page structure hint for ParsingError', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      const { ParsingError } = await import('jobby-client');
      const error = new (ParsingError as any)('Parse failed');
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('LinkedIn may have changed their page structure'));
    });
  });

  describe('debug mode stack trace output', () => {
    it('should show stack traces when --debug flag is set', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test', '--debug'];

      const { NetworkError } = await import('jobby-client');
      const error = new (NetworkError as any)('Connection failed');
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      const allCalls = mockConsoleError.mock.calls.map(call => String(call[0]));
      expect(allCalls.some(c => c.includes('Stack trace') || c.includes('\nStack trace'))).toBe(true);
    });

    it('should show original error when JobbyError has originalError in debug mode', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test', '--debug'];

      const { JobbyError } = await import('jobby-client');
      const origErr = new Error('underlying cause');
      const error = new (JobbyError as any)('E_NETWORK', 'Wrapper error', { originalError: origErr });
      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(error),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      const allCalls = mockConsoleError.mock.calls.flat().map(String);
      expect(allCalls.some(c => c.includes('Original error'))).toBe(true);
    });
  });

  describe('unexpected error handling', () => {
    it('should log unexpected errors and exit with code 1', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(new Error('Unexpected failure')),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should show stack trace for unexpected errors when --debug is set', async () => {
      process.argv = ['node', 'main', 'search', '--keyword', 'test', '--debug'];

      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockRejectedValue(new Error('Debug failure')),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);

      await main();

      const allCalls = mockConsoleError.mock.calls.map(call => String(call[0]));
      expect(allCalls.some(c => c.includes('Stack trace'))).toBe(true);
    });
  });

  describe('commander error code handling', () => {
    it('should exit with code 0 for commander.helpDisplayed', async () => {
      process.argv = ['node', 'main', 'search', '--help'];

      await main();

      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should exit with code 0 for commander.version', async () => {
      process.argv = ['node', 'main', '--version'];

      await main();

      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should exit with code 1 for other commander errors', async () => {
      process.argv = ['node', 'main', 'search', '--job-type', 'invalid'];

      await main();

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('signal handler registration', () => {
    it('should register SIGINT and SIGTERM handlers', async () => {
      const onSpy = vi.spyOn(process, 'on');
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockResolvedValue(null),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);
      vi.spyOn(console, 'log').mockImplementation(() => { });

      await main();

      expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

      onSpy.mockRestore();
    });
  });

  describe('unhandledRejection and uncaughtException handler registration', () => {
    it('should register unhandledRejection and uncaughtException handlers', async () => {
      const onSpy = vi.spyOn(process, 'on');
      process.argv = ['node', 'main', 'search', '--keyword', 'test'];

      MockedJobbyClient.mockImplementation(() => ({
        jobs: {
          queryForJobs: vi.fn().mockResolvedValue(null),
          queryForJobDetailsByUrl: vi.fn(),
          queryForJobDetailsById: vi.fn(),
        },
      }) as any);
      vi.spyOn(console, 'log').mockImplementation(() => { });

      await main();

      expect(onSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));

      onSpy.mockRestore();
    });
  });
});

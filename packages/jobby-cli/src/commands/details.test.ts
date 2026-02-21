import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createJobbyMock } from '../utils/test-helpers.js';
import { registerDefaultFormatters } from '../formatters/index.js';

beforeAll(() => {
  registerDefaultFormatters();
});

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}));

vi.mock('cli-highlight', () => ({
  highlight: (str: string) => `\x1b[highlighted]${str}\x1b[/highlighted]`,
}));

vi.mock('jobby-client', () => createJobbyMock());

import { writeFile } from 'node:fs/promises';

import { JobbyClient } from 'jobby-client';
import { queryForJobDetails } from './details.js';

const MockedJobbyClient = vi.mocked(JobbyClient);

/**
 * Tests for the details command handler that fetches a single job posting
 * by URL or ID and formats the output with optional syntax highlighting,
 * pretty-printing, and configurable logging.
 */

describe('queryForJobDetails - details command handler', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockClientInstance: {
    jobs: {
      queryForJobs: ReturnType<typeof vi.fn>;
      queryForJobDetailsByUrl: ReturnType<typeof vi.fn>;
      queryForJobDetailsById: ReturnType<typeof vi.fn>;
      queryForJobsRawHtml: ReturnType<typeof vi.fn>;
      queryForJobDetailsRawHtmlByUrl: ReturnType<typeof vi.fn>;
      queryForJobDetailsRawHtmlById: ReturnType<typeof vi.fn>;
    };
  };
  const testUrl = 'https://linkedin.com/jobs/view/123';
  const testId = '123456';

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });

    mockClientInstance = {
      jobs: {
        queryForJobs: vi.fn(),
        queryForJobDetailsByUrl: vi.fn().mockResolvedValue({
          summary: { position: 'Software Engineer', company: { name: 'Test Corp' } },
          details: {},
        }),
        queryForJobDetailsById: vi.fn().mockResolvedValue({
          summary: { position: 'Software Engineer', company: { name: 'Test Corp' } },
          details: {},
        }),
        queryForJobsRawHtml: vi.fn(),
        queryForJobDetailsRawHtmlByUrl: vi.fn().mockResolvedValue('<html><body>Job Details HTML</body></html>'),
        queryForJobDetailsRawHtmlById: vi.fn().mockResolvedValue('<html><body>Job Details HTML</body></html>'),
      },
    };
    MockedJobbyClient.mockImplementation(() => mockClientInstance as unknown as InstanceType<typeof JobbyClient>);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('URL-based lookups', () => {
    it('should call queryForJobDetailsByUrl when given a URL', async () => {
      await queryForJobDetails(testUrl, {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalledWith(testUrl);
      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });

    it('should call queryForJobDetailsByUrl when --url flag is set', async () => {
      await queryForJobDetails(testId, { url: testUrl });
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalledWith(testUrl);
      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });

    it('should accept any URL string', async () => {
      const customUrl = 'https://www.linkedin.com/jobs/view/999999999';
      await queryForJobDetails(customUrl, {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalledWith(customUrl);
    });
  });

  describe('ID-based lookups', () => {
    it('should call queryForJobDetailsById when given a non-URL value', async () => {
      await queryForJobDetails(testId, {});
      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalledWith(testId);
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).not.toHaveBeenCalled();
    });

    it('should call queryForJobDetailsById when --id flag is set', async () => {
      await queryForJobDetails(testUrl, { id: testId });
      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalledWith(testId);
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).not.toHaveBeenCalled();
    });
  });

  describe('auto-detection logic', () => {
    it('should detect value with :// as a URL', async () => {
      await queryForJobDetails('https://example.com/jobs/view/123', {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalled();
    });

    it('should detect value starting with http as a URL', async () => {
      await queryForJobDetails('http://linkedin.com/jobs/view/123', {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalled();
    });

    it('should detect ftp:// as a URL', async () => {
      await queryForJobDetails('ftp://files.example.com/job/123', {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalled();
    });

    it('should detect https:// as a URL', async () => {
      await queryForJobDetails('https://www.linkedin.com/jobs/view/456', {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalled();
    });

    it('should NOT detect plain numbers as a URL', async () => {
      await queryForJobDetails('9876543210', {});
      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalled();
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).not.toHaveBeenCalled();
    });

    it('should detect numeric value as an ID', async () => {
      await queryForJobDetails('4368607271', {});
      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalled();
    });

    it('should let --url flag override positional argument', async () => {
      await queryForJobDetails('ignored', { url: testUrl });
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalledWith(testUrl);
    });

    it('should let --id flag override positional argument', async () => {
      await queryForJobDetails('https://ignored.com', { id: testId });
      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalledWith(testId);
    });

    it('should auto-detect URL from positional argument', async () => {
      await queryForJobDetails('https://linkedin.com/jobs/view/789', {});
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalledWith('https://linkedin.com/jobs/view/789');
      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });
  });

  describe('output formatting', () => {
    it('should output compact JSON by default', async () => {
      await queryForJobDetails(testUrl, {});
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\n  ');
    });

    it('should output pretty-printed JSON when --pretty is set', async () => {
      await queryForJobDetails(testUrl, { pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\n');
    });

    it('should apply syntax highlighting by default', async () => {
      await queryForJobDetails(testUrl, {});
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\x1b[highlighted]');
    });

    it('should skip syntax highlighting when --no-color is set', async () => {
      await queryForJobDetails(testUrl, { color: false });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\x1b[highlighted]');
    });

    it('should output null when response is null', async () => {
      mockClientInstance.jobs.queryForJobDetailsByUrl.mockResolvedValue(null);
      await queryForJobDetails(testUrl, { color: false });
      expect(consoleSpy).toHaveBeenCalledWith('null');
    });
  });

  describe('html output mode', () => {
    it('should call queryForJobDetailsRawHtmlByUrl when --format rawHtml with URL', async () => {
      await queryForJobDetails(testUrl, { format: 'rawHtml' });

      expect(mockClientInstance.jobs.queryForJobDetailsRawHtmlByUrl).toHaveBeenCalledWith(testUrl);
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).not.toHaveBeenCalled();
    });

    it('should call queryForJobDetailsRawHtmlById when --format rawHtml with ID', async () => {
      await queryForJobDetails(testId, { format: 'rawHtml' });

      expect(mockClientInstance.jobs.queryForJobDetailsRawHtmlById).toHaveBeenCalledWith(testId);
      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });

    it('should output compact HTML by default (no --pretty)', async () => {
      mockClientInstance.jobs.queryForJobDetailsRawHtmlByUrl.mockResolvedValue(
        '<div>  <p>  hello  </p>  <!-- comment -->  </div>'
      );
      await queryForJobDetails(testUrl, { format: 'rawHtml', color: false });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toBe('<div><p>hello</p></div>');
    });

    it('should output pretty-printed HTML when --pretty is set', async () => {
      mockClientInstance.jobs.queryForJobDetailsRawHtmlByUrl.mockResolvedValue(
        '<div><p>hello</p></div>'
      );
      await queryForJobDetails(testUrl, { format: 'rawHtml', pretty: true, color: false });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\n');
      expect(output).toContain('  <p>');
    });

    it('should output empty string when html response is empty', async () => {
      mockClientInstance.jobs.queryForJobDetailsRawHtmlByUrl.mockResolvedValue('');
      await queryForJobDetails(testUrl, { format: 'rawHtml' });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('file output (--file)', () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
    });

    afterEach(() => {
      infoSpy.mockRestore();
      vi.mocked(writeFile).mockClear();
    });

    it('should write to file when --file is set', async () => {
      await queryForJobDetails(testUrl, { file: 'details.json' });
      expect(writeFile).toHaveBeenCalledWith('details.json', expect.any(String), 'utf-8');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should write HTML to file when --file and --format rawHtml are set', async () => {
      await queryForJobDetails(testUrl, { format: 'rawHtml', file: 'details.html' });
      expect(writeFile).toHaveBeenCalledWith('details.html', expect.stringContaining('<html>'), 'utf-8');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('--url and --id precedence', () => {
    it('should use url when both --url and --id are set', async () => {
      await queryForJobDetails('ignored', { url: testUrl, id: testId });
      expect(mockClientInstance.jobs.queryForJobDetailsByUrl).toHaveBeenCalledWith(testUrl);
      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });
  });

  describe('rawHtml format with URL and ID', () => {
    it('should call queryForJobDetailsRawHtmlByUrl when --format rawHtml and URL is provided', async () => {
      await queryForJobDetails(testUrl, { format: 'rawHtml', color: false });
      expect(mockClientInstance.jobs.queryForJobDetailsRawHtmlByUrl).toHaveBeenCalledWith(testUrl);
      expect(mockClientInstance.jobs.queryForJobDetailsRawHtmlById).not.toHaveBeenCalled();
    });

    it('should call queryForJobDetailsRawHtmlById when --format rawHtml and ID is provided', async () => {
      await queryForJobDetails(testId, { format: 'rawHtml', color: false });
      expect(mockClientInstance.jobs.queryForJobDetailsRawHtmlById).toHaveBeenCalledWith(testId);
      expect(mockClientInstance.jobs.queryForJobDetailsRawHtmlByUrl).not.toHaveBeenCalled();
    });
  });

  describe('new detail fields pass-through', () => {
    it('should include benefitsInfo and incentiveInfo in JSON output', async () => {
      mockClientInstance.jobs.queryForJobDetailsByUrl.mockResolvedValue({
        id: '123',
        url: 'https://www.linkedin.com/jobs/view/123',
        summary: { position: 'Engineer', location: 'NYC', company: { name: 'Co', slug: undefined, pageUrl: undefined, logoUrl: undefined }, salary: undefined, highlight: undefined, isNew: undefined, easyApply: undefined },
        posted: { date: undefined, ago: undefined },
        details: {
          description: 'A job', salary: undefined, location: 'NYC',
          workplaceType: 'Remote', employmentType: 'Full-time', seniorityLevel: 'Senior',
          applicants: '50', industry: 'Tech', jobFunction: 'Engineering',
          experienceRequired: undefined, educationRequired: undefined,
          applyUrl: undefined, applyText: undefined, shortDescription: undefined,
          sharingImageUrl: undefined,
          benefitsInfo: 'Benefits Eligible: Yes',
          incentiveInfo: 'Bonus Eligible: Yes',
        },
      });

      await queryForJobDetails(testUrl, { color: false });
      const output = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.details.benefitsInfo).toBe('Benefits Eligible: Yes');
      expect(parsed.details.incentiveInfo).toBe('Bonus Eligible: Yes');
    });

    it('should omit undefined benefitsInfo and incentiveInfo from JSON output', async () => {
      mockClientInstance.jobs.queryForJobDetailsByUrl.mockResolvedValue({
        id: '123',
        url: 'https://www.linkedin.com/jobs/view/123',
        summary: { position: 'Engineer', location: 'NYC', company: { name: 'Co', slug: undefined, pageUrl: undefined, logoUrl: undefined }, salary: undefined, highlight: undefined, isNew: undefined, easyApply: undefined },
        posted: { date: undefined, ago: undefined },
        details: {
          description: 'A job', salary: undefined, location: 'NYC',
          workplaceType: undefined, employmentType: undefined, seniorityLevel: undefined,
          applicants: undefined, industry: undefined, jobFunction: undefined,
          experienceRequired: undefined, educationRequired: undefined,
          applyUrl: undefined, applyText: undefined, shortDescription: undefined,
          sharingImageUrl: undefined, benefitsInfo: undefined, incentiveInfo: undefined,
        },
      });

      await queryForJobDetails(testUrl, { color: false, pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(output);
      // JSON.stringify omits undefined values, so these keys should not be present
      expect(parsed.details.benefitsInfo).toBeUndefined();
      expect(parsed.details.incentiveInfo).toBeUndefined();
    });
  });

  describe('logging configuration', () => {
    it('should use "silent" log level by default', async () => {
      await queryForJobDetails(testUrl, {});
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'silent' } })
      );
    });

    it('should use the specified --log-level value', async () => {
      await queryForJobDetails(testUrl, { logLevel: 'info' });
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'info' } })
      );
    });

    it('should use "debug" log level when --debug flag is set', async () => {
      await queryForJobDetails(testUrl, { debug: true });
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'debug' } })
      );
    });

    it('should let --debug override --log-level', async () => {
      await queryForJobDetails(testUrl, { debug: true, logLevel: 'error' });
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'debug' } })
      );
    });
  });
});

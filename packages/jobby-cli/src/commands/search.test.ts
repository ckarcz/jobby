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

import { JobbyClient, ValidationError } from 'jobby-client';
import { queryForJobs } from './search.js';

const MockedJobbyClient = vi.mocked(JobbyClient);

/**
 * Tests for the search command handler that translates CLI options into
 * LinkedIn API calls and formats the output with optional syntax
 * highlighting, pretty-printing, and configurable logging.
 */

describe('queryForJobs - search command handler', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });

    mockClientInstance = {
      jobs: {
        queryForJobs: vi.fn().mockResolvedValue({
          results: [{ title: 'Test Job' }],
          pagination: { start: 0, count: 1 },
        }),
        queryForJobDetailsByUrl: vi.fn(),
        queryForJobDetailsById: vi.fn(),
        queryForJobsRawHtml: vi.fn().mockResolvedValue('<html><body>Raw HTML</body></html>'),
        queryForJobDetailsRawHtmlByUrl: vi.fn(),
        queryForJobDetailsRawHtmlById: vi.fn(),
      },
    };
    MockedJobbyClient.mockImplementation(function () { return mockClientInstance as unknown as InstanceType<typeof JobbyClient>; });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('passing query options to the LinkedIn client', () => {
    it('should pass keyword and location to client query', async () => {
      await queryForJobs({ keyword: 'TypeScript', location: 'NYC' });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'TypeScript', location: 'NYC' }),
        expect.any(Object)
      );
    });

    it('should pass job-type and experience-level filter options', async () => {
      await queryForJobs({
        keyword: 'React',
        jobType: ['full-time'],
        experienceLevel: ['senior'],
      });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({ jobType: ['full-time'], experienceLevel: ['senior'] }),
        expect.any(Object)
      );
    });

    it('should pass multiple values for job-type and experience-level', async () => {
      await queryForJobs({
        keyword: 'React',
        jobType: ['full-time', 'contract'],
        experienceLevel: ['senior', 'director'],
      });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: ['full-time', 'contract'],
          experienceLevel: ['senior', 'director'],
        }),
        expect.any(Object)
      );
    });

    it('should pass minimum-salary, workplace-type, and listing-age filter options', async () => {
      await queryForJobs({
        minimumSalary: '120,000',
        workplaceType: ['remote'],
        listingAge: 'past-week',
      });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumSalary: '120,000',
          workplaceType: ['remote'],
          listingAge: 'past-week',
        }),
        expect.any(Object)
      );
    });

    it('should pass multiple values for workplace-type', async () => {
      await queryForJobs({
        workplaceType: ['remote', 'hybrid'],
      });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          workplaceType: ['remote', 'hybrid'],
        }),
        expect.any(Object)
      );
    });

    it('should pass geoId filter', async () => {
      await queryForJobs({ geoId: '103644278' });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({ geoId: '103644278' }),
        expect.any(Object)
      );
    });

    it('should pass companyId filter', async () => {
      await queryForJobs({ companyId: '1441' });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: '1441' }),
        expect.any(Object)
      );
    });

    it('should pass all filters together', async () => {
      await queryForJobs({
        keyword: 'Python',
        location: 'San Francisco',
        jobType: ['contract'],
        experienceLevel: ['entry-level'],
        minimumSalary: '80,000',
        workplaceType: ['hybrid'],
        listingAge: 'past-month',
        geoId: '103644278',
        companyId: '1441',
      });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'Python',
          location: 'San Francisco',
          jobType: ['contract'],
          experienceLevel: ['entry-level'],
          minimumSalary: '80,000',
          workplaceType: ['hybrid'],
          listingAge: 'past-month',
          geoId: '103644278',
          companyId: '1441',
        }),
        expect.any(Object)
      );
    });
  });

  describe('passing pagination options to the LinkedIn client', () => {
    it('should pass start, skip, and take pagination options', async () => {
      await queryForJobs({ start: 10, skip: 2, take: 5 });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ start: 10, skip: 2, take: 5 })
      );
    });

    it('should pass zero values for pagination', async () => {
      await queryForJobs({ start: 0, skip: 0, take: 0 });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ start: 0, skip: 0, take: 0 })
      );
    });

    it('should pass undefined pagination when not provided', async () => {
      await queryForJobs({});

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ start: undefined, skip: undefined, take: undefined })
      );
    });
  });

  describe('output formatting', () => {
    it('should output compact JSON by default', async () => {
      await queryForJobs({});
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\n    ');
    });

    it('should output pretty-printed JSON when --pretty is set', async () => {
      await queryForJobs({ pretty: true });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\n');
    });

    it('should apply syntax highlighting by default', async () => {
      await queryForJobs({});
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('\x1b[highlighted]');
    });

    it('should skip syntax highlighting when --no-color is set', async () => {
      await queryForJobs({ color: false });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).not.toContain('\x1b[highlighted]');
    });

    it('should output null when response is null', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue(null);
      await queryForJobs({ color: false });
      expect(consoleSpy).toHaveBeenCalledWith('null');
    });
  });

  describe('html output mode', () => {
    it('should call queryForJobsRawHtml when --format rawHtml is set', async () => {
      await queryForJobs({ format: 'rawHtml' });

      expect(mockClientInstance.jobs.queryForJobsRawHtml).toHaveBeenCalled();
      expect(mockClientInstance.jobs.queryForJobs).not.toHaveBeenCalled();
    });

    it('should output HTML string when --format rawHtml is set', async () => {
      await queryForJobs({ format: 'rawHtml', color: false });
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('<html>');
      expect(output).toContain('Raw HTML');
    });

    it('should output empty string when html response is empty', async () => {
      mockClientInstance.jobs.queryForJobsRawHtml.mockResolvedValue('');
      await queryForJobs({ format: 'rawHtml', color: false });
      expect(consoleSpy).toHaveBeenCalledWith('');
    });

    it('should pass search and pagination params to queryForJobsRawHtml', async () => {
      await queryForJobs({ format: 'rawHtml', keyword: 'Test', start: 5 });

      expect(mockClientInstance.jobs.queryForJobsRawHtml).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'Test' }),
        expect.objectContaining({ start: 5 })
      );
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
      await queryForJobs({ file: 'results.json' });
      expect(writeFile).toHaveBeenCalledWith('results.json', expect.any(String), 'utf-8');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should write HTML to file when --file and --format rawHtml are set', async () => {
      await queryForJobs({ format: 'rawHtml', file: 'results.html' });
      expect(writeFile).toHaveBeenCalledWith('results.html', expect.stringContaining('<html>'), 'utf-8');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('--detailed flag', () => {
    const searchResponse = {
      results: [
        { id: '111', url: 'https://linkedin.com/jobs/view/111', summary: { position: 'Dev', location: 'NYC', company: { name: 'Co1', slug: undefined, pageUrl: undefined, logoUrl: undefined }, salary: undefined, highlight: undefined, isNew: undefined, easyApply: undefined }, posted: { date: undefined, ago: undefined } },
        { id: '222', url: 'https://linkedin.com/jobs/view/222', summary: { position: 'Eng', location: 'LA', company: { name: 'Co2', slug: undefined, pageUrl: undefined, logoUrl: undefined }, salary: undefined, highlight: undefined, isNew: undefined, easyApply: undefined }, posted: { date: undefined, ago: undefined } },
      ],
      pagination: { start: 0, count: 2, responseCount: 2, resultsCount: 2, skip: undefined, take: undefined },
      query: {},
      metadata: { timestamp: new Date(), durationMs: 100, searchUrl: '' },
    };

    const mockJobDetails = {
      id: '111', url: undefined,
      summary: { position: 'Dev', location: undefined, company: { name: 'Co1', slug: undefined, pageUrl: undefined, logoUrl: undefined }, salary: undefined, highlight: undefined, isNew: undefined, easyApply: undefined },
      posted: { date: undefined, ago: undefined },
      details: {
        description: 'Great job', salary: undefined, location: undefined,
        workplaceType: undefined, employmentType: undefined, seniorityLevel: undefined,
        applicants: undefined, industry: undefined, jobFunction: undefined,
        experienceRequired: undefined, educationRequired: undefined,
        applyUrl: undefined, applyText: undefined, shortDescription: undefined,
        sharingImageUrl: undefined, benefitsInfo: undefined, incentiveInfo: undefined,
      },
    };

    it('should fetch details when --detailed is set', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue(searchResponse);
      mockClientInstance.jobs.queryForJobDetailsById.mockResolvedValue(mockJobDetails);

      await queryForJobs({ detailed: true, color: false });

      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalledWith('111');
      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalledWith('222');
      const output = consoleSpy.mock.calls[0]![0] as string;
      expect(output).toContain('"details"');
    });

    it('should NOT fetch details when --detailed is absent', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue(searchResponse);

      await queryForJobs({ color: false });

      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when combined with --format rawHtml', async () => {
      await expect(queryForJobs({ detailed: true, format: 'rawHtml' }))
        .rejects.toThrow(ValidationError);
    });

    it('should handle partial detail failures gracefully', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue(searchResponse);
      mockClientInstance.jobs.queryForJobDetailsById
        .mockResolvedValueOnce(mockJobDetails)
        .mockRejectedValueOnce(new Error('rate limited'));

      await queryForJobs({ detailed: true, color: false });

      const output = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(output) as { results: Array<{ details: unknown }> };
      expect(parsed.results[0]!.details).not.toBeNull();
      expect(parsed.results[1]!.details).toBeNull();
    });

    it('should prefer jobId over jobUrl for detail lookup', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue(searchResponse);
      mockClientInstance.jobs.queryForJobDetailsById.mockResolvedValue(mockJobDetails);

      await queryForJobs({ detailed: true, color: false });

      expect(mockClientInstance.jobs.queryForJobDetailsById).toHaveBeenCalledWith('111');
      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalledWith('https://linkedin.com/jobs/view/111');
    });

    it('should include benefitsInfo and incentiveInfo in detailed output', async () => {
      const detailsWithNewFields = {
        ...mockJobDetails,
        details: {
          ...mockJobDetails.details,
          benefitsInfo: 'Benefits Eligible: Yes',
          incentiveInfo: 'Bonus Eligible: Yes',
        },
      };
      mockClientInstance.jobs.queryForJobs.mockResolvedValue(searchResponse);
      mockClientInstance.jobs.queryForJobDetailsById.mockResolvedValue(detailsWithNewFields);

      await queryForJobs({ detailed: true, color: false });

      const output = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(output) as { results: Array<{ details: Record<string, unknown> }> };
      expect(parsed.results[0]!.details.benefitsInfo).toBe('Benefits Eligible: Yes');
      expect(parsed.results[0]!.details.incentiveInfo).toBe('Bonus Eligible: Yes');
    });

    it('should not fetch details when search returns empty results', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue({
        ...searchResponse,
        results: [],
      });

      await queryForJobs({ detailed: true, color: false });

      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });

  });

  describe('rawHtml edge cases', () => {
    it('should output empty string when rawHtml response is empty string', async () => {
      mockClientInstance.jobs.queryForJobsRawHtml.mockResolvedValue('');
      await queryForJobs({ format: 'rawHtml', color: false });
      expect(consoleSpy).toHaveBeenCalledWith('');
    });
  });

  describe('--detailed with empty results', () => {
    it('should not attempt to fetch details when results are empty', async () => {
      mockClientInstance.jobs.queryForJobs.mockResolvedValue({
        results: [],
        pagination: { start: 0, count: 0 },
      });

      await queryForJobs({ detailed: true, color: false });

      expect(mockClientInstance.jobs.queryForJobDetailsById).not.toHaveBeenCalled();
    });
  });

  describe('passing all search params including geoId and companyId', () => {
    it('should pass geoId and companyId together with other search params', async () => {
      await queryForJobs({
        keyword: 'Engineer',
        location: 'Seattle',
        jobType: ['full-time'],
        experienceLevel: ['senior'],
        minimumSalary: '100,000',
        workplaceType: ['remote'],
        listingAge: 'past-week',
        geoId: '103644278',
        companyId: '1441',
        start: 10,
        skip: 2,
        take: 5,
      });

      expect(mockClientInstance.jobs.queryForJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'Engineer',
          location: 'Seattle',
          jobType: ['full-time'],
          experienceLevel: ['senior'],
          minimumSalary: '100,000',
          workplaceType: ['remote'],
          listingAge: 'past-week',
          geoId: '103644278',
          companyId: '1441',
        }),
        expect.objectContaining({
          start: 10,
          skip: 2,
          take: 5,
        })
      );
    });
  });

  describe('logging configuration', () => {
    it('should use "silent" log level by default', async () => {
      await queryForJobs({});
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'silent' } })
      );
    });

    it('should use the specified --log-level value', async () => {
      await queryForJobs({ logLevel: 'verbose' });
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'verbose' } })
      );
    });

    it('should use "debug" log level when --debug flag is set', async () => {
      await queryForJobs({ debug: true });
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'debug' } })
      );
    });

    it('should let --debug override --log-level', async () => {
      await queryForJobs({ debug: true, logLevel: 'error' });
      expect(MockedJobbyClient).toHaveBeenCalledWith(
        expect.objectContaining({ logging: { level: 'debug' } })
      );
    });
  });
});

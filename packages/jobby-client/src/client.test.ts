import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobbyClient } from './client.js';

// Mock the query modules
vi.mock('./queries/jobs-query.js', () => ({
  executeJobsQuery: vi.fn().mockResolvedValue({
    results: [{ summary: { company: { name: 'Test Corp' }, position: 'Developer' } }],
    pagination: { start: 0, responseCount: 1, resultsCount: 1 },
    metadata: { query: {}, timestamp: new Date(), durationMs: 100 },
  }),
  executeJobsQueryRawHtml: vi.fn().mockResolvedValue('<html><li>Job 1</li></html>'),
}));

vi.mock('./queries/job-details-query.js', () => ({
  executeJobDetailsQueryByUrl: vi.fn().mockResolvedValue({
    summary: { position: 'Senior Developer', company: { name: 'Test Corp' }, location: 'Remote' },
    details: {},
  }),
  executeJobDetailsQueryRawHtmlByUrl: vi.fn().mockResolvedValue('<html><h1>Job Details</h1></html>'),
  executeJobDetailsQueryById: vi.fn().mockResolvedValue({
    summary: { position: 'Senior Developer', company: { name: 'Test Corp' }, location: 'Remote' },
    details: {},
  }),
  executeJobDetailsQueryRawHtmlById: vi.fn().mockResolvedValue('<html><h1>Job Details</h1></html>'),
}));

/**
 * Tests for the JobbyClient class that provides the main public API,
 * delegating job search and job detail queries to the underlying query functions
 * and exposing a fluent builder via createSearch.
 */

describe('JobbyClient - public API and query delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client without config', () => {
      const client = new JobbyClient();
      expect(client).toBeInstanceOf(JobbyClient);
      expect(client.jobs).toBeDefined();
    });

    it('should create client with config', () => {
      const client = new JobbyClient({ timeout: 5_000 });
      expect(client).toBeInstanceOf(JobbyClient);
    });
  });

  describe('getConfig', () => {
    it('should return resolved HTTP config with defaults when no config provided', () => {
      const client = new JobbyClient();
      const config = client.getConfig();
      expect(config.baseUrl).toBe('www.linkedin.com');
      expect(config.timeout).toBe(10_000);
      expect(config).not.toHaveProperty('logger');
      expect(config).not.toHaveProperty('retry');
    });

    it('should return resolved HTTP config with overrides when provided', () => {
      const client = new JobbyClient({ timeout: 5000 });
      const config = client.getConfig();
      expect(config.timeout).toBe(5000);
      expect(config.baseUrl).toBe('www.linkedin.com');
    });
  });

  describe('jobs resource', () => {
    describe('queryForJobs', () => {
      it('should call executeJobsQuery with search params', async () => {
        const { executeJobsQuery } = await import('./queries/jobs-query.js');
        const client = new JobbyClient();

        const result = await client.jobs.queryForJobs({ keyword: 'TypeScript' });

        expect(executeJobsQuery).toHaveBeenCalledWith(
          { keyword: 'TypeScript' },
          undefined,
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
        expect(result.results).toHaveLength(1);
      });

      it('should call executeJobsQuery with pagination params', async () => {
        const { executeJobsQuery } = await import('./queries/jobs-query.js');
        const client = new JobbyClient();

        await client.jobs.queryForJobs(
          { keyword: 'React' },
          { start: 25, take: 10 }
        );

        expect(executeJobsQuery).toHaveBeenCalledWith(
          { keyword: 'React' },
          { start: 25, take: 10 },
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
      });

      it('should pass resolved config to query', async () => {
        const { executeJobsQuery } = await import('./queries/jobs-query.js');
        const client = new JobbyClient({ timeout: 15000 });

        await client.jobs.queryForJobs({ keyword: 'Python' });

        expect(executeJobsQuery).toHaveBeenCalledWith(
          { keyword: 'Python' },
          undefined,
          expect.objectContaining({ timeout: 15000, baseUrl: 'www.linkedin.com' }),
          expect.objectContaining({ level: expect.any(String) }),
        );
      });
    });

    describe('queryForJobDetailsByUrl', () => {
      it('should call executeJobDetailsQueryByUrl with job URL', async () => {
        const { executeJobDetailsQueryByUrl } = await import('./queries/job-details-query.js');
        const client = new JobbyClient();

        const result = await client.jobs.queryForJobDetailsByUrl('https://linkedin.com/jobs/view/123');

        expect(executeJobDetailsQueryByUrl).toHaveBeenCalledWith(
          'https://linkedin.com/jobs/view/123',
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
        expect(result.summary.position).toBe('Senior Developer');
      });

      it('should pass resolved config to query', async () => {
        const { executeJobDetailsQueryByUrl } = await import('./queries/job-details-query.js');
        const client = new JobbyClient({ timeout: 15000 });

        await client.jobs.queryForJobDetailsByUrl('https://linkedin.com/jobs/view/456');

        expect(executeJobDetailsQueryByUrl).toHaveBeenCalledWith(
          'https://linkedin.com/jobs/view/456',
          expect.objectContaining({ timeout: 15000, baseUrl: 'www.linkedin.com' }),
          expect.objectContaining({ level: expect.any(String) }),
        );
      });
    });

    describe('queryForJobDetailsById', () => {
      it('should call executeJobDetailsQueryById with job ID', async () => {
        const { executeJobDetailsQueryById } = await import('./queries/job-details-query.js');
        const client = new JobbyClient();

        const result = await client.jobs.queryForJobDetailsById('123');

        expect(executeJobDetailsQueryById).toHaveBeenCalledWith(
          '123',
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
        expect(result.summary.position).toBe('Senior Developer');
      });

      it('should pass resolved config to query', async () => {
        const { executeJobDetailsQueryById } = await import('./queries/job-details-query.js');
        const client = new JobbyClient({ timeout: 15000 });

        await client.jobs.queryForJobDetailsById('456');

        expect(executeJobDetailsQueryById).toHaveBeenCalledWith(
          '456',
          expect.objectContaining({ timeout: 15000, baseUrl: 'www.linkedin.com' }),
          expect.objectContaining({ level: expect.any(String) }),
        );
      });
    });

    describe('queryForJobsRawHtml', () => {
      it('should call executeJobsQueryRawHtml with search params', async () => {
        const { executeJobsQueryRawHtml } = await import('./queries/jobs-query.js');
        const client = new JobbyClient();

        const result = await client.jobs.queryForJobsRawHtml({ keyword: 'TypeScript' });

        expect(executeJobsQueryRawHtml).toHaveBeenCalledWith(
          { keyword: 'TypeScript' },
          undefined,
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
        expect(result).toBe('<html><li>Job 1</li></html>');
      });
    });

    describe('queryForJobDetailsRawHtmlByUrl', () => {
      it('should call executeJobDetailsQueryRawHtmlByUrl with job URL', async () => {
        const { executeJobDetailsQueryRawHtmlByUrl } = await import('./queries/job-details-query.js');
        const client = new JobbyClient();

        const result = await client.jobs.queryForJobDetailsRawHtmlByUrl('https://linkedin.com/jobs/view/123');

        expect(executeJobDetailsQueryRawHtmlByUrl).toHaveBeenCalledWith(
          'https://linkedin.com/jobs/view/123',
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
        expect(result).toBe('<html><h1>Job Details</h1></html>');
      });
    });

    describe('queryForJobDetailsRawHtmlById', () => {
      it('should call executeJobDetailsQueryRawHtmlById with job ID', async () => {
        const { executeJobDetailsQueryRawHtmlById } = await import('./queries/job-details-query.js');
        const client = new JobbyClient();

        const result = await client.jobs.queryForJobDetailsRawHtmlById('123');

        expect(executeJobDetailsQueryRawHtmlById).toHaveBeenCalledWith(
          '123',
          expect.objectContaining({ baseUrl: 'www.linkedin.com', timeout: 10_000 }),
          expect.objectContaining({ level: expect.any(String) }),
        );
        expect(result).toBe('<html><h1>Job Details</h1></html>');
      });
    });

    describe('createSearch', () => {
      it('should return a JobSearchBuilder instance', () => {
        const client = new JobbyClient();
        const builder = client.jobs.createSearch();
        expect(builder).toBeDefined();
        expect(typeof builder.withKeyword).toBe('function');
        expect(typeof builder.execute).toBe('function');
      });

      it('should allow fluent building and execution', async () => {
        const client = new JobbyClient();
        const builder = client.jobs.createSearch();

        const result = builder
          .withKeyword('Node.js')
          .withLocation('Remote')
          .withJobType('full-time')
          .takeResults(5);

        expect(result.getSearchParams().keyword).toBe('Node.js');
        expect(result.getSearchParams().location).toBe('Remote');
        expect(result.getSearchParams().jobType).toBe('full-time');
        expect(result.getPaginationParams().take).toBe(5);
      });
    });
  });
});

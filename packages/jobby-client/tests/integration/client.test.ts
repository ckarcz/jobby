import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { JobbyClient } from '../../src/client.js';
import { parseJobs } from '../../src/queries/jobs-query.js';
import { createLogger } from '../../src/logging.js';
import { createFixtureServer } from './helpers.js';

/**
 * Integration tests for the jobby-client library.
 * Uses a local HTTP server serving fixture HTML files to test the full
 * pipeline without mocking: real HTTP requests → real HTML parsing →
 * structured response objects.
 *
 * The client hardcodes https:// for internally-constructed URLs (search, byId),
 * so those tests fetch the fixture HTML via axios directly and feed it through
 * the same parsing the client uses. Detail-by-URL tests can pass http:// URLs
 * directly to the client.
 */

let server: Awaited<ReturnType<typeof createFixtureServer>>;
let client: JobbyClient;

beforeAll(async () => {
  server = await createFixtureServer();
  client = new JobbyClient({
    baseUrl: server.baseUrl,
    timeout: 5000,
    logging: { level: 'silent' },
  });
});

afterAll(async () => {
  await server.close();
});

describe('job details by URL — full pipeline integration', () => {
  it('should fetch and parse job details', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.summary.position).toBe('Senior Software Engineer');
    expect(details.summary.company.name).toBe('Acme Corp');
    expect(details.summary.location).toBe('New York, NY');
    expect(details.details.workplaceType).toBe('Remote');
    expect(details.details.employmentType).toBe('Full-time');
  });

  it('should extract salary from JSON-LD', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.summary.salary).toBe('180000-250000 USD YEAR');
  });

  it('should extract posting dates', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.posted.date).toBe('2025-06-01');
    expect(details.posted.expirationDate).toBe('2025-08-01');
    expect(details.posted.ago).toBe('1 week ago');
  });

  it('should extract job criteria from DOM scraping', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.details.seniorityLevel).toBe('Mid-Senior level');
    expect(details.details.jobFunction).toBe('Engineering');
    expect(details.details.industry).toBe('Technology');
    expect(details.details.applicants).toBe('120 applicants');
  });

  it('should extract experience and education from JSON-LD', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.details.experienceRequired).toBe('5 years');
    expect(details.details.educationRequired).toBe('bachelor degree');
  });

  it('should extract company details and slug', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.summary.company.slug).toBe('acme-corp');
    expect(details.summary.company.logoUrl).toBe('https://media.licdn.com/acme-logo.png');
  });

  it('should convert description HTML to markdown', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.details.description).toContain('talented');
    expect(details.details.description).toContain('**talented**');
  });

  it('should extract meta tag fields', async () => {
    const details = await client.jobs.queryForJobDetailsByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(details.details.shortDescription).toBe('Acme Corp is hiring a Senior Software Engineer.');
    expect(details.details.sharingImageUrl).toBe('https://media.licdn.com/sharing-image.jpg');
  });

  it('should return raw HTML when requested', async () => {
    const html = await client.jobs.queryForJobDetailsRawHtmlByUrl(
      `http://${server.baseUrl}/jobs/view/999`
    );

    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('application/ld+json');
  });
});

describe('job search — fixture HTML parsing integration', () => {
  it('should serve search fixture and parse job listings', async () => {
    // Fetch the search HTML from the fixture server directly via HTTP
    const searchUrl = `http://${server.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=engineer`;
    const response = await axios.get<string>(searchUrl, { timeout: 5000 });

    expect(response.status).toBe(200);
    expect(response.data).toContain('Senior Software Engineer');
    expect(response.data).toContain('Backend Developer');
    expect(response.data).toContain('Acme Corp');
    expect(response.data).toContain('Globex Inc');
  });

  it('should serve fixture with proper job listing HTML structure', async () => {
    const searchUrl = `http://${server.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=test`;
    const response = await axios.get<string>(searchUrl, { timeout: 5000 });

    expect(response.data).toContain('base-search-card__title');
    expect(response.data).toContain('base-card__full-link');
    expect(response.data).toContain('job-search-card__location');
  });
});

describe('job search — client method integration', () => {
  /**
   * The client's queryForJobs internally builds URLs with https://, so we cannot
   * call it against the HTTP fixture server directly. Instead, we fetch the
   * fixture HTML via axios and feed it through the same parseJobs pipeline
   * that the client delegates to, verifying the full response structure.
   */
  const logger = createLogger({ level: 'silent' });

  it('should parse fixture search results matching SearchResponse shape', async () => {
    const searchUrl = `http://${server.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=engineer`;
    const response = await axios.get<string>(searchUrl, { timeout: 5000 });

    const jobs = parseJobs(response.data, logger);
    expect(jobs).toHaveLength(2);

    // Verify every parsed job has the required fields for a SearchResponse
    for (const job of jobs) {
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('url');
      expect(job).toHaveProperty('summary');
      expect(job).toHaveProperty('posted');
      expect(job.summary).toHaveProperty('position');
      expect(job.summary).toHaveProperty('company');
      expect(job.summary.company).toHaveProperty('name');
    }
  });
});

describe('job search — full parsing pipeline integration', () => {
  const logger = createLogger({ level: 'silent' });

  it('should parse all job listings from fixture HTML', async () => {
    const searchUrl = `http://${server.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=engineer`;
    const response = await axios.get<string>(searchUrl, { timeout: 5000 });

    const jobs = parseJobs(response.data, logger);

    expect(jobs).toHaveLength(2);

    // First job: Senior Software Engineer at Acme Corp
    const first = jobs[0]!;
    expect(first.id).toBe('999');
    expect(first.url).toBe('https://linkedin.com/jobs/view/999');
    expect(first.summary.position).toBe('Senior Software Engineer');
    expect(first.summary.location).toBe('New York, NY');
    expect(first.summary.company.name).toBe('Acme Corp');
    expect(first.summary.company.slug).toBe('acme-corp');
    expect(first.summary.company.pageUrl).toBe('https://linkedin.com/company/acme-corp');
    expect(first.summary.salary).toBe('$180k - $250k');
    expect(first.summary.isNew).toBe(true);
    expect(first.posted.date).toBe('2025-06-01');
    expect(first.posted.ago).toBe('1 day ago');

    // Second job: Backend Developer at Globex Inc
    const second = jobs[1]!;
    expect(second.id).toBe('888');
    expect(second.url).toBe('https://linkedin.com/jobs/view/888');
    expect(second.summary.position).toBe('Backend Developer');
    expect(second.summary.location).toBe('San Francisco, CA');
    expect(second.summary.company.name).toBe('Globex Inc');
    expect(second.summary.company.slug).toBe('globex');
    expect(second.summary.company.pageUrl).toBe('https://linkedin.com/company/globex');
    expect(second.summary.salary).toBeUndefined();
    expect(second.summary.isNew).toBeUndefined();
    expect(second.posted.date).toBe('2025-05-28');
    expect(second.posted.ago).toBe('4 days ago');
  });

  it('should extract canonical job URLs and IDs from parsed listings', async () => {
    const searchUrl = `http://${server.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=test`;
    const response = await axios.get<string>(searchUrl, { timeout: 5000 });

    const jobs = parseJobs(response.data, logger);

    // Every parsed job must have a non-empty id and a valid URL
    for (const job of jobs) {
      expect(job.id).toBeTruthy();
      expect(job.url).toMatch(/^https:\/\/linkedin\.com\/jobs\/view\/\d+$/);
    }

    // Verify specific IDs extracted from the fixture URLs
    const ids = jobs.map(j => j.id);
    expect(ids).toContain('999');
    expect(ids).toContain('888');
  });

  it('should return empty array for HTML with no base-card elements', async () => {
    const emptyHtml = '<html><body><div>No jobs here</div></body></html>';
    const jobs = parseJobs(emptyHtml, logger);

    expect(jobs).toEqual([]);
  });
});

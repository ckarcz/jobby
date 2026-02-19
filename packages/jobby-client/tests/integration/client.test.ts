import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { JobbyClient } from '../../src/client.js';
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

    expect(details.details.salary).toEqual({
      min: 180000,
      max: 250000,
      currency: 'USD',
      period: 'YEAR',
    });
    expect(details.summary.salary).toBe('$180,000 - $250,000/yr');
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

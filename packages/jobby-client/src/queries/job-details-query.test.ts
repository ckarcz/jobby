import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { executeJobDetailsQueryByUrl, executeJobDetailsQueryRawHtmlByUrl, executeJobDetailsQueryById, executeJobDetailsQueryRawHtmlById } from './job-details-query.js';
import { mergeJobDetailsData } from '../parsers/merge.js';
import { resolveConfig } from '../config.js';
import type { Logger } from '../logging.js';
import { ValidationError, RateLimitError, NetworkError } from '../types/errors.js';
import { createNoopLogger } from '../test-utils.js';

// Mock axios
const { mockedGet } = vi.hoisted(() => ({ mockedGet: vi.fn() }));
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, get: mockedGet } };
});

// Mock random-useragent
vi.mock('random-useragent', () => ({
  default: {
    getRandom: () => 'Test User Agent',
  },
}));

// Mock logging to keep tests silent
vi.mock('../logging.js', async () => {
  const { loggingMockFactory } = await import('../test-utils.js');
  return loggingMockFactory();
});

/**
 * Tests for the executeJobDetailsQueryByUrl function that fetches individual job
 * posting pages, extracts structured data from JSON-LD and DOM elements,
 * and returns detailed job information including salary and requirements.
 */

const defaultConfig = resolveConfig();
const defaultLogger = createNoopLogger() as unknown as Logger;

describe('executeJobDetailsQueryByUrl - job detail page fetching and parsing', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  const mockJobDetailsHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="canonical" href="https://www.linkedin.com/jobs/view/senior-software-engineer-at-test-company-123">
      <meta property="og:url" content="https://www.linkedin.com/jobs/view/senior-software-engineer-at-test-company-123">
      <meta property="og:title" content="Test Company hiring Senior Software Engineer in San Francisco, CA | LinkedIn">
      <meta property="og:description" content="Test Company is hiring a Senior Software Engineer in San Francisco, CA.">
      <meta property="og:image" content="https://media.licdn.com/sharing-image.jpg">
      <script type="application/ld+json">
      {
        "@type": "JobPosting",
        "title": "Senior Software Engineer",
        "description": "We are looking for a <strong>talented</strong> engineer.",
        "datePosted": "2024-01-15",
        "validThrough": "2024-03-15",
        "employmentType": "FULL_TIME",
        "jobLocationType": "TELECOMMUTE",
        "industry": "Technology",
        "hiringOrganization": {
          "name": "Test Company",
          "sameAs": "https://linkedin.com/company/test-company?trk=tracking",
          "logo": "https://media.licdn.com/jsonld-logo.png"
        },
        "identifier": {
          "name": "Test Company",
          "value": "123"
        },
        "jobLocation": {
          "address": {
            "addressLocality": "San Francisco",
            "addressRegion": "CA",
            "addressCountry": "US"
          }
        },
        "baseSalary": {
          "currency": "USD",
          "value": {
            "minValue": 150000,
            "maxValue": 200000,
            "unitText": "YEAR"
          }
        },
        "experienceRequirements": {
          "monthsOfExperience": 60
        },
        "educationRequirements": {
          "credentialCategory": "bachelor degree"
        }
      }
      </script>
    </head>
    <body>
      <section>
        <div class="top-card-layout__entity-info-container">
          <img class="artdeco-entity-image" data-delayed-url="https://media.licdn.com/logo.png" alt="Test Company">
        </div>
      </section>
      <h1 class="top-card-layout__title">Senior Software Engineer</h1>
      <a class="topcard__org-name-link" href="https://linkedin.com/company/test?trk=tracking">Test Company</a>
      <span class="topcard__flavor--bullet">San Francisco, CA</span>
      <span class="posted-time-ago__text">2 weeks ago</span>
      <span class="num-applicants__caption">50 applicants</span>
      <a class="apply-button" href="https://linkedin.com/jobs/view/123/apply">Easy Apply</a>
      <div class="show-more-less-html__markup">
        <p>Job description here</p>
      </div>
      <div class="description__job-criteria-item">
        <h3 class="description__job-criteria-subheader">Seniority level</h3>
        <span class="description__job-criteria-text">Mid-Senior level</span>
      </div>
      <div class="description__job-criteria-item">
        <h3 class="description__job-criteria-subheader">Employment type</h3>
        <span class="description__job-criteria-text">Full-time</span>
      </div>
      <div class="description__job-criteria-item">
        <h3 class="description__job-criteria-subheader">Job function</h3>
        <span class="description__job-criteria-text">Engineering</span>
      </div>
      <div class="description__job-criteria-item">
        <h3 class="description__job-criteria-subheader">Industries</h3>
        <span class="description__job-criteria-text">Software Development</span>
      </div>
    </body>
    </html>
  `;

  describe('JSON-LD structured data extraction', () => {
    it('should fetch and parse job details', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockJobDetailsHtml });

    const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

    expect(result.summary.position).toBe('Senior Software Engineer');
    expect(result.summary.company.name).toBe('Test Company');
    expect(result.summary.location).toBe('San Francisco, CA');
    expect(result.details.workplaceType).toBe('Remote');
    expect(result.details.employmentType).toBe('Full-time');
    expect(result.posted.date).toBe('2024-01-15');
    expect(result.posted.expirationDate).toBe('2024-03-15');
    expect(result.id).toBe('123');
    expect(result.url).toBe('https://www.linkedin.com/jobs/view/123');
    expect(result.summary.company.logoUrl).toBe('https://media.licdn.com/jsonld-logo.png');
    expect(result.summary.company.slug).toBe('test-company');
  });

  it('should extract experience and education requirements', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockJobDetailsHtml });

    const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

    expect(result.details.experienceRequired).toBe('5 years');
    expect(result.details.educationRequired).toBe('bachelor degree');
  });

  it('should extract job criteria from DOM', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockJobDetailsHtml });

    const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

    expect(result.details.seniorityLevel).toBe('Mid-Senior level');
    expect(result.details.jobFunction).toBe('Engineering');
  });

  it('should remove query params from company URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockJobDetailsHtml });

    const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

    expect(result.summary.company.pageUrl).toBe('https://linkedin.com/company/test-company');
  });

  it('should convert HTML description to markdown', async () => {
    mockedGet.mockResolvedValueOnce({ data: mockJobDetailsHtml });

    const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

    expect(result.details.description).not.toContain('<strong>');
    expect(result.details.description).toContain('**talented**');
    });
  });

  describe('validation', () => {
    it('should throw ValidationError for empty URL', async () => {
      await expect(executeJobDetailsQueryByUrl('', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only URL', async () => {
      await expect(executeJobDetailsQueryByUrl('   ', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-URL string', async () => {
      await expect(executeJobDetailsQueryByUrl('not-a-url', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
      await expect(executeJobDetailsQueryByUrl('not-a-url', defaultConfig, defaultLogger)).rejects.toThrow('Job URL must be a valid URL');
    });

    it('should throw ValidationError for plain text', async () => {
      await expect(executeJobDetailsQueryByUrl('just some text', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for a numeric ID', async () => {
      await expect(executeJobDetailsQueryByUrl('123456', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
    });

    it('should accept a valid HTTP URL', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html></html>' });
      await expect(executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger)).resolves.toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw RateLimitError on 429 response', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
        message: 'Rate limited',
      };
      mockedGet.mockRejectedValueOnce(axiosError);

      await expect(executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger))
        .rejects.toThrow(RateLimitError);
    });

    it('should throw NetworkError on other HTTP errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      };
      mockedGet.mockRejectedValueOnce(axiosError);

      await expect(executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger))
        .rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError on unknown errors', async () => {
      mockedGet.mockRejectedValueOnce(new Error('Network failure'));

      await expect(executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger))
        .rejects.toThrow(NetworkError);
    });
  });

  describe('fallback parsing when JSON-LD is missing', () => {
    it('should fallback to DOM parsing for all fields when JSON-LD is absent', async () => {
      const htmlWithoutJsonLd = `
        <html>
        <head>
          <link rel="canonical" href="https://www.linkedin.com/jobs/view/fallback-title-at-fallback-company-456">
          <meta property="og:title" content="Fallback Company hiring Fallback Title in Boston, MA (Remote) | LinkedIn">
        </head>
        <body>
          <section>
            <div class="top-card-layout__entity-info-container">
              <img class="artdeco-entity-image" data-delayed-url="https://media.licdn.com/fallback-logo.png" alt="Fallback Company">
            </div>
          </section>
          <h1 class="top-card-layout__title">Fallback Title</h1>
          <a class="topcard__org-name-link" href="https://linkedin.com/company/fallback?trk=x">Fallback Company</a>
          <span class="topcard__flavor--bullet">Boston, MA</span>
          <span class="posted-time-ago__text">3 days ago</span>
          <span class="num-applicants__caption">25 applicants</span>
          <div class="show-more-less-html__markup"><p>Description text</p></div>
          <div class="description__job-criteria-item">
            <h3 class="description__job-criteria-subheader">Seniority level</h3>
            <span class="description__job-criteria-text">Senior</span>
          </div>
          <div class="description__job-criteria-item">
            <h3 class="description__job-criteria-subheader">Employment type</h3>
            <span class="description__job-criteria-text">Full-time</span>
          </div>
          <div class="description__job-criteria-item">
            <h3 class="description__job-criteria-subheader">Job function</h3>
            <span class="description__job-criteria-text">Engineering</span>
          </div>
          <div class="description__job-criteria-item">
            <h3 class="description__job-criteria-subheader">Industries</h3>
            <span class="description__job-criteria-text">Technology</span>
          </div>
        </body>
        </html>
      `;
      mockedGet.mockResolvedValueOnce({ data: htmlWithoutJsonLd });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/456', defaultConfig, defaultLogger);

      expect(result.id).toBe('456');
      expect(result.url).toBe('https://www.linkedin.com/jobs/view/456');
      expect(result.summary.position).toBe('Fallback Title');
      expect(result.summary.company.name).toBe('Fallback Company');
      expect(result.summary.company.pageUrl).toBe('https://linkedin.com/company/fallback');
      expect(result.summary.company.logoUrl).toBe('https://media.licdn.com/fallback-logo.png');
      expect(result.summary.location).toBe('Boston, MA');
      expect(result.details.workplaceType).toBe('Remote');
      expect(result.details.employmentType).toBe('Full-time');
      expect(result.details.seniorityLevel).toBe('Senior');
      expect(result.details.jobFunction).toBe('Engineering');
      expect(result.details.industry).toBe('Technology');
      expect(result.details.description).toBe('Description text');
      expect(result.posted.ago).toBe('3 days ago');
      expect(result.details.applicants).toBe('25 applicants');
    });

    it('should handle pages with invalid JSON-LD gracefully', async () => {
      const htmlWithInvalidJsonLd = `
        <html>
        <head>
          <script type="application/ld+json">{ invalid json }</script>
        </head>
        <body>
          <h1 class="top-card-layout__title">DOM Title</h1>
        </body>
        </html>
      `;
      mockedGet.mockResolvedValueOnce({ data: htmlWithInvalidJsonLd });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.summary.position).toBe('DOM Title');
    });

    it('should use provided URL as fallback when page has no canonical link', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/789?trk=tracking', defaultConfig, defaultLogger);

      expect(result.id).toBe('789');
      expect(result.url).toBe('https://linkedin.com/jobs/view/789');
    });
  });

  describe('workplace type scraping from meta tags', () => {
    it('should detect Remote from og:title', async () => {
      const html = `
        <html><head>
          <meta property="og:title" content="Company hiring Engineer (Remote) | LinkedIn">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.workplaceType).toBe('Remote');
    });

    it('should detect Hybrid from og:title', async () => {
      const html = `
        <html><head>
          <meta property="og:title" content="Company hiring Engineer (Hybrid) | LinkedIn">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.workplaceType).toBe('Hybrid');
    });

    it('should detect On-site from og:title', async () => {
      const html = `
        <html><head>
          <meta property="og:title" content="Company hiring Engineer (On-Site) | LinkedIn">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.workplaceType).toBe('On-site');
    });
  });

  describe('company logo scraping', () => {
    it('should extract company logo from data-delayed-url attribute', async () => {
      const html = `
        <html><body>
          <section>
            <div class="top-card-layout__entity-info-container">
              <img class="artdeco-entity-image" data-delayed-url="https://media.licdn.com/company-logo.png">
            </div>
          </section>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.summary.company.logoUrl).toBe('https://media.licdn.com/company-logo.png');
    });

    it('should return undefined when no logo image is present', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.summary.company.logoUrl).toBeUndefined();
    });
  });

  describe('job URL resolution', () => {
    it('should prefer canonical link over og:url', async () => {
      const html = `
        <html><head>
          <link rel="canonical" href="https://www.linkedin.com/jobs/view/software-engineer-at-company-555">
          <meta property="og:url" content="https://www.linkedin.com/jobs/view/software-engineer-at-company-999">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.id).toBe('555');
      expect(result.url).toBe('https://www.linkedin.com/jobs/view/555');
    });

    it('should fallback to og:url when no canonical link exists', async () => {
      const html = `
        <html><head>
          <meta property="og:url" content="https://www.linkedin.com/jobs/view/software-engineer-at-company-777">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.id).toBe('777');
      expect(result.url).toBe('https://www.linkedin.com/jobs/view/777');
    });
  });

  describe('non-US country in location', () => {
    it('should include non-US country in location string', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "title": "Engineer",
            "jobLocation": {
              "address": {
                "addressLocality": "London",
                "addressRegion": "England",
                "addressCountry": "GB"
              }
            }
          }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.summary.location).toBe('London, England, GB');
    });

    it('should omit US country from location string', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "title": "Engineer",
            "jobLocation": {
              "address": {
                "addressLocality": "Austin",
                "addressRegion": "TX",
                "addressCountry": "US"
              }
            }
          }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.summary.location).toBe('Austin, TX');
    });
  });

  describe('salary text from DOM (raw string)', () => {
    it('should return raw salary text from DOM', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">$115,000.00 - $145,000.00/yr</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('$115,000.00 - $145,000.00/yr');
    });

    it('should return raw salary text from compensation__salary fallback', async () => {
      const html = `
        <html><body>
          <div class="compensation__salary">€25.00 - €35.00/hr</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('€25.00 - €35.00/hr');
    });

    it('should return raw salary text with GBP from DOM', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">£60,000 per year</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('£60,000 per year');
    });

    it('should return undefined salary when no salary text in DOM', async () => {
      const html = '<html><body></body></html>';
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBeUndefined();
    });

    it('should return raw text even when non-numeric', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">Competitive salary</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('Competitive salary');
    });

    it('should return raw single salary value', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">$100,000/yr</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('$100,000/yr');
    });

    it('should return raw monthly salary text', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">$5,000 - $8,000/mo</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('$5,000 - $8,000/mo');
    });

    it('should return raw hourly salary text', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">$25.00 per hour</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('$25.00 per hour');
    });

    it('should return raw EUR monthly salary text', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">€3,000 - €4,500 per month</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });

      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

      expect(result.details.salary).toBe('€3,000 - €4,500 per month');
    });
  });

  describe('employment type mapping', () => {
    const testEmploymentTypes = [
      ['FULL_TIME', 'Full-time'],
      ['PART_TIME', 'Part-time'],
      ['CONTRACT', 'Contract'],
      ['TEMPORARY', 'Temporary'],
      ['INTERNSHIP', 'Internship'],
      ['VOLUNTEER', 'Volunteer'],
    ];

    testEmploymentTypes.forEach(([input, expected]) => {
      it(`should map ${input} to ${expected}`, async () => {
        const html = `
          <html>
          <head>
            <script type="application/ld+json">
            { "@type": "JobPosting", "employmentType": "${input}" }
            </script>
          </head>
          <body></body>
          </html>
        `;
        mockedGet.mockResolvedValueOnce({ data: html });

        const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

        expect(result.details.employmentType).toBe(expected);
      });
    });
  });

  describe('config options', () => {
    it('should use custom timeout from config', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html></html>' });

      await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', resolveConfig({ timeout: 30000 }), defaultLogger);

      expect(mockedGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should use abort signal from config', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html></html>' });
      const controller = new AbortController();

      await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', resolveConfig({ signal: controller.signal }), defaultLogger);

      expect(mockedGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });
});

/**
 * Tests for the executeJobDetailsQueryRawHtmlByUrl function that returns the raw HTML
 * response from a job posting page without parsing it into structured data.
 */

describe('executeJobDetailsQueryRawHtmlByUrl - raw HTML response', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('should return raw HTML string without parsing', async () => {
    const rawHtml = '<html><body><h1>Job Title</h1></body></html>';
    mockedGet.mockResolvedValueOnce({ data: rawHtml });

    const result = await executeJobDetailsQueryRawHtmlByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);

    expect(result).toBe(rawHtml);
  });

  it('should fetch the provided URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobDetailsQueryRawHtmlByUrl('https://linkedin.com/jobs/view/456', defaultConfig, defaultLogger);

    expect(mockedGet).toHaveBeenCalledWith(
      'https://linkedin.com/jobs/view/456',
      expect.any(Object)
    );
  });

  it('should throw ValidationError for empty URL', async () => {
    await expect(executeJobDetailsQueryRawHtmlByUrl('', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for non-URL string', async () => {
    await expect(executeJobDetailsQueryRawHtmlByUrl('not-a-url', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
    await expect(executeJobDetailsQueryRawHtmlByUrl('not-a-url', defaultConfig, defaultLogger)).rejects.toThrow('Job URL must be a valid URL');
  });

  it('should throw RateLimitError on 429 response', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 429,
        headers: { 'retry-after': '60' },
      },
      message: 'Rate limited',
    };
    mockedGet.mockRejectedValueOnce(axiosError);

    await expect(executeJobDetailsQueryRawHtmlByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger))
      .rejects.toThrow(RateLimitError);
  });

  it('should throw NetworkError on HTTP errors', async () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 500 },
      message: 'Server error',
    };
    mockedGet.mockRejectedValueOnce(axiosError);

    await expect(executeJobDetailsQueryRawHtmlByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger))
      .rejects.toThrow(NetworkError);
  });

  it('should use custom timeout from config', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobDetailsQueryRawHtmlByUrl('https://linkedin.com/jobs/view/123', resolveConfig({ timeout: 30000 }), defaultLogger);

    expect(mockedGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 30000 })
    );
  });
});

/**
 * Tests for the executeJobDetailsQueryById function that builds a URL
 * from a job ID and delegates to the URL-based query.
 */

describe('executeJobDetailsQueryById - ID-based job detail fetching', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('should build URL from job ID and fetch details', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });

    await executeJobDetailsQueryById('123456', defaultConfig, defaultLogger);

    expect(mockedGet).toHaveBeenCalledWith(
      'https://www.linkedin.com/jobs/view/123456',
      expect.any(Object)
    );
  });

  it('should use custom baseUrl from config', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });

    await executeJobDetailsQueryById('789', resolveConfig({ baseUrl: 'custom.linkedin.com' }), defaultLogger);

    expect(mockedGet).toHaveBeenCalledWith(
      'https://custom.linkedin.com/jobs/view/789',
      expect.any(Object)
    );
  });

  it('should throw ValidationError for empty ID (empty URL)', async () => {
    await expect(executeJobDetailsQueryById('', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
  });
});

/**
 * Tests for the executeJobDetailsQueryRawHtmlById function that builds a URL
 * from a job ID and returns the raw HTML response.
 */

describe('executeJobDetailsQueryRawHtmlById - ID-based raw HTML fetching', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('should build URL from job ID and return raw HTML', async () => {
    const rawHtml = '<html><body><h1>Job</h1></body></html>';
    mockedGet.mockResolvedValueOnce({ data: rawHtml });

    const result = await executeJobDetailsQueryRawHtmlById('123456', defaultConfig, defaultLogger);

    expect(result).toBe(rawHtml);
    expect(mockedGet).toHaveBeenCalledWith(
      'https://www.linkedin.com/jobs/view/123456',
      expect.any(Object)
    );
  });

  it('should use custom baseUrl from config', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobDetailsQueryRawHtmlById('789', resolveConfig({ baseUrl: 'custom.linkedin.com' }), defaultLogger);

    expect(mockedGet).toHaveBeenCalledWith(
      'https://custom.linkedin.com/jobs/view/789',
      expect.any(Object)
    );
  });

  it('should throw ValidationError for empty ID', async () => {
    await expect(executeJobDetailsQueryRawHtmlById('', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for whitespace-only ID', async () => {
    await expect(executeJobDetailsQueryRawHtmlById('   ', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
  });
});

describe('executeJobDetailsQueryByUrl - additional edge cases', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  describe('unknown employment type mapping', () => {
    it('should pass through unknown employment type as-is', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "employmentType": "FREELANCE" }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.employmentType).toBe('FREELANCE');
    });
  });

  describe('experience requirement formatting', () => {
    it('should format 0 months as 0 years', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "experienceRequirements": { "monthsOfExperience": 0 } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.experienceRequired).toBe('0 years');
    });

    it('should round 6 months to 1 year (singular)', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "experienceRequirements": { "monthsOfExperience": 6 } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.experienceRequired).toBe('1 year');
    });

    it('should format 12 months as 1 year (singular)', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "experienceRequirements": { "monthsOfExperience": 12 } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.experienceRequired).toBe('1 year');
    });

    it('should format 24 months as 2 years (plural)', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "experienceRequirements": { "monthsOfExperience": 24 } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.experienceRequired).toBe('2 years');
    });

    it('should format 120 months as 10 years', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "experienceRequirements": { "monthsOfExperience": 120 } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.experienceRequired).toBe('10 years');
    });
  });

  describe('JSON-LD extraction edge cases', () => {
    it('should ignore JSON-LD with wrong @type', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "Organization", "name": "Some Org" }
          </script>
        </head><body>
          <h1 class="top-card-layout__title">DOM Title</h1>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.position).toBe('DOM Title');
    });

    it('should use last valid JSON-LD when multiple scripts are present', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "title": "First Title" }
          </script>
          <script type="application/ld+json">
          { "@type": "JobPosting", "title": "Second Title" }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.position).toBe('Second Title');
    });

    it('should skip invalid JSON-LD and use valid ones', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">{ invalid }</script>
          <script type="application/ld+json">
          { "@type": "JobPosting", "title": "Valid Title" }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.position).toBe('Valid Title');
    });
  });

  describe('location edge cases from JSON-LD', () => {
    it('should return undefined location when address object is empty', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "jobLocation": { "address": {} } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.location).toBeUndefined();
    });

    it('should include only non-US country in location', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "jobLocation": { "address": { "addressCountry": "DE" } } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.location).toBe('DE');
    });

    it('should exclude US-only country from location resulting in undefined', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "jobLocation": { "address": { "addressCountry": "US" } } }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.location).toBeUndefined();
    });
  });

  describe('company logo src fallback', () => {
    it('should fall back to src attribute when data-delayed-url is missing', async () => {
      const html = `
        <html><body>
          <section>
            <div class="top-card-layout__entity-info-container">
              <img class="artdeco-entity-image" src="https://media.licdn.com/fallback.png">
            </div>
          </section>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.logoUrl).toBe('https://media.licdn.com/fallback.png');
    });

    it('should prefer data-delayed-url over src attribute', async () => {
      const html = `
        <html><body>
          <section>
            <div class="top-card-layout__entity-info-container">
              <img class="artdeco-entity-image" data-delayed-url="https://media.licdn.com/primary.png" src="https://media.licdn.com/fallback.png">
            </div>
          </section>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.logoUrl).toBe('https://media.licdn.com/primary.png');
    });
  });

  describe('lnkd:url meta tag fallback', () => {
    it('should fall back to lnkd:url when canonical and og:url are missing', async () => {
      const html = `
        <html><head>
          <meta property="lnkd:url" content="https://www.linkedin.com/jobs/view/engineer-at-corp-888">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.id).toBe('888');
    });
  });

  describe('salary text edge cases', () => {
    it('should return raw salary text without currency symbol', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">100,000 - 150,000/yr</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.salary).toBe('100,000 - 150,000/yr');
    });

    it('should return raw salary text without period', async () => {
      const html = `
        <html><body>
          <div class="salary-main-rail__compensation-value">$80,000 - $120,000</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.salary).toBe('$80,000 - $120,000');
    });

    it('should use compensation__salary as fallback when salary-main-rail is missing', async () => {
      const html = `
        <html><body>
          <div class="compensation__salary">$90,000/yr</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.salary).toBe('$90,000/yr');
    });
  });

  describe('description scraping edge cases', () => {
    it('should return undefined description when show-more-less-html__markup is empty', async () => {
      const html = `
        <html><body>
          <div class="show-more-less-html__markup">   </div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.description).toBeUndefined();
    });
  });
});

describe('executeJobDetailsQueryById - additional edge cases', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('should throw ValidationError for whitespace-only ID', async () => {
    await expect(executeJobDetailsQueryById('   ', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
  });

  it('should trim whitespace from job ID before building URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
    await executeJobDetailsQueryById('  123456  ', defaultConfig, defaultLogger);
    expect(mockedGet).toHaveBeenCalledWith(
      'https://www.linkedin.com/jobs/view/123456',
      expect.any(Object)
    );
  });
});

describe('executeJobDetailsQueryRawHtmlById - additional edge cases', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('should throw ValidationError for whitespace-only ID', async () => {
    await expect(executeJobDetailsQueryRawHtmlById('   ', defaultConfig, defaultLogger)).rejects.toThrow(ValidationError);
  });

  it('should return raw HTML for valid ID', async () => {
    const rawHtml = '<html><body><h1>Details</h1></body></html>';
    mockedGet.mockResolvedValueOnce({ data: rawHtml });
    const result = await executeJobDetailsQueryRawHtmlById('999', defaultConfig, defaultLogger);
    expect(result).toBe(rawHtml);
  });

  it('should trim whitespace from job ID before building URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
    await executeJobDetailsQueryRawHtmlById('  789  ', defaultConfig, defaultLogger);
    expect(mockedGet).toHaveBeenCalledWith(
      'https://www.linkedin.com/jobs/view/789',
      expect.any(Object)
    );
  });
});

describe('executeJobDetailsQueryByUrl - new extractable fields', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  describe('company logo JSON-LD priority', () => {
    it('should prefer JSON-LD logo over DOM data-delayed-url', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "title": "Engineer",
            "hiringOrganization": { "name": "Co", "logo": "https://jsonld-logo.png" }
          }
          </script>
        </head><body>
          <section>
            <div class="top-card-layout__entity-info-container">
              <img class="artdeco-entity-image" data-delayed-url="https://dom-logo.png">
            </div>
          </section>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.logoUrl).toBe('https://jsonld-logo.png');
    });

    it('should fall back to DOM logo when JSON-LD logo absent', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          { "@type": "JobPosting", "title": "Engineer", "hiringOrganization": { "name": "Co" } }
          </script>
        </head><body>
          <section>
            <div class="top-card-layout__entity-info-container">
              <img class="artdeco-entity-image" data-delayed-url="https://dom-logo.png">
            </div>
          </section>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.logoUrl).toBe('https://dom-logo.png');
    });
  });

  describe('company slug extraction', () => {
    it('should extract slug from JSON-LD hiringOrganization.sameAs', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "hiringOrganization": { "name": "Co", "sameAs": "https://linkedin.com/company/my-company?trk=x" }
          }
          </script>
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.slug).toBe('my-company');
    });

    it('should fall back to DOM company page URL for slug', async () => {
      const html = `
        <html><body>
          <a class="topcard__org-name-link" href="https://linkedin.com/company/dom-company?trk=x">Co</a>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.slug).toBe('dom-company');
    });

    it('should return undefined slug when no company URL available', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.slug).toBeUndefined();
    });
  });

  describe('apply button extraction', () => {
    it('should extract apply URL and text from .apply-button', async () => {
      const html = `
        <html><body>
          <a class="apply-button" href="https://linkedin.com/jobs/view/123/apply">Easy Apply</a>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.applyUrl).toBe('https://linkedin.com/jobs/view/123/apply');
      expect(result.details.applyText).toBe('Easy Apply');
    });

    it('should return undefined apply fields when no button present', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.applyUrl).toBeUndefined();
      expect(result.details.applyText).toBeUndefined();
    });
  });

  describe('og meta tag extraction', () => {
    it('should extract shortDescription from og:description', async () => {
      const html = `
        <html><head>
          <meta property="og:description" content="A great job opportunity at Test Corp.">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.shortDescription).toBe('A great job opportunity at Test Corp.');
    });

    it('should extract sharingImageUrl from og:image', async () => {
      const html = `
        <html><head>
          <meta property="og:image" content="https://media.licdn.com/sharing.jpg">
        </head><body></body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.sharingImageUrl).toBe('https://media.licdn.com/sharing.jpg');
    });

    it('should return undefined for og fields when meta tags absent', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.shortDescription).toBeUndefined();
      expect(result.details.sharingImageUrl).toBeUndefined();
    });
  });

  describe('benefits info extraction', () => {
    it('should extract from .job-details-benefits__text', async () => {
      const html = `
        <html><body>
          <div class="job-details-benefits__text">Benefits Eligible: Yes</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.benefitsInfo).toBe('Benefits Eligible: Yes');
    });

    it('should return undefined when no elements present', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.benefitsInfo).toBeUndefined();
    });

    it('should normalize whitespace', async () => {
      const html = `
        <html><body>
          <div class="job-details-benefits__text">Benefits   Eligible:
          Yes</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.benefitsInfo).toBe('Benefits Eligible: Yes');
    });
  });

  describe('incentive info extraction', () => {
    it('should extract from .compensation__incentive-value', async () => {
      const html = `
        <html><body>
          <div class="compensation__incentive-value">Bonus Eligible: Yes</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.incentiveInfo).toBe('Bonus Eligible: Yes');
    });

    it('should return undefined when no elements present', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.incentiveInfo).toBeUndefined();
    });

    it('should normalize whitespace', async () => {
      const html = `
        <html><body>
          <div class="compensation__incentive-value">Bonus   Eligible:
          Yes</div>
        </body></html>
      `;
      mockedGet.mockResolvedValueOnce({ data: html });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.details.incentiveInfo).toBe('Bonus Eligible: Yes');
    });
  });

  describe('all new fields return undefined when absent', () => {
    it('should have all new fields as undefined for minimal HTML', async () => {
      mockedGet.mockResolvedValueOnce({ data: '<html><body></body></html>' });
      const result = await executeJobDetailsQueryByUrl('https://linkedin.com/jobs/view/123', defaultConfig, defaultLogger);
      expect(result.summary.company.slug).toBeUndefined();
      expect(result.details.applyUrl).toBeUndefined();
      expect(result.details.applyText).toBeUndefined();
      expect(result.details.shortDescription).toBeUndefined();
      expect(result.details.sharingImageUrl).toBeUndefined();
      expect(result.details.benefitsInfo).toBeUndefined();
      expect(result.details.incentiveInfo).toBeUndefined();
    });
  });
});

describe('mergeJobDetailsData - merge primary and fallback detail records', () => {
  const emptyData = {
    jobUrl: undefined,
    title: undefined,
    location: undefined,
    company: undefined,
    companyPage: undefined,
    companyLogo: undefined,
    companySlug: undefined,
    salary: undefined,
    postedDate: undefined,
    postedTimeAgo: undefined,
    expirationDate: undefined,
    description: undefined,
    workplaceType: undefined,
    employmentType: undefined,
    seniorityLevel: undefined,
    applicantCount: undefined,
    industry: undefined,
    jobFunction: undefined,
    experienceRequired: undefined,
    educationRequired: undefined,
    applyUrl: undefined,
    applyText: undefined,
    shortDescription: undefined,
    sharingImageUrl: undefined,
    benefitsInfo: undefined,
    incentiveInfo: undefined,
  };

  it('should prefer primary values over fallback values', () => {
    const primary = { ...emptyData, title: 'Primary Title', company: 'Primary Co' };
    const fallback = { ...emptyData, title: 'Fallback Title', company: 'Fallback Co' };

    const result = mergeJobDetailsData(primary, fallback);

    expect(result.title).toBe('Primary Title');
    expect(result.company).toBe('Primary Co');
  });

  it('should use fallback value when primary field is undefined', () => {
    const primary = { ...emptyData };
    const fallback = { ...emptyData, title: 'Fallback Title', location: 'New York' };

    const result = mergeJobDetailsData(primary, fallback);

    expect(result.title).toBe('Fallback Title');
    expect(result.location).toBe('New York');
  });

  it('should stay undefined when both primary and fallback fields are undefined', () => {
    const primary = { ...emptyData };
    const fallback = { ...emptyData };

    const result = mergeJobDetailsData(primary, fallback);

    expect(result.title).toBeUndefined();
    expect(result.company).toBeUndefined();
    expect(result.location).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { executeJobsQuery, executeJobsQueryRawHtml } from './jobs-query.js';
import { ValidationError, RateLimitError, NetworkError, ParsingError } from '../types/errors.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);
mockedAxios.isAxiosError.mockImplementation(
  (error): error is import('axios').AxiosError =>
    typeof error === 'object' && error !== null && (error as Record<string, unknown>)['isAxiosError'] === true,
);

// Mock random-useragent
vi.mock('random-useragent', () => ({
  default: {
    getRandom: () => 'Test User Agent',
  },
}));

// Mock logging to keep tests silent
vi.mock('../logging.js', () => {
  const noopLog = (): void => {};
  return {
    createLogger: () => ({
      error: noopLog,
      warn: noopLog,
      info: noopLog,
      http: noopLog,
      verbose: noopLog,
      debug: noopLog,
      silly: noopLog,
      level: 'silent',
      silent: true,
      transports: [],
    }),
  };
});

/**
 * Tests for the executeJobsQuery function that builds LinkedIn job search
 * URLs, makes HTTP requests, and parses the HTML response into structured
 * job listing results with pagination metadata.
 */

describe('executeJobsQuery - job listing search and HTML parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockJobHtml = `
    <li>
      <div class="base-search-card__subtitle">
        <a href="https://linkedin.com/company/test-company">Test Company</a>
      </div>
      <div class="base-search-card__title">Software Engineer</div>
      <div class="job-search-card__location">San Francisco, CA</div>
      <div class="job-search-card__salary-info">$100k - $150k</div>
      <time class="job-search-card__listdate job-search-card__listdate--new" datetime="2024-01-15">1 day ago</time>
      <a class="base-card__full-link" href="https://linkedin.com/jobs/view/123"></a>
      <img class="artdeco-entity-image" data-delayed-url="https://example.com/logo.png">
      <div class="job-posting-benefits"><span class="job-posting-benefits__text">Actively Hiring +3 benefits</span></div>
      <span class="job-search-card__easy-apply-label">Apply Now</span>
    </li>
  `;

  it('should execute a basic search query', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockJobHtml });

    const result = await executeJobsQuery({ keyword: 'TypeScript' });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe('123');
    expect(result.results[0].url).toBe('https://linkedin.com/jobs/view/123');
    expect(result.results[0].summary.company.name).toBe('Test Company');
    expect(result.results[0].summary.company.slug).toBe('test-company');
    expect(result.results[0].summary.company.logoUrl).toBe('https://example.com/logo.png');
    expect(result.results[0].summary.position).toBe('Software Engineer');
    expect(result.results[0].summary.location).toBe('San Francisco, CA');
    expect(result.results[0].summary.isNew).toBe(true);
    expect(result.results[0].summary.easyApply).toBe(true);
    expect(result.results[0].summary.highlight).toBe('Actively Hiring +3 benefits');
  });

  describe('search parameter URL encoding', () => {
    it('should include keyword in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ keyword: 'React Developer' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    // URLSearchParams encodes spaces as + naturally
    expect(url).toContain('keywords=React+Developer');
  });

  it('should include location in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ location: 'New York' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    // URLSearchParams encodes spaces as + naturally
    expect(url).toContain('location=New+York');
  });

  it('should include job type in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ jobType: 'full-time' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_JT=F');
  });

  it('should include multiple job types in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ jobType: ['full-time', 'contract'] });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_JT=F%2CC');
  });

  it('should include experience level in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ experienceLevel: 'senior' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_E=4');
  });

  it('should include minimum salary in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ minimumSalary: '100,000' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_SB2=4');
  });

  it('should include workplace type in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ workplaceType: 'remote' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_WT=2');
  });

  it('should include listing age in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ listingAge: 'past-week' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_TPR=r604800');
  });

  it('should include geoId in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ geoId: '103644278' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('geoId=103644278');
  });

  it('should include companyId in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQuery({ companyId: '1441' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('f_C=1441');
    });
  });

  describe('pagination', () => {
    it('should include start in URL', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

      await executeJobsQuery({}, { start: 25 });

      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain('start=25');
    });

    it('should apply skip to results', async () => {
      const multiJobHtml = `
        <li>
          <div class="base-search-card__subtitle">Company 1</div>
          <div class="base-search-card__title">Job 1</div>
        </li>
        <li>
          <div class="base-search-card__subtitle">Company 2</div>
          <div class="base-search-card__title">Job 2</div>
        </li>
        <li>
          <div class="base-search-card__subtitle">Company 3</div>
          <div class="base-search-card__title">Job 3</div>
        </li>
      `;
      mockedAxios.get.mockResolvedValueOnce({ data: multiJobHtml });

      const result = await executeJobsQuery({}, { skip: 1 });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].summary.company.name).toBe('Company 2');
    });

    it('should apply take to results', async () => {
      const multiJobHtml = `
        <li>
          <div class="base-search-card__subtitle">Company 1</div>
          <div class="base-search-card__title">Job 1</div>
        </li>
        <li>
          <div class="base-search-card__subtitle">Company 2</div>
          <div class="base-search-card__title">Job 2</div>
        </li>
        <li>
          <div class="base-search-card__subtitle">Company 3</div>
          <div class="base-search-card__title">Job 3</div>
        </li>
      `;
      mockedAxios.get.mockResolvedValueOnce({ data: multiJobHtml });

      const result = await executeJobsQuery({}, { take: 2 });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].summary.company.name).toBe('Company 1');
      expect(result.results[1].summary.company.name).toBe('Company 2');
    });

    it('should apply both skip and take', async () => {
      const multiJobHtml = `
        <li>
          <div class="base-search-card__subtitle">Company 1</div>
          <div class="base-search-card__title">Job 1</div>
        </li>
        <li>
          <div class="base-search-card__subtitle">Company 2</div>
          <div class="base-search-card__title">Job 2</div>
        </li>
        <li>
          <div class="base-search-card__subtitle">Company 3</div>
          <div class="base-search-card__title">Job 3</div>
        </li>
      `;
      mockedAxios.get.mockResolvedValueOnce({ data: multiJobHtml });

      const result = await executeJobsQuery({}, { skip: 1, take: 1 });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].summary.company.name).toBe('Company 2');
    });
  });

  describe('validation', () => {
    it('should throw ValidationError for negative start', async () => {
      await expect(executeJobsQuery({}, { start: -1 }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative skip', async () => {
      await expect(executeJobsQuery({}, { skip: -1 }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative take', async () => {
      await expect(executeJobsQuery({}, { take: -1 }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid job type', async () => {
      await expect(executeJobsQuery({ jobType: 'invalid' as any }))
        .rejects.toThrow(ValidationError);
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
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      await expect(executeJobsQuery({})).rejects.toThrow(RateLimitError);
    });

    it('should throw NetworkError on other HTTP errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 500 },
        message: 'Server error',
      };
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      await expect(executeJobsQuery({})).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError on unknown errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Unknown'));

      await expect(executeJobsQuery({})).rejects.toThrow(NetworkError);
    });
  });

  describe('job parsing resilience', () => {
    it('should skip jobs that fail to parse individually', async () => {
      const htmlWithBadJob = `
        <li>
          <div class="base-search-card__subtitle">Good Company</div>
          <div class="base-search-card__title">Good Job</div>
          <a class="base-card__full-link" href="https://linkedin.com/jobs/view/100"></a>
        </li>
        <li>
          <!-- Empty li with no position or company -->
        </li>
        <li>
          <div class="base-search-card__subtitle">Another Company</div>
          <div class="base-search-card__title">Another Job</div>
          <a class="base-card__full-link" href="https://linkedin.com/jobs/view/200"></a>
        </li>
      `;
      mockedAxios.get.mockResolvedValueOnce({ data: htmlWithBadJob });

      const result = await executeJobsQuery({});

      expect(result.results).toHaveLength(2);
      expect(result.results[0].summary.position).toBe('Good Job');
      expect(result.results[1].summary.position).toBe('Another Job');
    });

    it('should return empty results when no valid jobs are found', async () => {
      const htmlWithNoValidJobs = `
        <li><!-- empty --></li>
        <li><!-- also empty --></li>
      `;
      mockedAxios.get.mockResolvedValueOnce({ data: htmlWithNoValidJobs });

      const result = await executeJobsQuery({});

      expect(result.results).toHaveLength(0);
    });
  });

  describe('response structure', () => {
    it('should return proper response structure', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockJobHtml });

      const result = await executeJobsQuery({ keyword: 'Test' }, { start: 0 });

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('metadata');
      expect(result.pagination).toHaveProperty('start');
      expect(result.pagination).toHaveProperty('responseCount');
      expect(result.pagination).toHaveProperty('resultsCount');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata).toHaveProperty('durationMs');
      expect(result.metadata).toHaveProperty('searchUrl');
    });
  });

  describe('config options', () => {
    it('should use custom timeout from config', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

      await executeJobsQuery({}, undefined, { timeout: 30000 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should use abort signal from config', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      const controller = new AbortController();

      await executeJobsQuery({}, undefined, { signal: controller.signal });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });
});

/**
 * Tests for the executeJobsQueryRawHtml function that returns the raw HTML
 * response from LinkedIn without parsing it into structured data.
 */

describe('executeJobsQueryRawHtml - raw HTML response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return raw HTML string without parsing', async () => {
    const rawHtml = '<html><body><li>Job 1</li></body></html>';
    mockedAxios.get.mockResolvedValueOnce({ data: rawHtml });

    const result = await executeJobsQueryRawHtml({ keyword: 'TypeScript' });

    expect(result).toBe(rawHtml);
  });

  it('should include search params in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQueryRawHtml({ keyword: 'React', location: 'NYC' });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('keywords=React');
    expect(url).toContain('location=NYC');
  });

  it('should include pagination start in URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });

    await executeJobsQueryRawHtml({}, { start: 25 });

    const url = mockedAxios.get.mock.calls[0][0] as string;
    expect(url).toContain('start=25');
  });

  it('should throw ValidationError for negative start', async () => {
    await expect(executeJobsQueryRawHtml({}, { start: -1 }))
      .rejects.toThrow(ValidationError);
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
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    await expect(executeJobsQueryRawHtml({})).rejects.toThrow(RateLimitError);
  });

  it('should throw NetworkError on HTTP errors', async () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 500 },
      message: 'Server error',
    };
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    await expect(executeJobsQueryRawHtml({})).rejects.toThrow(NetworkError);
  });
});

describe('executeJobsQuery - additional edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pagination validation edge cases', () => {
    it('should throw ValidationError for NaN start', async () => {
      await expect(executeJobsQuery({}, { start: NaN }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for NaN skip', async () => {
      await expect(executeJobsQuery({}, { skip: NaN }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for NaN take', async () => {
      await expect(executeJobsQuery({}, { take: NaN }))
        .rejects.toThrow(ValidationError);
    });

    it('should accept zero for start', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      const result = await executeJobsQuery({}, { start: 0 });
      expect(result.pagination.start).toBe(0);
    });

    it('should accept zero for skip', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      const result = await executeJobsQuery({}, { skip: 0 });
      expect(result.results).toHaveLength(0);
    });

    it('should accept zero for take', async () => {
      const html = `<li><div class="base-search-card__subtitle">Co</div><div class="base-search-card__title">Job</div></li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({}, { take: 0 });
      expect(result.results).toHaveLength(0);
      expect(result.pagination.responseCount).toBe(1);
    });
  });

  describe('parsing edge cases', () => {
    it('should skip job with empty company name (only whitespace)', async () => {
      const html = `<li><div class="base-search-card__subtitle">   </div><div class="base-search-card__title">Developer</div></li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results).toHaveLength(0);
    });

    it('should skip job with empty position name (only whitespace)', async () => {
      const html = `<li><div class="base-search-card__subtitle">Company</div><div class="base-search-card__title">   </div></li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results).toHaveLength(0);
    });

    it('should parse job with missing optional fields (logo, date, agoTime, salary)', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company X</div>
          <div class="base-search-card__title">Job Title</div>
          <a class="base-card__full-link" href="https://linkedin.com/jobs/view/999"></a>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results).toHaveLength(1);
      expect(result.results[0].summary.company.logoUrl).toBeUndefined();
      expect(result.results[0].posted.date).toBeUndefined();
      expect(result.results[0].posted.ago).toBeUndefined();
      expect(result.results[0].summary.salary).toBeUndefined();
    });

    it('should handle completely empty HTML document', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '' });
      const result = await executeJobsQuery({});
      expect(result.results).toHaveLength(0);
    });

    it('should normalize salary whitespace', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Co</div>
          <div class="base-search-card__title">Dev</div>
          <div class="job-search-card__salary-info">  $100k  -  $150k  </div>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.salary).toBe('$100k - $150k');
    });
  });

  describe('skip/take edge cases', () => {
    const threeJobsHtml = `
      <li><div class="base-search-card__subtitle">C1</div><div class="base-search-card__title">J1</div></li>
      <li><div class="base-search-card__subtitle">C2</div><div class="base-search-card__title">J2</div></li>
      <li><div class="base-search-card__subtitle">C3</div><div class="base-search-card__title">J3</div></li>
    `;

    it('should return empty when skip exceeds total results', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: threeJobsHtml });
      const result = await executeJobsQuery({}, { skip: 10 });
      expect(result.results).toHaveLength(0);
      expect(result.pagination.responseCount).toBe(3);
    });

    it('should return all when take exceeds available results', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: threeJobsHtml });
      const result = await executeJobsQuery({}, { take: 100 });
      expect(result.results).toHaveLength(3);
    });

    it('should report correct pagination metadata with skip and take', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: threeJobsHtml });
      const result = await executeJobsQuery({}, { skip: 1, take: 1 });
      expect(result.pagination.responseCount).toBe(3);
      expect(result.pagination.resultsCount).toBe(1);
      expect(result.pagination.skip).toBe(1);
      expect(result.pagination.take).toBe(1);
    });
  });

  describe('URL construction', () => {
    it('should build URL with all search params combined', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      await executeJobsQuery({
        keyword: 'TypeScript',
        location: 'NYC',
        jobType: 'full-time',
        experienceLevel: 'senior',
        minimumSalary: '100,000',
        workplaceType: 'remote',
        listingAge: 'past-week',
        geoId: '103644278',
        companyId: '1441',
      }, { start: 25 });

      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain('keywords=TypeScript');
      expect(url).toContain('location=NYC');
      expect(url).toContain('f_JT=F');
      expect(url).toContain('f_E=4');
      expect(url).toContain('f_SB2=4');
      expect(url).toContain('f_WT=2');
      expect(url).toContain('f_TPR=r604800');
      expect(url).toContain('geoId=103644278');
      expect(url).toContain('f_C=1441');
      expect(url).toContain('start=25');
    });

    it('should default start to 0 when not provided', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      await executeJobsQuery({});
      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain('start=0');
    });

    it('should not include undefined optional params in URL', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      await executeJobsQuery({});
      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).not.toContain('keywords=');
      expect(url).not.toContain('location=');
      expect(url).not.toContain('f_JT=');
      expect(url).not.toContain('f_E=');
    });
  });

  describe('query invocation with no params', () => {
    it('should work with no arguments at all', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html></html>' });
      const result = await executeJobsQuery();
      expect(result.results).toHaveLength(0);
      expect(result.pagination.start).toBe(0);
    });
  });

  describe('new field extraction', () => {
    it('should return isNew as undefined when time has only job-search-card__listdate class', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
          <time class="job-search-card__listdate" datetime="2024-01-15">2 weeks ago</time>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.isNew).toBeUndefined();
    });

    it('should return easyApply as undefined when no easy-apply-label element exists', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.easyApply).toBeUndefined();
    });

    it('should return highlight as undefined when no job-posting-benefits__text element', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.highlight).toBeUndefined();
    });

    it('should return company.slug as undefined when subtitle has no link', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.company.slug).toBeUndefined();
    });

    it('should extract agoTime with --new class variant', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
          <time class="job-search-card__listdate--new" datetime="2024-01-15">1 day ago</time>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].posted.ago).toBe('1 day ago');
    });

    it('should return location as undefined when missing', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.location).toBeUndefined();
    });

    it('should normalize highlight whitespace', async () => {
      const html = `
        <li>
          <div class="base-search-card__subtitle">Company</div>
          <div class="base-search-card__title">Job</div>
          <div class="job-posting-benefits"><span class="job-posting-benefits__text">  Actively   Hiring   </span></div>
        </li>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html });
      const result = await executeJobsQuery({});
      expect(result.results[0].summary.highlight).toBe('Actively Hiring');
    });
  });
});

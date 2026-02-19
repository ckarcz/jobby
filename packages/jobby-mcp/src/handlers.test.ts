import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSearch, mockGetDetailsByUrl, mockGetDetailsById } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockGetDetailsByUrl: vi.fn(),
  mockGetDetailsById: vi.fn(),
}));

vi.mock('jobby-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jobby-client')>();
  return {
    ...actual,
    JobbyClient: vi.fn(() => ({
      jobs: {
        queryForJobs: mockSearch,
        queryForJobDetailsByUrl: mockGetDetailsByUrl,
        queryForJobDetailsById: mockGetDetailsById,
      },
    })),
  };
});

import { handleError, handleSearchJobs, handleGetJobDetails } from './handlers.js';
import { JobbyError, ErrorCode, NetworkError, ValidationError, ParsingError } from 'jobby-client';

/**
 * Direct unit tests for MCP tool handler functions including error formatting,
 * search parameter forwarding, and job detail resolution logic.
 */

describe('handleError - error message formatting', () => {
  it('should format JobbyError with code prefix', () => {
    const error = new JobbyError(ErrorCode.RATE_LIMIT, 'Too many requests');
    expect(handleError(error)).toBe('[E_RATE_LIMIT] Too many requests');
  });

  it('should format NetworkError with code prefix', () => {
    const error = new NetworkError('Connection refused');
    expect(handleError(error)).toBe('[E_NETWORK] Connection refused');
  });

  it('should format ValidationError with code prefix', () => {
    const error = new ValidationError('Invalid parameter');
    expect(handleError(error)).toBe('[E_VALIDATION] Invalid parameter');
  });

  it('should format ParsingError with code prefix', () => {
    const error = new ParsingError('Failed to parse');
    expect(handleError(error)).toBe('[E_PARSE] Failed to parse');
  });

  it('should use message property for standard Error', () => {
    expect(handleError(new Error('standard error'))).toBe('standard error');
  });

  it('should use message for TypeError', () => {
    expect(handleError(new TypeError('type error'))).toBe('type error');
  });

  it('should convert string to string', () => {
    expect(handleError('string error')).toBe('string error');
  });

  it('should convert number to string', () => {
    expect(handleError(42)).toBe('42');
  });

  it('should convert null to string', () => {
    expect(handleError(null)).toBe('null');
  });

  it('should convert undefined to string', () => {
    expect(handleError(undefined)).toBe('undefined');
  });

  it('should convert boolean to string', () => {
    expect(handleError(false)).toBe('false');
  });

  it('should convert object to string', () => {
    expect(handleError({ key: 'value' })).toBe('[object Object]');
  });
});

describe('handleSearchJobs - search parameter forwarding', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockGetDetailsByUrl.mockReset();
    mockGetDetailsById.mockReset();
  });

  it('should pass all filter params to client', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

    await handleSearchJobs({
      keyword: 'TypeScript',
      location: 'NYC',
      jobType: 'full-time',
      experienceLevel: 'senior',
      minimumSalary: '100,000',
      workplaceType: 'remote',
      listingAge: 'past-week',
      geoId: '103644278',
      companyId: '1441',
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: 'TypeScript',
        location: 'NYC',
        jobType: 'full-time',
        experienceLevel: 'senior',
        minimumSalary: '100,000',
        workplaceType: 'remote',
        listingAge: 'past-week',
        geoId: '103644278',
        companyId: '1441',
      }),
      expect.any(Object),
    );
  });

  it('should pass pagination params separately', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

    await handleSearchJobs({
      keyword: 'React',
      start: 10,
      skip: 2,
      take: 5,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ start: 10, skip: 2, take: 5 }),
    );
  });

  it('should handle empty args (no filters)', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

    const result = await handleSearchJobs({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe('text');
  });

  it('should return JSON stringified response', async () => {
    const mockResponse = {
      results: [{ id: '1', summary: { position: 'Dev' } }],
      pagination: { start: 0 },
    };
    mockSearch.mockResolvedValueOnce(mockResponse);

    const result = await handleSearchJobs({ keyword: 'Dev' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.results[0].summary.position).toBe('Dev');
  });

  it('should return pretty-printed JSON (2-space indent)', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });
    const result = await handleSearchJobs({});
    const text = result.content[0].text;
    // JSON.stringify with null, 2 produces indented output
    expect(text).toContain('\n');
    expect(text).toContain('  ');
  });

  it('should return isError true on failure', async () => {
    mockSearch.mockRejectedValueOnce(new Error('fail'));
    const result = await handleSearchJobs({ keyword: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fail');
  });

  it('should prefix error text with "Error: "', async () => {
    mockSearch.mockRejectedValueOnce(new Error('connection timeout'));
    const result = await handleSearchJobs({ keyword: 'test' });
    expect(result.content[0].text).toMatch(/^Error: /);
  });

  it('should not include pagination keys in filter object', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

    await handleSearchJobs({
      keyword: 'Go',
      start: 0,
      skip: 1,
      take: 10,
    });

    const filterArg = mockSearch.mock.calls[0][0];
    expect(filterArg).not.toHaveProperty('start');
    expect(filterArg).not.toHaveProperty('skip');
    expect(filterArg).not.toHaveProperty('take');
  });

  it('should pass undefined filter fields when not provided', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

    await handleSearchJobs({ keyword: 'Python' });

    const filterArg = mockSearch.mock.calls[0][0];
    expect(filterArg.keyword).toBe('Python');
    expect(filterArg.location).toBeUndefined();
    expect(filterArg.jobType).toBeUndefined();
  });

  it('should pass undefined pagination fields when not provided', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

    await handleSearchJobs({ keyword: 'Rust' });

    const paginationArg = mockSearch.mock.calls[0][1];
    expect(paginationArg.start).toBeUndefined();
    expect(paginationArg.skip).toBeUndefined();
    expect(paginationArg.take).toBeUndefined();
  });

  it('should return content array with single text element', async () => {
    mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });
    const result = await handleSearchJobs({});
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });
});

describe('handleGetJobDetails - job detail resolution', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockGetDetailsByUrl.mockReset();
    mockGetDetailsById.mockReset();
  });

  it('should call queryForJobDetailsByUrl when jobUrl provided', async () => {
    mockGetDetailsByUrl.mockResolvedValueOnce({ id: '1', details: {} });
    await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/1' });
    expect(mockGetDetailsByUrl).toHaveBeenCalledWith('https://linkedin.com/jobs/view/1');
    expect(mockGetDetailsById).not.toHaveBeenCalled();
  });

  it('should call queryForJobDetailsById when only jobId provided', async () => {
    mockGetDetailsById.mockResolvedValueOnce({ id: '2', details: {} });
    await handleGetJobDetails({ jobId: '2' });
    expect(mockGetDetailsById).toHaveBeenCalledWith('2');
    expect(mockGetDetailsByUrl).not.toHaveBeenCalled();
  });

  it('should prefer jobUrl over jobId when both provided', async () => {
    mockGetDetailsByUrl.mockResolvedValueOnce({ id: '1', details: {} });
    await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/1', jobId: '1' });
    expect(mockGetDetailsByUrl).toHaveBeenCalled();
    expect(mockGetDetailsById).not.toHaveBeenCalled();
  });

  it('should return error when neither jobUrl nor jobId provided', async () => {
    const result = await handleGetJobDetails({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Either jobUrl or jobId is required');
  });

  it('should return error when both jobUrl and jobId are undefined', async () => {
    const result = await handleGetJobDetails({ jobUrl: undefined, jobId: undefined });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Either jobUrl or jobId is required');
  });

  it('should return isError true on fetch failure', async () => {
    mockGetDetailsByUrl.mockRejectedValueOnce(new Error('not found'));
    const result = await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('should return JSON response for successful fetch', async () => {
    const details = { id: '123', summary: { position: 'Engineer' }, details: { description: 'desc' } };
    mockGetDetailsByUrl.mockResolvedValueOnce(details);
    const result = await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/123' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.summary.position).toBe('Engineer');
  });

  it('should not set isError on success', async () => {
    mockGetDetailsByUrl.mockResolvedValueOnce({ id: '1', details: {} });
    const result = await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/1' });
    expect(result.isError).toBeUndefined();
  });

  it('should return pretty-printed JSON for details', async () => {
    const details = { id: '1', summary: { position: 'Dev' } };
    mockGetDetailsById.mockResolvedValueOnce(details);
    const result = await handleGetJobDetails({ jobId: '1' });
    const text = result.content[0].text;
    expect(text).toContain('\n');
    expect(text).toContain('  ');
  });

  it('should prefix error text with "Error: " on failure', async () => {
    mockGetDetailsById.mockRejectedValueOnce(new Error('timeout'));
    const result = await handleGetJobDetails({ jobId: '999' });
    expect(result.content[0].text).toMatch(/^Error: /);
  });

  it('should return content array with single text element on success', async () => {
    mockGetDetailsById.mockResolvedValueOnce({ id: '1' });
    const result = await handleGetJobDetails({ jobId: '1' });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });

  it('should return content array with single text element on error', async () => {
    const result = await handleGetJobDetails({});
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });

  it('should call queryForJobDetailsById when jobId is empty string (schema rejects this, but handler uses explicit undefined check)', async () => {
    mockGetDetailsById.mockResolvedValueOnce({ id: '' });
    // With explicit undefined checks, empty string is not undefined,
    // so the handler treats it as a provided value and delegates to the client.
    // In practice the schema's min(1) rejects empty strings before reaching the handler.
    await handleGetJobDetails({ jobId: '' });
    expect(mockGetDetailsById).toHaveBeenCalledWith('');
  });

  it('should handle JobbyError thrown from queryForJobDetailsByUrl', async () => {
    mockGetDetailsByUrl.mockRejectedValueOnce(new JobbyError(ErrorCode.NETWORK, 'Network failure'));
    const result = await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('E_NETWORK');
    expect(result.content[0].text).toContain('Network failure');
  });

  it('should include benefitsInfo and incentiveInfo in JSON response', async () => {
    const details = {
      id: '123',
      url: 'https://www.linkedin.com/jobs/view/123',
      summary: { position: 'Engineer', company: { name: 'Co' } },
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
    };
    mockGetDetailsByUrl.mockResolvedValueOnce(details);
    const result = await handleGetJobDetails({ jobUrl: 'https://linkedin.com/jobs/view/123' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.details.benefitsInfo).toBe('Benefits Eligible: Yes');
    expect(parsed.details.incentiveInfo).toBe('Bonus Eligible: Yes');
  });

  it('should include undefined benefitsInfo and incentiveInfo when absent', async () => {
    const details = {
      id: '123',
      summary: { position: 'Engineer' },
      details: {
        description: 'A job',
        benefitsInfo: undefined,
        incentiveInfo: undefined,
      },
    };
    mockGetDetailsById.mockResolvedValueOnce(details);
    const result = await handleGetJobDetails({ jobId: '123' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.details.benefitsInfo).toBeUndefined();
    expect(parsed.details.incentiveInfo).toBeUndefined();
  });

  it('should handle non-Error thrown value from queryForJobDetailsById', async () => {
    mockGetDetailsById.mockRejectedValueOnce('raw string error');
    const result = await handleGetJobDetails({ jobId: '42' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('raw string error');
  });
});

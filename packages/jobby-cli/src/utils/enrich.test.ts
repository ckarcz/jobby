import { describe, it, expect, vi } from 'vitest';
import type { Job, JobDetails } from 'jobby-client';
import { fetchDetailsInBatches } from './enrich.js';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '123',
    url: 'https://linkedin.com/jobs/view/123',
    summary: {
      position: 'Engineer',
      location: 'Remote',
      company: {
        name: 'TestCo',
        slug: undefined,
        pageUrl: undefined,
        logoUrl: undefined,
      },
      salary: undefined,
      highlight: undefined,
      isNew: undefined,
      easyApply: undefined,
    },
    posted: {
      date: undefined,
      ago: undefined,
    },
    ...overrides,
  };
}

const mockDetails: JobDetails = {
  id: '123',
  url: 'https://linkedin.com/jobs/view/123',
  summary: {
    position: 'Engineer',
    location: 'Remote',
    company: {
      name: 'TestCo',
      pageUrl: undefined,
      logoUrl: undefined,
      slug: undefined,
    },
    salary: undefined,
    highlight: undefined,
    isNew: undefined,
    easyApply: undefined,
  },
  posted: {
    date: undefined,
    ago: '2 days ago',
  },
  details: {
    description: 'A great job',
    salary: undefined,
    location: 'Remote',
    workplaceType: 'Remote',
    employmentType: 'Full-time',
    seniorityLevel: 'Mid-Senior level',
    applicants: '50',
    industry: 'Technology',
    jobFunction: 'Engineering',
    experienceRequired: undefined,
    educationRequired: undefined,
    applyUrl: undefined,
    applyText: undefined,
    shortDescription: undefined,
    sharingImageUrl: undefined,
    benefitsInfo: undefined,
    incentiveInfo: undefined,
  },
};

describe('fetchDetailsInBatches', () => {
  it('should return empty array for empty input', async () => {
    const fetchFn = vi.fn();
    const result = await fetchDetailsInBatches([], fetchFn);
    expect(result).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should fetch details for each job and merge results', async () => {
    const jobs = [makeJob({ id: '1' }), makeJob({ id: '2' })];
    const fetchFn = vi.fn().mockResolvedValue(mockDetails);

    const result = await fetchDetailsInBatches(jobs, fetchFn, { delayMs: 0 });

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('1');
    expect(result[0]!.details).toEqual(mockDetails.details);
    expect(result[1]!.id).toBe('2');
    expect(result[1]!.details).toEqual(mockDetails.details);
  });

  it('should respect batch size', async () => {
    const jobs = [
      makeJob({ id: '1' }),
      makeJob({ id: '2' }),
      makeJob({ id: '3' }),
      makeJob({ id: '4' }),
      makeJob({ id: '5' }),
    ];
    const callOrder: string[] = [];
    const fetchFn = vi.fn().mockImplementation((id: string) => {
      callOrder.push(id);
      return Promise.resolve(mockDetails);
    });

    await fetchDetailsInBatches(jobs, fetchFn, { batchSize: 2, delayMs: 0 });

    expect(fetchFn).toHaveBeenCalledTimes(5);
    // All 5 should have been called
    expect(callOrder).toEqual(['1', '2', '3', '4', '5']);
  });

  it('should yield null details for failed fetches', async () => {
    const jobs = [makeJob({ id: '1' }), makeJob({ id: '2' })];
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(mockDetails)
      .mockRejectedValueOnce(new Error('rate limited'));
    const onWarn = vi.fn();

    const result = await fetchDetailsInBatches(jobs, fetchFn, { delayMs: 0, onWarn });

    expect(result[0]!.details).toEqual(mockDetails.details);
    expect(result[1]!.details).toBeNull();
  });

  it('should use job id when fetching details', async () => {
    const jobs = [makeJob({ id: '42', url: 'https://linkedin.com/jobs/view/42' })];
    const fetchFn = vi.fn().mockResolvedValue(mockDetails);

    await fetchDetailsInBatches(jobs, fetchFn, { delayMs: 0 });

    expect(fetchFn).toHaveBeenCalledWith('42');
  });

  it('should process multiple batches correctly', async () => {
    const jobs = [
      makeJob({ id: '1' }),
      makeJob({ id: '2' }),
      makeJob({ id: '3' }),
      makeJob({ id: '4' }),
    ];
    const fetchFn = vi.fn().mockResolvedValue(mockDetails);

    const result = await fetchDetailsInBatches(jobs, fetchFn, { batchSize: 2, delayMs: 0 });

    expect(result).toHaveLength(4);
    expect(result[0]!.id).toBe('1');
    expect(result[1]!.id).toBe('2');
    expect(result[2]!.id).toBe('3');
    expect(result[3]!.id).toBe('4');
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('should handle mixed fulfilled and rejected in same batch via Promise.allSettled', async () => {
    const jobs = [
      makeJob({ id: '1' }),
      makeJob({ id: '2' }),
      makeJob({ id: '3' }),
    ];
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(mockDetails)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(mockDetails);
    const onWarn = vi.fn();

    const result = await fetchDetailsInBatches(jobs, fetchFn, { batchSize: 3, delayMs: 0, onWarn });

    expect(result).toHaveLength(3);
    expect(result[0]!.details).toEqual(mockDetails.details);
    expect(result[1]!.details).toBeNull();
    expect(result[2]!.details).toEqual(mockDetails.details);
  });

  it('should handle all fetches failing', async () => {
    const jobs = [makeJob({ id: '1' }), makeJob({ id: '2' })];
    const fetchFn = vi.fn().mockRejectedValue(new Error('failed'));
    const onWarn = vi.fn();

    const result = await fetchDetailsInBatches(jobs, fetchFn, { delayMs: 0, onWarn });

    expect(result).toHaveLength(2);
    expect(result[0]!.details).toBeNull();
    expect(result[1]!.details).toBeNull();
  });

  it('should call onWarn for each failed detail fetch', async () => {
    const jobs = [makeJob({ id: '1' }), makeJob({ id: '2' })];
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(mockDetails)
      .mockRejectedValueOnce(new Error('rate limited'));
    const onWarn = vi.fn();

    await fetchDetailsInBatches(jobs, fetchFn, { delayMs: 0, onWarn });

    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onWarn).toHaveBeenCalledWith(expect.stringContaining('job 2'));
    expect(onWarn).toHaveBeenCalledWith(expect.stringContaining('rate limited'));
  });

  it('should call onWarn for every failed fetch in a batch', async () => {
    const jobs = [makeJob({ id: '1' }), makeJob({ id: '2' }), makeJob({ id: '3' })];
    const fetchFn = vi.fn().mockRejectedValue(new Error('failed'));
    const onWarn = vi.fn();

    await fetchDetailsInBatches(jobs, fetchFn, { batchSize: 3, delayMs: 0, onWarn });

    expect(onWarn).toHaveBeenCalledTimes(3);
  });

  it('should not call onWarn for successful fetches', async () => {
    const jobs = [makeJob({ id: '1' }), makeJob({ id: '2' })];
    const fetchFn = vi.fn().mockResolvedValue(mockDetails);
    const onWarn = vi.fn();

    await fetchDetailsInBatches(jobs, fetchFn, { delayMs: 0, onWarn });

    expect(onWarn).not.toHaveBeenCalled();
  });
});

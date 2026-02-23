import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobSearchBuilder } from './job-search-builder.js';
import { createLogger } from '../logging.js';
import type { RetryConfig } from '../utils/retry.js';

// Mock the jobs query module
vi.mock('../queries/jobs-query.js', () => ({
  executeJobsQuery: vi.fn().mockResolvedValue({
    results: [],
    pagination: { start: 0, responseCount: 0, resultsCount: 0 },
    metadata: { query: {}, timestamp: new Date(), durationMs: 100 },
  }),
}));

// Mock the retry module — passthrough by default
vi.mock('../utils/retry.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/retry.js')>();
  return {
    ...original,
    withRetry: vi.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
  };
});

/**
 * Tests for the JobSearchBuilder fluent API that provides a chainable
 * interface for constructing job search queries with filters, pagination,
 * and execution against the LinkedIn API.
 */

describe('JobSearchBuilder - fluent search query construction API', () => {
  let builder: JobSearchBuilder;

  beforeEach(() => {
    builder = new JobSearchBuilder();
  });

  describe('constructor', () => {
    it('should create builder without config', () => {
      const builder = new JobSearchBuilder();
      expect(builder).toBeInstanceOf(JobSearchBuilder);
    });

    it('should create builder with config', () => {
      const builder = new JobSearchBuilder({ timeout: 5000 });
      expect(builder).toBeInstanceOf(JobSearchBuilder);
    });
  });

  describe('withKeyword', () => {
    it('should set keyword and return this for chaining', () => {
      const result = builder.withKeyword('TypeScript');
      expect(result).toBe(builder);
      expect(builder.getSearchParams().keyword).toBe('TypeScript');
    });
  });

  describe('withLocation', () => {
    it('should set location and return this for chaining', () => {
      const result = builder.withLocation('San Francisco');
      expect(result).toBe(builder);
      expect(builder.getSearchParams().location).toBe('San Francisco');
    });
  });

  describe('withJobType', () => {
    it('should set single job type', () => {
      builder.withJobType('full-time');
      expect(builder.getSearchParams().jobType).toBe('full-time');
    });

    it('should set multiple job types', () => {
      builder.withJobType(['full-time', 'contract']);
      expect(builder.getSearchParams().jobType).toEqual(['full-time', 'contract']);
    });
  });

  describe('withExperience', () => {
    it('should set single experience level', () => {
      builder.withExperience('senior');
      expect(builder.getSearchParams().experienceLevel).toBe('senior');
    });

    it('should set multiple experience levels', () => {
      builder.withExperience(['entry-level', 'associate']);
      expect(builder.getSearchParams().experienceLevel).toEqual(['entry-level', 'associate']);
    });
  });

  describe('withMinSalary', () => {
    it('should set minimum salary', () => {
      builder.withMinSalary('100,000');
      expect(builder.getSearchParams().minimumSalary).toBe('100,000');
    });
  });

  describe('withWorkplaceType', () => {
    it('should set single workplace type', () => {
      builder.withWorkplaceType('remote');
      expect(builder.getSearchParams().workplaceType).toBe('remote');
    });

    it('should set multiple workplace types', () => {
      builder.withWorkplaceType(['remote', 'hybrid']);
      expect(builder.getSearchParams().workplaceType).toEqual(['remote', 'hybrid']);
    });
  });

  describe('withListingAge', () => {
    it('should set listing age', () => {
      builder.withListingAge('past-week');
      expect(builder.getSearchParams().listingAge).toBe('past-week');
    });
  });

  describe('withGeoId', () => {
    it('should set geo ID and return this for chaining', () => {
      const result = builder.withGeoId('103644278');
      expect(result).toBe(builder);
      expect(builder.getSearchParams().geoId).toBe('103644278');
    });
  });

  describe('withCompanyId', () => {
    it('should set company ID and return this for chaining', () => {
      const result = builder.withCompanyId('1441');
      expect(result).toBe(builder);
      expect(builder.getSearchParams().companyId).toBe('1441');
    });
  });

  describe('pagination methods', () => {
    describe('startResults', () => {
      it('should set start offset', () => {
        builder.startResults(25);
        expect(builder.getPaginationParams().start).toBe(25);
      });
    });

    describe('skipResults', () => {
      it('should set skip value', () => {
        builder.skipResults(5);
        expect(builder.getPaginationParams().skip).toBe(5);
      });
    });

    describe('takeResults', () => {
      it('should set take value', () => {
        builder.takeResults(10);
        expect(builder.getPaginationParams().take).toBe(10);
      });
    });
  });

  describe('chaining', () => {
    it('should support full fluent chaining', () => {
      const result = builder
        .withKeyword('React')
        .withLocation('New York')
        .withJobType('full-time')
        .withExperience('senior')
        .withMinSalary('120,000')
        .withWorkplaceType('remote')
        .withListingAge('past-week')
        .withGeoId('103644278')
        .withCompanyId('1441')
        .startResults(0)
        .skipResults(0)
        .takeResults(10);

      expect(result).toBe(builder);

      const searchParams = builder.getSearchParams();
      expect(searchParams.keyword).toBe('React');
      expect(searchParams.location).toBe('New York');
      expect(searchParams.jobType).toBe('full-time');
      expect(searchParams.experienceLevel).toBe('senior');
      expect(searchParams.minimumSalary).toBe('120,000');
      expect(searchParams.workplaceType).toBe('remote');
      expect(searchParams.listingAge).toBe('past-week');
      expect(searchParams.geoId).toBe('103644278');
      expect(searchParams.companyId).toBe('1441');

      const paginationParams = builder.getPaginationParams();
      expect(paginationParams.start).toBe(0);
      expect(paginationParams.skip).toBe(0);
      expect(paginationParams.take).toBe(10);
    });
  });

  describe('getSearchParams', () => {
    it('should return a copy of search params', () => {
      builder.withKeyword('Test');
      const params1 = builder.getSearchParams();
      const params2 = builder.getSearchParams();
      expect(params1).toEqual(params2);
      expect(params1).not.toBe(params2);
    });
  });

  describe('getPaginationParams', () => {
    it('should return a copy of pagination params', () => {
      builder.takeResults(5);
      const params1 = builder.getPaginationParams();
      const params2 = builder.getPaginationParams();
      expect(params1).toEqual(params2);
      expect(params1).not.toBe(params2);
    });
  });

  describe('execute', () => {
    it('should call executeJobsQuery with params', async () => {
      const { executeJobsQuery } = await import('../queries/jobs-query.js');

      builder
        .withKeyword('Python')
        .withLocation('Remote')
        .takeResults(5);

      await builder.execute();

      expect(executeJobsQuery).toHaveBeenCalled();
    });

    it('should wrap executeJobsQuery with withRetry using default retry config', async () => {
      const { withRetry, DEFAULT_RETRY_CONFIG } = await import('../utils/retry.js');

      await builder.withKeyword('Test').execute();

      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), DEFAULT_RETRY_CONFIG);
    });

    it('should wrap executeJobsQuery with withRetry using provided retry config', async () => {
      const { withRetry } = await import('../utils/retry.js');
      const customRetry: RetryConfig = { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000 };
      const retryBuilder = JobSearchBuilder._fromResolved(
        (await import('../config.js')).resolveConfig(),
        createLogger(),
        customRetry,
      );

      await retryBuilder.withKeyword('Test').execute();

      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), customRetry);
    });
  });

  describe('parameter overwriting', () => {
    it('should overwrite keyword when called twice', () => {
      builder.withKeyword('first').withKeyword('second');
      expect(builder.getSearchParams().keyword).toBe('second');
    });

    it('should overwrite location when called twice', () => {
      builder.withLocation('NYC').withLocation('SF');
      expect(builder.getSearchParams().location).toBe('SF');
    });

    it('should overwrite job type when called twice', () => {
      builder.withJobType('full-time').withJobType('contract');
      expect(builder.getSearchParams().jobType).toBe('contract');
    });

    it('should overwrite take when called twice', () => {
      builder.takeResults(5).takeResults(10);
      expect(builder.getPaginationParams().take).toBe(10);
    });
  });

  describe('empty builder defaults', () => {
    it('should have empty search params by default', () => {
      const params = builder.getSearchParams();
      expect(params).toEqual({});
    });

    it('should have empty pagination params by default', () => {
      const params = builder.getPaginationParams();
      expect(params).toEqual({});
    });
  });

  describe('defensive copies', () => {
    it('should not affect builder when modifying returned search params', () => {
      builder.withKeyword('Test');
      const params = builder.getSearchParams();
      (params as any).keyword = 'Modified';
      expect(builder.getSearchParams().keyword).toBe('Test');
    });

    it('should not affect builder when modifying returned pagination params', () => {
      builder.takeResults(5);
      const params = builder.getPaginationParams();
      (params as any).take = 999;
      expect(builder.getPaginationParams().take).toBe(5);
    });
  });
});

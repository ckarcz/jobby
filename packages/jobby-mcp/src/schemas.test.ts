import { describe, it, expect } from 'vitest';
import { SearchInputSchema, JobDetailsInputSchema } from './schemas.js';

/**
 * Tests for MCP tool input schemas validating that enum constraints,
 * optional fields, and type coercion behave correctly.
 */

describe('SearchInputSchema - search tool input validation', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = SearchInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid keyword and location', () => {
    const result = SearchInputSchema.safeParse({ keyword: 'TypeScript', location: 'NYC' });
    expect(result.success).toBe(true);
    expect(result.data?.keyword).toBe('TypeScript');
    expect(result.data?.location).toBe('NYC');
  });

  describe('jobType enum validation', () => {
    it('should accept valid job type "full-time"', () => {
      const result = SearchInputSchema.safeParse({ jobType: 'full-time' });
      expect(result.success).toBe(true);
    });

    it('should accept valid job type "contract"', () => {
      const result = SearchInputSchema.safeParse({ jobType: 'contract' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid job type', () => {
      const result = SearchInputSchema.safeParse({ jobType: 'invalid-type' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid job types', () => {
      const validTypes = ['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship', 'other'];
      for (const type of validTypes) {
        const result = SearchInputSchema.safeParse({ jobType: type });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('experienceLevel enum validation', () => {
    it('should accept valid experience level "senior"', () => {
      const result = SearchInputSchema.safeParse({ experienceLevel: 'senior' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid experience level', () => {
      const result = SearchInputSchema.safeParse({ experienceLevel: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid experience levels', () => {
      const validLevels = ['internship', 'entry-level', 'associate', 'senior', 'director', 'executive'];
      for (const level of validLevels) {
        const result = SearchInputSchema.safeParse({ experienceLevel: level });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('minimumSalary enum validation', () => {
    it('should accept valid minimum salary "100,000"', () => {
      const result = SearchInputSchema.safeParse({ minimumSalary: '100,000' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid minimum salary', () => {
      const result = SearchInputSchema.safeParse({ minimumSalary: '50000' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid salary thresholds', () => {
      const validSalaries = ['40,000', '60,000', '80,000', '100,000', '120,000', '140,000', '160,000', '180,000', '200,000'];
      for (const salary of validSalaries) {
        const result = SearchInputSchema.safeParse({ minimumSalary: salary });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('workplaceType enum validation', () => {
    it('should accept valid workplace type "remote"', () => {
      const result = SearchInputSchema.safeParse({ workplaceType: 'remote' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid workplace type', () => {
      const result = SearchInputSchema.safeParse({ workplaceType: 'anywhere' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid workplace types', () => {
      const validTypes = ['on-site', 'remote', 'hybrid'];
      for (const type of validTypes) {
        const result = SearchInputSchema.safeParse({ workplaceType: type });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('listingAge enum validation', () => {
    it('should accept valid listing age "past-week"', () => {
      const result = SearchInputSchema.safeParse({ listingAge: 'past-week' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid listing age', () => {
      const result = SearchInputSchema.safeParse({ listingAge: 'past-year' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid listing ages', () => {
      const validAges = ['past-24-hours', 'past-week', 'past-month'];
      for (const age of validAges) {
        const result = SearchInputSchema.safeParse({ listingAge: age });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('pagination fields', () => {
    it('should accept valid pagination numbers', () => {
      const result = SearchInputSchema.safeParse({ start: 0, skip: 5, take: 10 });
      expect(result.success).toBe(true);
      expect(result.data?.start).toBe(0);
      expect(result.data?.skip).toBe(5);
      expect(result.data?.take).toBe(10);
    });

    it('should reject non-number pagination values', () => {
      const result = SearchInputSchema.safeParse({ start: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should reject non-number skip value', () => {
      const result = SearchInputSchema.safeParse({ skip: true });
      expect(result.success).toBe(false);
    });

    it('should reject non-number take value', () => {
      const result = SearchInputSchema.safeParse({ take: null });
      expect(result.success).toBe(false);
    });

    it('should accept negative numbers (no min validation at schema level)', () => {
      const result = SearchInputSchema.safeParse({ start: -1, skip: -5, take: -10 });
      expect(result.success).toBe(true);
    });

    it('should accept zero values for pagination', () => {
      const result = SearchInputSchema.safeParse({ start: 0, skip: 0, take: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe('string filter fields', () => {
    it('should accept geoId as string', () => {
      const result = SearchInputSchema.safeParse({ geoId: '103644278' });
      expect(result.success).toBe(true);
      expect(result.data?.geoId).toBe('103644278');
    });

    it('should accept companyId as string', () => {
      const result = SearchInputSchema.safeParse({ companyId: '1441' });
      expect(result.success).toBe(true);
      expect(result.data?.companyId).toBe('1441');
    });

    it('should reject non-string geoId', () => {
      const result = SearchInputSchema.safeParse({ geoId: 103644278 });
      expect(result.success).toBe(false);
    });

    it('should reject non-string companyId', () => {
      const result = SearchInputSchema.safeParse({ companyId: 1441 });
      expect(result.success).toBe(false);
    });

    it('should accept empty strings for keyword and location', () => {
      const result = SearchInputSchema.safeParse({ keyword: '', location: '' });
      expect(result.success).toBe(true);
    });
  });

  describe('unknown fields', () => {
    it('should strip unknown fields', () => {
      const result = SearchInputSchema.safeParse({ keyword: 'Go', unknownField: 'value' });
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('unknownField');
    });
  });

  describe('all fields combined', () => {
    it('should accept a fully populated search input', () => {
      const result = SearchInputSchema.safeParse({
        keyword: 'TypeScript',
        location: 'San Francisco',
        jobType: 'full-time',
        experienceLevel: 'senior',
        minimumSalary: '120,000',
        workplaceType: 'remote',
        listingAge: 'past-week',
        geoId: '103644278',
        companyId: '1441',
        start: 0,
        skip: 0,
        take: 25,
      });
      expect(result.success).toBe(true);
    });

    it('should parse all fields correctly in fully populated input', () => {
      const input = {
        keyword: 'Python',
        location: 'London',
        jobType: 'contract' as const,
        experienceLevel: 'associate' as const,
        minimumSalary: '80,000' as const,
        workplaceType: 'hybrid' as const,
        listingAge: 'past-24-hours' as const,
        geoId: '101165590',
        companyId: '1035',
        start: 25,
        skip: 3,
        take: 10,
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });
  });
});

describe('JobDetailsInputSchema - job details tool input validation', () => {
  it('should accept empty object (all fields optional at schema level)', () => {
    const result = JobDetailsInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept jobUrl only', () => {
    const result = JobDetailsInputSchema.safeParse({ jobUrl: 'https://linkedin.com/jobs/view/123' });
    expect(result.success).toBe(true);
    expect(result.data?.jobUrl).toBe('https://linkedin.com/jobs/view/123');
  });

  it('should accept jobId only', () => {
    const result = JobDetailsInputSchema.safeParse({ jobId: '123456' });
    expect(result.success).toBe(true);
    expect(result.data?.jobId).toBe('123456');
  });

  it('should accept both jobUrl and jobId', () => {
    const result = JobDetailsInputSchema.safeParse({
      jobUrl: 'https://linkedin.com/jobs/view/123',
      jobId: '123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-string jobUrl', () => {
    const result = JobDetailsInputSchema.safeParse({ jobUrl: 123 });
    expect(result.success).toBe(false);
  });

  it('should reject non-string jobId', () => {
    const result = JobDetailsInputSchema.safeParse({ jobId: 123 });
    expect(result.success).toBe(false);
  });

  it('should accept any string as jobUrl (validation happens in handler)', () => {
    const result = JobDetailsInputSchema.safeParse({ jobUrl: 'not-a-real-url' });
    expect(result.success).toBe(true);
  });

  it('should accept any string as jobId (validation happens in handler)', () => {
    const result = JobDetailsInputSchema.safeParse({ jobId: '' });
    expect(result.success).toBe(true);
  });

  it('should reject boolean jobUrl', () => {
    const result = JobDetailsInputSchema.safeParse({ jobUrl: true });
    expect(result.success).toBe(false);
  });

  it('should reject null jobId', () => {
    const result = JobDetailsInputSchema.safeParse({ jobId: null });
    expect(result.success).toBe(false);
  });

  it('should strip unknown fields', () => {
    const result = JobDetailsInputSchema.safeParse({ jobId: '1', extra: 'field' });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('extra');
  });

  it('should preserve both fields when both provided', () => {
    const result = JobDetailsInputSchema.safeParse({
      jobUrl: 'https://linkedin.com/jobs/view/456',
      jobId: '456',
    });
    expect(result.success).toBe(true);
    expect(result.data?.jobUrl).toBe('https://linkedin.com/jobs/view/456');
    expect(result.data?.jobId).toBe('456');
  });
});

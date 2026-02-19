import { describe, it, expect } from 'vitest';
import { normalizeJobSearchParams, normalizePaginationParams } from './normalize.js';
import { ValidationError } from '../types/errors.js';

/**
 * Tests for parameter normalization functions that validate, sanitize,
 * and transform user-provided search and pagination inputs before
 * they are used to construct LinkedIn API requests.
 */

describe('normalize utilities - search and pagination parameter validation', () => {
  describe('normalizeJobSearchParams', () => {
    it('should return empty object for empty params', () => {
      const result = normalizeJobSearchParams({});
      expect(result).toEqual({
        keyword: undefined,
        location: undefined,
        jobType: undefined,
        experienceLevel: undefined,
        minimumSalary: undefined,
        workplaceType: undefined,
        listingAge: undefined,
        geoId: undefined,
        companyId: undefined,
      });
    });

    it('should preserve keyword with spaces for URLSearchParams encoding', () => {
      const result = normalizeJobSearchParams({ keyword: 'software engineer' });
      expect(result.keyword).toBe('software engineer');
    });

    it('should trim keyword but preserve inner spaces', () => {
      const result = normalizeJobSearchParams({ keyword: '  multiple   spaces  ' });
      expect(result.keyword).toBe('multiple   spaces');
    });

    it('should preserve location with spaces for URLSearchParams encoding', () => {
      const result = normalizeJobSearchParams({ location: 'New York' });
      expect(result.location).toBe('New York');
    });

    it('should validate job type', () => {
      const result = normalizeJobSearchParams({ jobType: 'full-time' });
      expect(result.jobType).toBe('full-time');
    });

    it('should validate job type array', () => {
      const result = normalizeJobSearchParams({ jobType: ['full-time', 'contract'] });
      expect(result.jobType).toEqual(['full-time', 'contract']);
    });

    it('should throw for invalid job type', () => {
      expect(() => normalizeJobSearchParams({ jobType: 'invalid' as any }))
        .toThrow(ValidationError);
    });

    it('should throw for invalid value within job type array', () => {
      expect(() => normalizeJobSearchParams({ jobType: ['full-time', 'invalid' as any] }))
        .toThrow(ValidationError);
    });

    it('should validate experience level', () => {
      const result = normalizeJobSearchParams({ experienceLevel: 'senior' });
      expect(result.experienceLevel).toBe('senior');
    });

    it('should validate experience level array', () => {
      const result = normalizeJobSearchParams({ experienceLevel: ['entry-level', 'senior'] });
      expect(result.experienceLevel).toEqual(['entry-level', 'senior']);
    });

    it('should throw for invalid experience level', () => {
      expect(() => normalizeJobSearchParams({ experienceLevel: 'invalid' as any }))
        .toThrow(ValidationError);
    });

    it('should validate minimum salary', () => {
      const result = normalizeJobSearchParams({ minimumSalary: '100,000' });
      expect(result.minimumSalary).toBe('100,000');
    });

    it('should throw for invalid minimum salary', () => {
      expect(() => normalizeJobSearchParams({ minimumSalary: '50000' as any }))
        .toThrow(ValidationError);
    });

    it('should validate workplace type', () => {
      const result = normalizeJobSearchParams({ workplaceType: 'remote' });
      expect(result.workplaceType).toBe('remote');
    });

    it('should validate workplace type array', () => {
      const result = normalizeJobSearchParams({ workplaceType: ['remote', 'hybrid'] });
      expect(result.workplaceType).toEqual(['remote', 'hybrid']);
    });

    it('should throw for invalid workplace type', () => {
      expect(() => normalizeJobSearchParams({ workplaceType: 'invalid' as any }))
        .toThrow(ValidationError);
    });

    it('should validate listing age', () => {
      const result = normalizeJobSearchParams({ listingAge: 'past-week' });
      expect(result.listingAge).toBe('past-week');
    });

    it('should throw for invalid listing age', () => {
      expect(() => normalizeJobSearchParams({ listingAge: 'invalid' as any }))
        .toThrow(ValidationError);
    });

    it('should pass through geoId', () => {
      const result = normalizeJobSearchParams({ geoId: '103644278' });
      expect(result.geoId).toBe('103644278');
    });

    it('should pass through companyId', () => {
      const result = normalizeJobSearchParams({ companyId: '1441' });
      expect(result.companyId).toBe('1441');
    });
  });

  describe('normalizePaginationParams', () => {
    it('should return empty object for empty params', () => {
      const result = normalizePaginationParams({});
      expect(result).toEqual({
        start: undefined,
        skip: undefined,
        take: undefined,
      });
    });

    it('should pass through start value', () => {
      const result = normalizePaginationParams({ start: 25 });
      expect(result.start).toBe(25);
    });

    it('should pass through skip value', () => {
      const result = normalizePaginationParams({ skip: 5 });
      expect(result.skip).toBe(5);
    });

    it('should pass through take value', () => {
      const result = normalizePaginationParams({ take: 10 });
      expect(result.take).toBe(10);
    });
  });

  describe('error message formatting', () => {
    it('should include field name in validation error message', () => {
      try {
        normalizeJobSearchParams({ jobType: 'invalid' as any });
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('jobType');
      }
    });

    it('should mention workplaceType in error message for invalid enum', () => {
      try {
        normalizeJobSearchParams({ workplaceType: 'invalid' as any });
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('workplaceType');
      }
    });
  });

  describe('keyword and location normalization edge cases', () => {
    it('should preserve tabs in keyword for URLSearchParams encoding', () => {
      const result = normalizeJobSearchParams({ keyword: 'software\tengineer' });
      expect(result.keyword).toBe('software\tengineer');
    });

    it('should preserve newlines in location for URLSearchParams encoding', () => {
      const result = normalizeJobSearchParams({ location: 'New\nYork' });
      expect(result.location).toBe('New\nYork');
    });

    it('should normalize leading and trailing whitespace', () => {
      const result = normalizeJobSearchParams({ keyword: '  React  ' });
      expect(result.keyword).toBe('React');
    });
  });
});

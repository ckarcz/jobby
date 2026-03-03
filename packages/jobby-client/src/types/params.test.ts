import { describe, it, expect } from 'vitest';
import {
  getApiValue,
  getKeys,
  normalizeMinimumSalaryInput,
  JOB_TYPE_MAPPING,
  EXPERIENCE_LEVEL_MAPPING,
  MINIMUM_SALARY_MAPPING,
  WORKPLACE_TYPE_MAPPING,
  LISTING_AGE_MAPPING,
  JOB_TYPE_CHOICES,
  EXPERIENCE_LEVEL_CHOICES,
  MINIMUM_SALARY_CHOICES,
  WORKPLACE_TYPE_CHOICES,
  LISTING_AGE_CHOICES,
} from './params.js';

/**
 * Tests for parameter mapping utilities that translate human-readable filter
 * keys (e.g. 'full-time', 'remote') into LinkedIn API query parameter values.
 */

describe('parameter mapping utilities - API value lookup and key validation', () => {
  describe('getApiValue', () => {
    it('should return API value for job type', () => {
      expect(getApiValue(JOB_TYPE_MAPPING, 'full-time')).toBe('F');
      expect(getApiValue(JOB_TYPE_MAPPING, 'part-time')).toBe('P');
      expect(getApiValue(JOB_TYPE_MAPPING, 'contract')).toBe('C');
      expect(getApiValue(JOB_TYPE_MAPPING, 'temporary')).toBe('T');
      expect(getApiValue(JOB_TYPE_MAPPING, 'volunteer')).toBe('V');
      expect(getApiValue(JOB_TYPE_MAPPING, 'internship')).toBe('I');
      expect(getApiValue(JOB_TYPE_MAPPING, 'other')).toBe('O');
    });

    it('should return API value for experience level', () => {
      expect(getApiValue(EXPERIENCE_LEVEL_MAPPING, 'internship')).toBe('1');
      expect(getApiValue(EXPERIENCE_LEVEL_MAPPING, 'entry-level')).toBe('2');
      expect(getApiValue(EXPERIENCE_LEVEL_MAPPING, 'associate')).toBe('3');
      expect(getApiValue(EXPERIENCE_LEVEL_MAPPING, 'senior')).toBe('4');
      expect(getApiValue(EXPERIENCE_LEVEL_MAPPING, 'director')).toBe('5');
      expect(getApiValue(EXPERIENCE_LEVEL_MAPPING, 'executive')).toBe('6');
    });

    it('should return API value for minimum salary', () => {
      expect(getApiValue(MINIMUM_SALARY_MAPPING, '40,000')).toBe('1');
      expect(getApiValue(MINIMUM_SALARY_MAPPING, '100,000')).toBe('4');
      expect(getApiValue(MINIMUM_SALARY_MAPPING, '200,000')).toBe('9');
    });

    it('should return API value for workplace type', () => {
      expect(getApiValue(WORKPLACE_TYPE_MAPPING, 'on-site')).toBe('1');
      expect(getApiValue(WORKPLACE_TYPE_MAPPING, 'remote')).toBe('2');
      expect(getApiValue(WORKPLACE_TYPE_MAPPING, 'hybrid')).toBe('3');
    });

    it('should return API value for listing age', () => {
      expect(getApiValue(LISTING_AGE_MAPPING, 'past-24-hours')).toBe('r86400');
      expect(getApiValue(LISTING_AGE_MAPPING, 'past-week')).toBe('r604800');
      expect(getApiValue(LISTING_AGE_MAPPING, 'past-month')).toBe('r2592000');
    });
  });

  describe('getKeys', () => {
    it('should return all job type keys', () => {
      const keys = getKeys(JOB_TYPE_MAPPING);
      expect(keys).toContain('full-time');
      expect(keys).toContain('part-time');
      expect(keys).toContain('contract');
      expect(keys).toContain('temporary');
      expect(keys).toContain('volunteer');
      expect(keys).toContain('internship');
      expect(keys).toContain('other');
      expect(keys).toHaveLength(7);
    });

    it('should return all experience level keys', () => {
      const keys = getKeys(EXPERIENCE_LEVEL_MAPPING);
      expect(keys).toContain('internship');
      expect(keys).toContain('entry-level');
      expect(keys).toContain('associate');
      expect(keys).toContain('senior');
      expect(keys).toContain('director');
      expect(keys).toContain('executive');
      expect(keys).toHaveLength(6);
    });

    it('should return all workplace type keys', () => {
      const keys = getKeys(WORKPLACE_TYPE_MAPPING);
      expect(keys).toContain('on-site');
      expect(keys).toContain('remote');
      expect(keys).toContain('hybrid');
      expect(keys).toHaveLength(3);
    });

    it('should return all listing age keys', () => {
      const keys = getKeys(LISTING_AGE_MAPPING);
      expect(keys).toContain('past-24-hours');
      expect(keys).toContain('past-week');
      expect(keys).toContain('past-month');
      expect(keys).toHaveLength(3);
    });
  });

  describe('normalizeMinimumSalaryInput', () => {
    it('should return canonical key for comma-formatted input', () => {
      expect(normalizeMinimumSalaryInput('180,000')).toBe('180,000');
      expect(normalizeMinimumSalaryInput('40,000')).toBe('40,000');
      expect(normalizeMinimumSalaryInput('200,000')).toBe('200,000');
    });

    it('should return canonical key for plain numeric input', () => {
      expect(normalizeMinimumSalaryInput('180000')).toBe('180,000');
      expect(normalizeMinimumSalaryInput('40000')).toBe('40,000');
      expect(normalizeMinimumSalaryInput('200000')).toBe('200,000');
    });

    it('should return canonical key for underscore-separated input', () => {
      expect(normalizeMinimumSalaryInput('180_000')).toBe('180,000');
      expect(normalizeMinimumSalaryInput('40_000')).toBe('40,000');
      expect(normalizeMinimumSalaryInput('200_000')).toBe('200,000');
    });

    it('should normalize all valid salary thresholds in all formats', () => {
      const expected = ['40,000', '60,000', '80,000', '100,000', '120,000', '140,000', '160,000', '180,000', '200,000'] as const;
      for (const canonical of expected) {
        const plain = canonical.replace(/,/g, '');
        const underscored = canonical.replace(/,/g, '_');
        expect(normalizeMinimumSalaryInput(canonical)).toBe(canonical);
        expect(normalizeMinimumSalaryInput(plain)).toBe(canonical);
        expect(normalizeMinimumSalaryInput(underscored)).toBe(canonical);
      }
    });

    it('should return undefined for invalid salary values', () => {
      expect(normalizeMinimumSalaryInput('50000')).toBeUndefined();
      expect(normalizeMinimumSalaryInput('50,000')).toBeUndefined();
      expect(normalizeMinimumSalaryInput('999999')).toBeUndefined();
      expect(normalizeMinimumSalaryInput('abc')).toBeUndefined();
      expect(normalizeMinimumSalaryInput('')).toBeUndefined();
    });

    it('should return undefined for non-string input', () => {
      expect(normalizeMinimumSalaryInput(180000)).toBeUndefined();
      expect(normalizeMinimumSalaryInput(null)).toBeUndefined();
      expect(normalizeMinimumSalaryInput(undefined)).toBeUndefined();
      expect(normalizeMinimumSalaryInput(true)).toBeUndefined();
    });
  });

  describe('choice constants', () => {
    it('should export job type choices matching mapping keys', () => {
      expect(JOB_TYPE_CHOICES).toEqual(getKeys(JOB_TYPE_MAPPING));
    });

    it('should export experience level choices matching mapping keys', () => {
      expect(EXPERIENCE_LEVEL_CHOICES).toEqual(getKeys(EXPERIENCE_LEVEL_MAPPING));
    });

    it('should export minimum salary choices matching mapping keys', () => {
      expect(MINIMUM_SALARY_CHOICES).toEqual(getKeys(MINIMUM_SALARY_MAPPING));
    });

    it('should export workplace type choices matching mapping keys', () => {
      expect(WORKPLACE_TYPE_CHOICES).toEqual(getKeys(WORKPLACE_TYPE_MAPPING));
    });

    it('should export listing age choices matching mapping keys', () => {
      expect(LISTING_AGE_CHOICES).toEqual(getKeys(LISTING_AGE_MAPPING));
    });
  });
});

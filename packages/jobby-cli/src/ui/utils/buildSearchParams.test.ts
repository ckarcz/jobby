import { describe, it, expect } from 'vitest';
import { buildSearchParams } from './buildSearchParams.js';
import { emptyFilters } from '../state/filterTypes.js';
import type { SearchFilters } from '../state/filterTypes.js';

describe('buildSearchParams', () => {
  it('should return keyword-only params when no filters provided', () => {
    const result = buildSearchParams('TypeScript');
    expect(result).toEqual({ keyword: 'TypeScript' });
  });

  it('should return keyword-only params when filters are empty', () => {
    const result = buildSearchParams('TypeScript', emptyFilters);
    expect(result).toEqual({ keyword: 'TypeScript' });
  });

  it('should include location when set', () => {
    const filters: SearchFilters = { ...emptyFilters, location: 'New York' };
    const result = buildSearchParams('React', filters);
    expect(result.location).toBe('New York');
  });

  it('should not include location when empty string', () => {
    const filters: SearchFilters = { ...emptyFilters, location: '' };
    const result = buildSearchParams('React', filters);
    expect(result.location).toBeUndefined();
  });

  it('should include geoId when set', () => {
    const filters: SearchFilters = { ...emptyFilters, geoId: '103644278' };
    const result = buildSearchParams('Go', filters);
    expect(result.geoId).toBe('103644278');
  });

  it('should include companyId when set', () => {
    const filters: SearchFilters = { ...emptyFilters, companyId: '1441' };
    const result = buildSearchParams('Go', filters);
    expect(result.companyId).toBe('1441');
  });

  it('should include all filters when fully populated', () => {
    const filters: SearchFilters = {
      jobType: ['full-time', 'contract'],
      experienceLevel: ['senior'],
      workplaceType: ['remote', 'hybrid'],
      minimumSalary: '120,000',
      listingAge: 'past-week',
      location: 'San Francisco',
      geoId: '103644278',
      companyId: '1441',
    };
    const result = buildSearchParams('Python', filters);
    expect(result).toEqual({
      keyword: 'Python',
      jobType: ['full-time', 'contract'],
      experienceLevel: ['senior'],
      workplaceType: ['remote', 'hybrid'],
      minimumSalary: '120,000',
      listingAge: 'past-week',
      location: 'San Francisco',
      geoId: '103644278',
      companyId: '1441',
    });
  });
});

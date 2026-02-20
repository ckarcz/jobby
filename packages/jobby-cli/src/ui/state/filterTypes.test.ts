import { describe, it, expect } from 'vitest';
import { emptyFilters, filterSections, countActiveFilters } from './filterTypes.js';
import type { SearchFilters } from './filterTypes.js';

describe('emptyFilters', () => {
  it('should have empty location string', () => {
    expect(emptyFilters.location).toBe('');
  });

  it('should have empty geoId string', () => {
    expect(emptyFilters.geoId).toBe('');
  });

  it('should have empty companyId string', () => {
    expect(emptyFilters.companyId).toBe('');
  });

  it('should have empty arrays for checkbox filters', () => {
    expect(emptyFilters.jobType).toEqual([]);
    expect(emptyFilters.experienceLevel).toEqual([]);
    expect(emptyFilters.workplaceType).toEqual([]);
  });

  it('should have undefined for radio filters', () => {
    expect(emptyFilters.minimumSalary).toBeUndefined();
    expect(emptyFilters.listingAge).toBeUndefined();
  });
});

describe('filterSections', () => {
  it('should include a Location text section', () => {
    const locationSection = filterSections.find(s => s.key === 'location');
    expect(locationSection).toBeDefined();
    expect(locationSection?.type).toBe('text');
    expect(locationSection?.title).toBe('Location');
  });

  it('should place Location before Geo ID', () => {
    const locationIndex = filterSections.findIndex(s => s.key === 'location');
    const geoIdIndex = filterSections.findIndex(s => s.key === 'geoId');
    expect(locationIndex).toBeLessThan(geoIdIndex);
  });

  it('should have 8 sections total', () => {
    expect(filterSections).toHaveLength(8);
  });

  it('should have location maxLength of 64', () => {
    const locationSection = filterSections.find(s => s.key === 'location');
    expect(locationSection).toBeDefined();
    if (locationSection?.type === 'text') {
      expect(locationSection.maxLength).toBe(64);
    }
  });
});

describe('countActiveFilters', () => {
  it('should return 0 for empty filters', () => {
    expect(countActiveFilters(emptyFilters)).toBe(0);
  });

  it('should count location as active when set', () => {
    const filters: SearchFilters = { ...emptyFilters, location: 'New York' };
    expect(countActiveFilters(filters)).toBe(1);
  });

  it('should not count empty location', () => {
    const filters: SearchFilters = { ...emptyFilters, location: '' };
    expect(countActiveFilters(filters)).toBe(0);
  });

  it('should count all active filters correctly', () => {
    const filters: SearchFilters = {
      jobType: ['full-time'],
      experienceLevel: ['senior', 'director'],
      workplaceType: ['remote'],
      minimumSalary: '100,000',
      listingAge: 'past-week',
      location: 'San Francisco',
      geoId: '103644278',
      companyId: '1441',
    };
    // 1 jobType + 2 experienceLevel + 1 workplaceType + 1 salary + 1 age + 1 location + 1 geoId + 1 companyId = 9
    expect(countActiveFilters(filters)).toBe(9);
  });
});

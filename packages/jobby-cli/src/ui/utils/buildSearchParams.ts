import type { JobSearchParams } from 'jobby-client';
import type { SearchFilters } from '../state/filterTypes.js';

/** Build a JobSearchParams from keyword and optional filters. */
export function buildSearchParams(keyword: string, filters?: SearchFilters): JobSearchParams {
  const params: JobSearchParams = { keyword };

  if (!filters) {
    return params;
  }

  if (filters.jobType.length > 0) {
    params.jobType = filters.jobType;
  }
  if (filters.experienceLevel.length > 0) {
    params.experienceLevel = filters.experienceLevel;
  }
  if (filters.workplaceType.length > 0) {
    params.workplaceType = filters.workplaceType;
  }
  if (filters.minimumSalary !== undefined) {
    params.minimumSalary = filters.minimumSalary;
  }
  if (filters.listingAge !== undefined) {
    params.listingAge = filters.listingAge;
  }
  if (filters.geoId.length > 0) {
    params.geoId = filters.geoId;
  }
  if (filters.companyId.length > 0) {
    params.companyId = filters.companyId;
  }

  return params;
}

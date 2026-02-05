import type { JobType, ExperienceLevel, WorkplaceType, MinimumSalary, ListingAge } from 'jobby-client';
import {
  JOB_TYPE_CHOICES,
  EXPERIENCE_LEVEL_CHOICES,
  WORKPLACE_TYPE_CHOICES,
  MINIMUM_SALARY_CHOICES,
  LISTING_AGE_CHOICES,
} from 'jobby-client';

/** Applied search filters stored in app state. */
export interface SearchFilters {
  jobType: JobType[];
  experienceLevel: ExperienceLevel[];
  workplaceType: WorkplaceType[];
  minimumSalary: MinimumSalary | undefined;
  listingAge: ListingAge | undefined;
  geoId: string;
  companyId: string;
}

/** Default empty filters. */
export const emptyFilters: SearchFilters = {
  jobType: [],
  experienceLevel: [],
  workplaceType: [],
  minimumSalary: undefined,
  listingAge: undefined,
  geoId: '',
  companyId: '',
};

/** Keys for checkbox-type filter sections (multi-select arrays). */
export type CheckboxFilterKey = 'jobType' | 'experienceLevel' | 'workplaceType';

/** Keys for radio-type filter sections (single-select or undefined). */
export type RadioFilterKey = 'minimumSalary' | 'listingAge';

/** Keys for text-type filter sections (free-form string). */
export type TextFilterKey = 'geoId' | 'companyId';

export interface CheckboxFilterSectionDef {
  key: CheckboxFilterKey;
  title: string;
  type: 'checkbox';
  options: string[];
}

export interface RadioFilterSectionDef {
  key: RadioFilterKey;
  title: string;
  type: 'radio';
  options: string[];
}

export interface TextFilterSectionDef {
  key: TextFilterKey;
  title: string;
  type: 'text';
  options: [];
}

/** Discriminated union of all filter section definitions. */
export type FilterSectionDef = CheckboxFilterSectionDef | RadioFilterSectionDef | TextFilterSectionDef;

/** All filter sections displayed in the drawer. */
export const filterSections: FilterSectionDef[] = [
  { key: 'jobType', title: 'Job Type', type: 'checkbox', options: JOB_TYPE_CHOICES as string[] },
  { key: 'experienceLevel', title: 'Experience Level', type: 'checkbox', options: EXPERIENCE_LEVEL_CHOICES as string[] },
  { key: 'workplaceType', title: 'Workplace Type', type: 'checkbox', options: WORKPLACE_TYPE_CHOICES as string[] },
  { key: 'minimumSalary', title: 'Minimum Salary', type: 'radio', options: MINIMUM_SALARY_CHOICES as string[] },
  { key: 'listingAge', title: 'Listing Age', type: 'radio', options: LISTING_AGE_CHOICES as string[] },
  { key: 'geoId', title: 'Geo ID', type: 'text', options: [] },
  { key: 'companyId', title: 'Company ID', type: 'text', options: [] },
];

/** Count how many filters are actively set. */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  count += filters.jobType.length;
  count += filters.experienceLevel.length;
  count += filters.workplaceType.length;
  if (filters.minimumSalary !== undefined) {
    count++;
  }
  if (filters.listingAge !== undefined) {
    count++;
  }
  if (filters.geoId.length > 0) {
    count++;
  }
  if (filters.companyId.length > 0) {
    count++;
  }
  return count;
}

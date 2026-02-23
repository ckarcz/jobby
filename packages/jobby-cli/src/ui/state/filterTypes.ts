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
  location: string;
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
  location: '',
  geoId: '',
  companyId: '',
};

/** Keys for checkbox-type filter sections (multi-select arrays). */
export type CheckboxFilterKey = 'jobType' | 'experienceLevel' | 'workplaceType';

/** Keys for radio-type filter sections (single-select or undefined). */
export type RadioFilterKey = 'minimumSalary' | 'listingAge';

/** Keys for text-type filter sections (free-form string). */
export type TextFilterKey = 'location' | 'geoId' | 'companyId';

export interface CheckboxFilterSectionDef {
  key: CheckboxFilterKey;
  title: string;
  type: 'checkbox';
  options: readonly string[];
}

export interface RadioFilterSectionDef {
  key: RadioFilterKey;
  title: string;
  type: 'radio';
  options: readonly string[];
}

export interface TextFilterSectionDef {
  key: TextFilterKey;
  title: string;
  type: 'text';
  options: [];
}

/** Discriminated union of all filter section definitions. */
export type FilterSectionDef = CheckboxFilterSectionDef | RadioFilterSectionDef | TextFilterSectionDef;

/** Union of all filter section keys. */
export type FilterSectionKey = CheckboxFilterKey | RadioFilterKey | TextFilterKey;

/** Static ordered list of section keys — defines drawer navigation order. */
export const SECTION_ORDER: FilterSectionKey[] = [
  'jobType',
  'experienceLevel',
  'workplaceType',
  'minimumSalary',
  'listingAge',
  'location',
  'geoId',
  'companyId',
];

/** All filter sections displayed in the drawer. */
export const filterSections: FilterSectionDef[] = [
  { key: 'jobType', title: 'Job Type', type: 'checkbox', options: JOB_TYPE_CHOICES },
  { key: 'experienceLevel', title: 'Experience Level', type: 'checkbox', options: EXPERIENCE_LEVEL_CHOICES },
  { key: 'workplaceType', title: 'Workplace Type', type: 'checkbox', options: WORKPLACE_TYPE_CHOICES },
  { key: 'minimumSalary', title: 'Minimum Salary', type: 'radio', options: MINIMUM_SALARY_CHOICES },
  { key: 'listingAge', title: 'Listing Age', type: 'radio', options: LISTING_AGE_CHOICES },
  { key: 'location', title: 'Location', type: 'text', options: [] },
  { key: 'geoId', title: 'Geo ID', type: 'text', options: [] },
  { key: 'companyId', title: 'Company ID', type: 'text', options: [] },
];

/** Look up a section definition by key. */
export function getFilterSection(key: FilterSectionKey): FilterSectionDef {
  const section = filterSections.find(s => s.key === key);
  if (!section) {
    throw new Error(`Unknown filter section key: ${key}`);
  }
  return section;
}

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
  if (filters.location.length > 0) {
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

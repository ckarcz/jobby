/** A map of human-readable parameter keys to their LinkedIn API values. */
export type ParamMap = Record<string, string>;

/** Gets the API value for a parameter key. */
export function getApiValue<T extends ParamMap>(config: T, key: keyof T): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return config[key]!;
}

/** Gets all valid keys for a parameter map. */
export function getKeys<T extends ParamMap>(config: T): readonly (keyof T & string)[] {
  return Object.keys(config) as (keyof T & string)[];
}

/** Mapping of job type keys to LinkedIn API values. */
export const JOB_TYPE_MAPPING = {
  'full-time': 'F',
  'part-time': 'P',
  'contract': 'C',
  'temporary': 'T',
  'volunteer': 'V',
  'internship': 'I',
  'other': 'O',
} as const;

/** Valid job type keys. */
export type JobType = keyof typeof JOB_TYPE_MAPPING;

/** All valid job type choices. */
export const JOB_TYPE_CHOICES: readonly JobType[] = getKeys(JOB_TYPE_MAPPING);

/** Mapping of experience level keys to LinkedIn API values. */
export const EXPERIENCE_LEVEL_MAPPING = {
  'internship': '1',
  'entry-level': '2',
  'associate': '3',
  'senior': '4',
  'director': '5',
  'executive': '6',
} as const;

/** Valid experience level keys. */
export type ExperienceLevel = keyof typeof EXPERIENCE_LEVEL_MAPPING;

/** All valid experience level choices. */
export const EXPERIENCE_LEVEL_CHOICES: readonly ExperienceLevel[] = getKeys(EXPERIENCE_LEVEL_MAPPING);

/** Mapping of minimum salary keys to LinkedIn API values. */
export const MINIMUM_SALARY_MAPPING = {
  '40,000': '1',
  '60,000': '2',
  '80,000': '3',
  '100,000': '4',
  '120,000': '5',
  '140,000': '6',
  '160,000': '7',
  '180,000': '8',
  '200,000': '9',
} as const;

/** Valid minimum salary keys. */
export type MinimumSalary = keyof typeof MINIMUM_SALARY_MAPPING;

/** All valid minimum salary choices. */
export const MINIMUM_SALARY_CHOICES: readonly MinimumSalary[] = getKeys(MINIMUM_SALARY_MAPPING);

/** Mapping of workplace type keys to LinkedIn API values. */
export const WORKPLACE_TYPE_MAPPING = {
  'on-site': '1',
  'remote': '2',
  'hybrid': '3',
} as const;

/** Valid workplace type keys. */
export type WorkplaceType = keyof typeof WORKPLACE_TYPE_MAPPING;

/** All valid workplace type choices. */
export const WORKPLACE_TYPE_CHOICES: readonly WorkplaceType[] = getKeys(WORKPLACE_TYPE_MAPPING);

/** Mapping of listing age keys to LinkedIn API values. */
export const LISTING_AGE_MAPPING = {
  'past-24-hours': 'r86400',
  'past-week': 'r604800',
  'past-month': 'r2592000',
} as const;

/** Valid listing age keys. */
export type ListingAge = keyof typeof LISTING_AGE_MAPPING;

/** All valid listing age choices. */
export const LISTING_AGE_CHOICES: readonly ListingAge[] = getKeys(LISTING_AGE_MAPPING);

/** Pagination parameters for controlling result windowing. */
export interface PaginationParams {
  /**
   * Starting offset for the query.
   * LinkedIn returns results of N size starting from this start parameter.
   * The size of the results cannot be guaranteed to be consistent.
   * @default 0
   */
  start?: number | undefined;

  /**
   * Number of results to skip.
   * LinkedIn returns results of N size starting from the start parameter.
   * The size of the results cannot be guaranteed to be consistent.
   * DO NOT use skip and take as consistent pagination parameters.
   */
  skip?: number | undefined;

  /**
   * Maximum number of results to return after applying skip.
   * LinkedIn returns results of N size starting from the start parameter.
   * The size of the results cannot be guaranteed to be consistent.
   * DO NOT use skip and take as consistent pagination parameters.
   */
  take?: number | undefined;
}

/** Job search filter parameters for querying LinkedIn job listings. */
export interface JobSearchParams {
  /**
   * Filter by keyword (C#, Angular, etc).
   */
  keyword?: string | undefined;

  /**
   * Filter by location (New York, India, etc).
   */
  location?: string | undefined;

  /**
   * Filter by job type: 'full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship', 'other'.
   */
  jobType?: JobType | JobType[] | undefined;

  /**
   * Filter by experience level: 'internship', 'entry-level', 'associate', 'senior', 'director', 'executive'.
   */
  experienceLevel?: ExperienceLevel | ExperienceLevel[] | undefined;

  /**
   * Filter by minimum salary: '40,000', '60,000', '80,000', '100,000', '120,000', '140,000', '160,000', '180,000', '200,000'.
   */
  minimumSalary?: MinimumSalary | undefined;

  /**
   * Filter by workplace type: 'on-site', 'remote', 'hybrid'.
   */
  workplaceType?: WorkplaceType | WorkplaceType[] | undefined;

  /**
   * Filter by listing age: 'past-24-hours', 'past-week', 'past-month'.
   */
  listingAge?: ListingAge | undefined;

  /**
   * Filter by LinkedIn geo ID (e.g. '103644278' for US, '101165590' for UK).
   */
  geoId?: string | undefined;

  /**
   * Filter by LinkedIn company ID (e.g. '1441' for Google, '1035' for Microsoft).
   */
  companyId?: string | undefined;
}

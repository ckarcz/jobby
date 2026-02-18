// Errors
export {
  ErrorCode,
  JobbyError,
  RateLimitError,
  NetworkError,
  ParsingError,
  ValidationError,
} from './errors.js';

// Parameter definitions, types, and choices (public API)
export {
  type JobType,
  JOB_TYPE_CHOICES,
  type ExperienceLevel,
  EXPERIENCE_LEVEL_CHOICES,
  type MinimumSalary,
  MINIMUM_SALARY_CHOICES,
  type WorkplaceType,
  WORKPLACE_TYPE_CHOICES,
  type ListingAge,
  LISTING_AGE_CHOICES,
  type JobSearchParams,
  type PaginationParams,
} from './params.js';

// Internal param mappings and helpers (used by queries, not part of public API)
export {
  type ParamMap,
  getApiValue,
  JOB_TYPE_MAPPING,
  EXPERIENCE_LEVEL_MAPPING,
  MINIMUM_SALARY_MAPPING,
  WORKPLACE_TYPE_MAPPING,
  LISTING_AGE_MAPPING,
} from './params.js';

// Parameter schemas
export {
  zodEnumFromMap,
  JobTypeSchema,
  ExperienceLevelSchema,
  MinimumSalarySchema,
  WorkplaceTypeSchema,
  ListingAgeSchema,
} from './params-schemas.js';

// Responses
export {
  type JobCompany,
  type JobSummary,
  type JobPosted,
  type Job,
  type JobDetailsInfo,
  type JobDetails,
  type PaginationInfo,
  type SearchMetadata,
  type SearchResponse,
  type ProgressInfo,
} from './responses.js';

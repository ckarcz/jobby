// Main client
export { JobbyClient, JobsResource, type IJobsResource } from './client.js';

// Configuration
export {
  type ClientConfig,
  type HttpConfig,
  DEFAULT_CLIENT_CONFIG,
} from './config.js';

// Logging
export {
  type Logger,
  createLogger,
  type LogLevel,
  type LogEntry,
  type LoggingConfig,
  type LogFileConfig,
} from './logging.js';

// Types - Errors
export {
  ErrorType,
  JobbyError,
  RateLimitError,
  NetworkError,
  ParsingError,
  ValidationError,
} from './types/index.js';

// Types - Parameter Definitions
export {
  type JobType,
  JOB_TYPE_CHOICES,
  type ExperienceLevel,
  EXPERIENCE_LEVEL_CHOICES,
  type MinimumSalary,
  MINIMUM_SALARY_CHOICES,
  normalizeMinimumSalaryInput,
  type WorkplaceType,
  WORKPLACE_TYPE_CHOICES,
  type ListingAge,
  LISTING_AGE_CHOICES,
  type JobSearchParams,
  type PaginationParams,
} from './types/index.js';

// Types - Responses
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
} from './types/index.js';

// Builders
export { JobSearchBuilder } from './builders/index.js';

// Utilities
export { delay, resolveWithDefaults, type RetryConfig, DEFAULT_RETRY_CONFIG } from './utils/index.js';

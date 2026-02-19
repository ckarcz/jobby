import type {
  JobType,
  ExperienceLevel,
  MinimumSalary,
  WorkplaceType,
  ListingAge,
  LogLevel,
} from 'jobby-client';

/**
 * Mutable ref that command action handlers write to, giving the top-level
 * error and signal handlers access to the active command's parsed options
 * (e.g. debug mode) without a module-level global.
 */
export interface ActiveCliArgsRef {
  current: JobbyCliArgs;
}

/** Supported output format identifiers for CLI commands. */
export type OutputFormat = 'json' | 'xml' | 'yaml' | 'csv' | 'rawHtml';

/** Base CLI arguments shared across all commands. */
export interface JobbyCliArgs {
  format?: OutputFormat | undefined;
  pretty?: boolean | undefined;
  logLevel?: LogLevel | undefined;
  noColor?: boolean | undefined;
  debug?: boolean | undefined;
  file?: string | undefined;
}

/** CLI arguments for the `search` command. */
export interface JobSearchQueryCliArgs extends JobbyCliArgs {
  keyword?: string | undefined;
  location?: string | undefined;
  jobType?: JobType[] | undefined;
  experienceLevel?: ExperienceLevel[] | undefined;
  minimumSalary?: MinimumSalary | undefined;
  workplaceType?: WorkplaceType[] | undefined;
  listingAge?: ListingAge | undefined;
  geoId?: string | undefined;
  companyId?: string | undefined;
  start?: number | undefined;
  skip?: number | undefined;
  take?: number | undefined;
  detailed?: boolean | undefined;
}

/** CLI arguments for the `details` command. */
export interface JobDetailsQueryCliArgs extends JobbyCliArgs {
  url?: string | undefined;
  id?: string | undefined;
}

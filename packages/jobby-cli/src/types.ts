/** Supported output format identifiers for CLI commands. */
export type OutputFormat = 'json' | 'xml' | 'yaml' | 'csv' | 'rawHtml';

/** Base CLI arguments shared across all commands. */
export interface JobbyCliArgs {
  format?: OutputFormat | undefined;
  pretty?: boolean | undefined;
  logLevel?: string | undefined;
  noColor?: boolean | undefined;
  debug?: boolean | undefined;
  file?: string | undefined;
}

/** CLI arguments for the `search` command. */
export interface JobSearchQueryCliArgs extends JobbyCliArgs {
  keyword?: string | undefined;
  location?: string | undefined;
  jobType?: string | undefined;
  experienceLevel?: string | undefined;
  minimumSalary?: string | undefined;
  workplaceType?: string | undefined;
  listingAge?: string | undefined;
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

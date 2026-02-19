import { type ClientConfig, resolveConfig } from './config.js';
import type { JobSearchParams, PaginationParams, Job, JobDetails, SearchResponse } from './types/index.js';
import { executeJobsQuery, executeJobsQueryRawHtml  } from './queries/jobs-query.js';
import { executeJobDetailsQueryByUrl, executeJobDetailsQueryRawHtmlByUrl, executeJobDetailsQueryById, executeJobDetailsQueryRawHtmlById  } from './queries/job-details-query.js';
import { JobSearchBuilder } from './builders/job-search-builder.js';
import { withRetry } from './utils/retry.js';
import type { ResolvedRetryConfig } from './utils/retry.js';

/** Jobs resource providing search and details methods. */
class JobsResource {
  private readonly config: ClientConfig | undefined;
  private readonly retryConfig: ResolvedRetryConfig;

  constructor(config: ClientConfig | undefined, retryConfig: ResolvedRetryConfig) {
    this.config = config;
    this.retryConfig = retryConfig;
  }

  /**
   * Search for jobs with the given parameters.
   *
   * @example
   * ```typescript
   * const response = await client.jobs.queryForJobs({
   *   keyword: 'TypeScript',
   *   location: 'San Francisco',
   *   jobType: 'full-time',
   * }, { take: 10 });
   * console.log(response.results); // Array of Job objects
   * ```
   */
  async queryForJobs(searchParams: JobSearchParams, paginationParams?: PaginationParams): Promise<SearchResponse<Job>> {
    return withRetry(() => executeJobsQuery(searchParams, paginationParams, this.config), this.retryConfig);
  }

  /**
   * Get details for a specific job posting by URL.
   *
   * @example
   * ```typescript
   * const details = await client.jobs.queryForJobDetailsByUrl('https://www.linkedin.com/jobs/view/123456');
   * console.log(details.title, details.description);
   * ```
   */
  async queryForJobDetailsByUrl(jobUrl: string): Promise<JobDetails> {
    return withRetry(() => executeJobDetailsQueryByUrl(jobUrl, this.config), this.retryConfig);
  }

  /**
   * Get details for a specific job posting by job ID.
   *
   * @example
   * ```typescript
   * const details = await client.jobs.queryForJobDetailsById('123456');
   * console.log(details.title, details.description);
   * ```
   */
  async queryForJobDetailsById(jobId: string): Promise<JobDetails> {
    return withRetry(() => executeJobDetailsQueryById(jobId, this.config), this.retryConfig);
  }

  /**
   * Search for jobs and return the raw HTML response.
   */
  async queryForJobsRawHtml(searchParams: JobSearchParams, paginationParams?: PaginationParams): Promise<string> {
    return withRetry(() => executeJobsQueryRawHtml(searchParams, paginationParams, this.config), this.retryConfig);
  }

  /**
   * Get the raw HTML response for a specific job posting by URL.
   */
  async queryForJobDetailsRawHtmlByUrl(jobUrl: string): Promise<string> {
    return withRetry(() => executeJobDetailsQueryRawHtmlByUrl(jobUrl, this.config), this.retryConfig);
  }

  /**
   * Get the raw HTML response for a specific job posting by job ID.
   */
  async queryForJobDetailsRawHtmlById(jobId: string): Promise<string> {
    return withRetry(() => executeJobDetailsQueryRawHtmlById(jobId, this.config), this.retryConfig);
  }

  /**
   * Create a fluent search builder for more complex queries.
   *
   * @example
   * ```typescript
   * const response = await client.jobs
   *   .createSearch()
   *   .withKeyword('TypeScript')
   *   .withLocation('San Francisco')
   *   .withJobType('full-time')
   *   .withExperience('senior')
   *   .withWorkplaceType('remote')
   *   .takeResults(10)
   *   .execute();
   * ```
   */
  createSearch(): JobSearchBuilder {
    return new JobSearchBuilder(this.config);
  }
}

/**
 * LinkedIn Jobs API client.
 *
 * @example
 * ```typescript
 * import { JobbyClient } from 'jobby-client';
 *
 * const client = new JobbyClient({
 *   timeout: 15_000,
 * });
 *
 * // Simple search
 * const response = await client.jobs.queryForJobs({
 *   keyword: 'TypeScript',
 *   location: 'San Francisco',
 *   jobType: 'full-time',
 * }, { take: 10 });
 *
 * // Fluent builder
 * const response2 = await client.jobs
 *   .createSearch()
 *   .withKeyword('React')
 *   .withWorkplaceType('remote')
 *   .withExperience('senior')
 *   .takeResults(20)
 *   .execute();
 *
 * // Get job details
 * const details = await client.jobs.queryForJobDetailsByUrl(response.results[0]!.url);
 * ```
 */
export class JobbyClient {
  /**
   * Jobs resource for searching and retrieving job details.
   */
  public readonly jobs: JobsResource;

  private readonly config: ClientConfig | undefined;

  /**
   * Creates a new LinkedIn Jobs client.
   *
   * @param config - Optional configuration options
   */
  constructor(config?: ClientConfig) {
    this.config = config;
    const resolved = resolveConfig(config);
    this.jobs = new JobsResource(config, resolved.retry);
  }

  /**
   * Get the current configuration.
   */
  getConfig(): ClientConfig | undefined {
    return this.config;
  }
}

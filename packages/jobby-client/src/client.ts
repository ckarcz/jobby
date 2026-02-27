import { type ClientConfig, type HttpConfig, resolveConfig } from './config.js';
import { type Logger, createLogger } from './logging.js';
import type { JobSearchParams, PaginationParams, Job, JobDetails, SearchResponse } from './types/index.js';
import { executeJobsQuery, executeJobsQueryRawHtml  } from './queries/jobs-query.js';
import { executeJobDetailsQueryByUrl, executeJobDetailsQueryRawHtmlByUrl, executeJobDetailsQueryById, executeJobDetailsQueryRawHtmlById  } from './queries/job-details-query.js';
import { JobSearchBuilder } from './builders/job-search-builder.js';
import { type RetryConfig, resolveRetryConfig, withRetry } from './utils/retry.js';

/** Public contract for the jobs resource, enabling test mocking without the concrete class. */
export interface IJobsResource {
  queryForJobs(searchParams: JobSearchParams, paginationParams?: PaginationParams): Promise<SearchResponse<Job>>;
  queryForJobDetailsByUrl(jobUrl: string): Promise<JobDetails>;
  queryForJobDetailsById(jobId: string): Promise<JobDetails>;
  queryForJobsRawHtml(searchParams: JobSearchParams, paginationParams?: PaginationParams): Promise<string>;
  queryForJobDetailsRawHtmlByUrl(jobUrl: string): Promise<string>;
  queryForJobDetailsRawHtmlById(jobId: string): Promise<string>;
  createSearch(): JobSearchBuilder;
}

/** Jobs resource providing search and details methods. */
export class JobsResource implements IJobsResource {
  private readonly config: HttpConfig;
  private readonly logger: Logger;
  private readonly retryConfig: RetryConfig;

  constructor(config: HttpConfig, logger: Logger, retryConfig: RetryConfig) {
    this.config = config;
    this.logger = logger;
    this.retryConfig = retryConfig;
  }

  /** Wraps a query function with the configured retry policy. */
  private retried<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, this.retryConfig);
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
    return this.retried(() => executeJobsQuery(searchParams, paginationParams, this.config, this.logger));
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
    return this.retried(() => executeJobDetailsQueryByUrl(jobUrl, this.config, this.logger));
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
    return this.retried(() => executeJobDetailsQueryById(jobId, this.config, this.logger));
  }

  /**
   * Search for jobs and return the raw HTML response.
   */
  async queryForJobsRawHtml(searchParams: JobSearchParams, paginationParams?: PaginationParams): Promise<string> {
    return this.retried(() => executeJobsQueryRawHtml(searchParams, paginationParams, this.config, this.logger));
  }

  /**
   * Get the raw HTML response for a specific job posting by URL.
   */
  async queryForJobDetailsRawHtmlByUrl(jobUrl: string): Promise<string> {
    return this.retried(() => executeJobDetailsQueryRawHtmlByUrl(jobUrl, this.config, this.logger));
  }

  /**
   * Get the raw HTML response for a specific job posting by job ID.
   */
  async queryForJobDetailsRawHtmlById(jobId: string): Promise<string> {
    return this.retried(() => executeJobDetailsQueryRawHtmlById(jobId, this.config, this.logger));
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
    return JobSearchBuilder._fromResolved(this.config, this.logger, this.retryConfig);
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
  public readonly jobs: IJobsResource;

  private readonly httpConfig: HttpConfig;

  /**
   * Creates a new LinkedIn Jobs client.
   *
   * @param config - Optional configuration options
   */
  constructor(config?: ClientConfig) {
    this.httpConfig = resolveConfig(config);
    const logger = createLogger(config?.logging);
    const retryConfig = resolveRetryConfig(config?.retry);
    this.jobs = new JobsResource(this.httpConfig, logger, retryConfig);
  }

  /**
   * Get the resolved HTTP configuration with all defaults applied.
   */
  getConfig(): HttpConfig {
    return this.httpConfig;
  }
}

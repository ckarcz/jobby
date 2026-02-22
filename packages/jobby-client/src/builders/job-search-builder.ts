import { type ClientConfig, type ResolvedClientConfig, resolveConfig } from '../config.js';
import type {
  JobSearchParams,
  PaginationParams,
  Job,
  SearchResponse,
  JobType,
  ExperienceLevel,
  MinimumSalary,
  WorkplaceType,
  ListingAge,
} from '../types/index.js';
import { executeJobsQuery } from '../queries/jobs-query.js';
import { type RetryConfig, DEFAULT_RETRY_CONFIG, withRetry } from '../utils/retry.js';

/**
 * Fluent builder for constructing job search queries.
 *
 * **Note:** This builder is mutable by design — each `with*` method modifies
 * the builder in place and returns `this` for chaining. Do not reuse a single
 * builder instance for multiple independent queries; create a new one instead.
 *
 * @example
 * ```typescript
 * const response = await new JobSearchBuilder(config)
 *   .withKeyword('TypeScript')
 *   .withLocation('San Francisco')
 *   .withJobType('full-time')
 *   .withExperience('senior')
 *   .withWorkplaceType('remote')
 *   .takeResults(10)
 *   .execute();
 * ```
 */
export class JobSearchBuilder {
  private resolvedConfig: ResolvedClientConfig;
  private retryConfig: RetryConfig;
  private params: JobSearchParams = {};
  private pagination: PaginationParams = {};

  constructor(config?: ClientConfig) {
    this.resolvedConfig = resolveConfig(config);
    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }

  /** @internal Creates a builder from pre-resolved configuration. Used by JobbyClient. */
  static _fromResolved(config: ResolvedClientConfig, retryConfig: RetryConfig): JobSearchBuilder {
    const builder = new JobSearchBuilder();
    builder.resolvedConfig = config;
    builder.retryConfig = retryConfig;
    return builder;
  }

  /**
   * Filter by keyword (job title, skill, company name, etc.).
   */
  withKeyword(keyword: string): this {
    this.params.keyword = keyword;
    return this;
  }

  /**
   * Filter by location (city, state, country).
   */
  withLocation(location: string): this {
    this.params.location = location;
    return this;
  }

  /**
   * Filter by job type (full-time, part-time, contract, etc.).
   */
  withJobType(jobType: JobType | JobType[]): this {
    this.params.jobType = jobType;
    return this;
  }

  /**
   * Filter by experience level (entry-level, senior, director, etc.).
   */
  withExperience(level: ExperienceLevel | ExperienceLevel[]): this {
    this.params.experienceLevel = level;
    return this;
  }

  /**
   * Filter by minimum salary.
   */
  withMinSalary(salary: MinimumSalary): this {
    this.params.minimumSalary = salary;
    return this;
  }

  /**
   * Filter by workplace type (on-site, remote, hybrid).
   */
  withWorkplaceType(type: WorkplaceType | WorkplaceType[]): this {
    this.params.workplaceType = type;
    return this;
  }

  /**
   * Filter by listing age.
   */
  withListingAge(age: ListingAge): this {
    this.params.listingAge = age;
    return this;
  }

  /**
   * Filter by LinkedIn geo ID (e.g. '103644278' for US, '101165590' for UK).
   */
  withGeoId(geoId: string): this {
    this.params.geoId = geoId;
    return this;
  }

  /**
   * Filter by LinkedIn company ID (e.g. '1441' for Google, '1035' for Microsoft).
   */
  withCompanyId(companyId: string): this {
    this.params.companyId = companyId;
    return this;
  }

  /**
   * Set the starting offset for LinkedIn query.
   */
  startResults(start: number): this {
    this.pagination.start = start;
    return this;
  }

  /**
   * Skip a number of results from the response.
   */
  skipResults(skip: number): this {
    this.pagination.skip = skip;
    return this;
  }

  /**
   * Limit the number of results returned.
   */
  takeResults(take: number): this {
    this.pagination.take = take;
    return this;
  }

  /**
   * Get the current search parameters.
   */
  getSearchParams(): JobSearchParams {
    return { ...this.params };
  }

  /**
   * Get the current pagination parameters.
   */
  getPaginationParams(): PaginationParams {
    return { ...this.pagination };
  }

  /**
   * Execute the search query and return results.
   */
  async execute(): Promise<SearchResponse<Job>> {
    return withRetry(() => executeJobsQuery(this.params, this.pagination, this.resolvedConfig), this.retryConfig);
  }
}

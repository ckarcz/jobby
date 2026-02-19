import * as cheerio from 'cheerio';
import axios, { type AxiosRequestConfig } from 'axios';
import { type ClientConfig, resolveConfig, type ResolvedClientConfig } from '../config.js';
import {
  type JobSearchParams,
  type PaginationParams,
  type Job,
  type SearchResponse,
  type ParamMap,
  JOB_TYPE_MAPPING,
  EXPERIENCE_LEVEL_MAPPING,
  MINIMUM_SALARY_MAPPING,
  WORKPLACE_TYPE_MAPPING,
  LISTING_AGE_MAPPING,
  getApiValue,
  ParsingError,
  ValidationError,
} from '../types/index.js';
import { handleHttpError, createRequestHeaders } from '../utils/http.js';
import { urlWithNoQueryParams, extractJobIdFromUrl, buildCanonicalJobUrl, extractCompanySlug } from '../utils/url.js';
import {
  normalizeJobSearchParams,
  normalizePaginationParams,
} from '../utils/normalize.js';

/**
 * Context returned by {@link fetchJobsHtml} containing the raw HTML response
 * along with all resolved/normalized parameters needed for further processing.
 */
interface JobsQueryContext {
  html: string;
  queryUrl: string;
  config: ResolvedClientConfig;
  normalizedJobSearchParams: JobSearchParams;
  normalizedPaginationParams: PaginationParams;
  start: number;
  startTime: number;
}

/**
 * Validates, normalizes, and fetches raw HTML for a job search query.
 * This is the shared setup used by both parsed and raw-HTML query functions.
 *
 * @param jobSearchParams - Optional search filter parameters
 * @param paginationParams - Optional pagination parameters
 * @param clientConfig - Optional client configuration overrides
 * @returns The raw HTML response alongside all resolved query context
 */
async function fetchJobsHtml(
  jobSearchParams?: JobSearchParams,
  paginationParams?: PaginationParams,
  clientConfig?: ClientConfig
): Promise<JobsQueryContext> {
  const config = resolveConfig(clientConfig);
  const { logger } = config;
  const startTime = Date.now();

  logger.verbose('Processing query...');

  const resolvedJobSearchParams = jobSearchParams ?? {};
  const resolvedPaginationParams = paginationParams ?? {};

  validatePagination(resolvedPaginationParams);

  const normalizedJobSearchParams = normalizeJobSearchParams(resolvedJobSearchParams);
  const normalizedPaginationParams = normalizePaginationParams(resolvedPaginationParams);

  logger.verbose('Normalized search params.', normalizedJobSearchParams);
  logger.verbose('Normalized pagination params.', normalizedPaginationParams);

  const start = normalizedPaginationParams.start ?? 0;

  const headers = createRequestHeaders(config.userAgent);

  try {
    const queryUrl = buildQueryUrl(config.baseUrl, normalizedJobSearchParams, start);

    logger.verbose(`Executing query ${queryUrl}...`);

    const axiosConfig: AxiosRequestConfig = {
      headers,
      timeout: config.timeout,
    };

    if (config.signal) {
      axiosConfig.signal = config.signal;
    }

    const response = await axios.get<string>(queryUrl, axiosConfig);

    return { html: response.data, queryUrl, config, normalizedJobSearchParams, normalizedPaginationParams, start, startTime };
  } catch (error: unknown) {
    return handleHttpError(error, logger);
  }
}

/**
 * Executes a job search query against LinkedIn.
 * Makes a single request and applies skip/take to the results.
 */
export async function executeJobsQuery(
  jobSearchParams?: JobSearchParams,
  paginationParams?: PaginationParams,
  clientConfig?: ClientConfig
): Promise<SearchResponse<Job>> {
  const { html, config, normalizedJobSearchParams, normalizedPaginationParams, start, startTime, queryUrl } =
    await fetchJobsHtml(jobSearchParams, paginationParams, clientConfig);

  config.logger.verbose('Processing query response...');

  let fetchedJobs = parseJobs(html, config);

  const fetchedJobsCount = fetchedJobs.length;

  if (normalizedPaginationParams.skip !== undefined && normalizedPaginationParams.skip > 0) {
    fetchedJobs = fetchedJobs.slice(normalizedPaginationParams.skip);
  }

  if (normalizedPaginationParams.take !== undefined) {
    fetchedJobs = fetchedJobs.slice(0, normalizedPaginationParams.take);
  }

  const durationMs = Date.now() - startTime;
  config.logger.info('Job search query completed.', { durationMs, fetched: fetchedJobsCount, returned: fetchedJobs.length });

  return {
    results: fetchedJobs,
    pagination: {
      start,
      skip: normalizedPaginationParams.skip,
      take: normalizedPaginationParams.take,
      responseCount: fetchedJobsCount,
      resultsCount: fetchedJobs.length,
    },
    query: normalizedJobSearchParams,
    metadata: {
      timestamp: new Date(),
      durationMs,
      searchUrl: queryUrl,
    },
  };
}

/** Executes a job search query against LinkedIn and returns the raw HTML response. */
export async function executeJobsQueryRawHtml(
  jobSearchParams?: JobSearchParams,
  paginationParams?: PaginationParams,
  clientConfig?: ClientConfig
): Promise<string> {
  const { html, config, startTime } = await fetchJobsHtml(jobSearchParams, paginationParams, clientConfig);

  config.logger.info('Raw job search query completed.', { durationMs: Date.now() - startTime });

  return html;
}

/** Validates pagination options. */
function validatePagination(paginationParams: PaginationParams): void {
  if (paginationParams.start !== undefined) {
    if (Number.isNaN(paginationParams.start) || paginationParams.start < 0) {
      throw new ValidationError('Start must be a non-negative number');
    }
  }

  if (paginationParams.skip !== undefined) {
    if (Number.isNaN(paginationParams.skip) || paginationParams.skip < 0) {
      throw new ValidationError('Skip must be a non-negative number');
    }
  }

  if (paginationParams.take !== undefined) {
    if (Number.isNaN(paginationParams.take) || paginationParams.take < 0) {
      throw new ValidationError('Take must be a non-negative number');
    }
  }
}

/**
 * Appends the keyword search parameter to the URL query string.
 *
 * @param params - The URLSearchParams instance to append to
 * @param searchParams - The job search parameters containing the keyword
 */
function appendKeyword(params: URLSearchParams, searchParams: JobSearchParams): void {
  if (searchParams.keyword) {
    params.append('keywords', searchParams.keyword);
  }
}

/**
 * Appends the location search parameter to the URL query string.
 *
 * @param params - The URLSearchParams instance to append to
 * @param searchParams - The job search parameters containing the location
 */
function appendLocation(params: URLSearchParams, searchParams: JobSearchParams): void {
  if (searchParams.location) {
    params.append('location', searchParams.location);
  }
}

/**
 * Appends a param that may be a single value or an array of values,
 * mapping each through the provided {@link ParamMap} and joining with commas.
 *
 * @param params - The URLSearchParams instance to append to
 * @param key - The URL parameter key (e.g. `f_JT`, `f_E`)
 * @param value - A single value, array of values, or undefined
 * @param mapping - The mapping from human-readable keys to LinkedIn API values
 */
function appendArrayParam<T extends ParamMap>(
  params: URLSearchParams,
  key: string,
  value: keyof T | (keyof T)[] | undefined,
  mapping: T,
): void {
  if (value !== undefined) {
    const values = Array.isArray(value) ? value : [value];
    params.append(key, values.map(x => getApiValue(mapping, x)).join(','));
  }
}

/**
 * Appends a param with a single mapped value (not an array).
 *
 * @param params - The URLSearchParams instance to append to
 * @param key - The URL parameter key
 * @param value - The value to map, or undefined to skip
 * @param mapping - The mapping from human-readable keys to LinkedIn API values
 */
function appendSingleParam<T extends ParamMap>(
  params: URLSearchParams,
  key: string,
  value: keyof T | undefined,
  mapping: T,
): void {
  if (value !== undefined) {
    params.append(key, getApiValue(mapping, value));
  }
}

/**
 * Appends a free-form string parameter when the value is non-empty.
 *
 * @param params - The URLSearchParams instance to append to
 * @param key - The URL parameter key
 * @param value - The string value, or undefined to skip
 */
function appendStringParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    params.append(key, value);
  }
}

/**
 * Builds the LinkedIn jobs API query URL from search and pagination parameters.
 *
 * Constructs a full URL with query string by delegating each parameter type
 * to a dedicated append helper.
 *
 * @param baseUrl - The base LinkedIn hostname
 * @param searchParams - Normalized job search filter parameters
 * @param start - The pagination start offset
 * @returns The fully constructed query URL string
 */
function buildQueryUrl(baseUrl: string, searchParams: JobSearchParams, start: number): string {
  const url = `https://${baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?`;
  const urlParams = new URLSearchParams();

  appendKeyword(urlParams, searchParams);
  appendLocation(urlParams, searchParams);
  appendArrayParam(urlParams, 'f_JT', searchParams.jobType, JOB_TYPE_MAPPING);
  appendArrayParam(urlParams, 'f_E', searchParams.experienceLevel, EXPERIENCE_LEVEL_MAPPING);
  appendSingleParam(urlParams, 'f_SB2', searchParams.minimumSalary, MINIMUM_SALARY_MAPPING);
  appendArrayParam(urlParams, 'f_WT', searchParams.workplaceType, WORKPLACE_TYPE_MAPPING);
  appendSingleParam(urlParams, 'f_TPR', searchParams.listingAge, LISTING_AGE_MAPPING);
  appendStringParam(urlParams, 'geoId', searchParams.geoId);
  appendStringParam(urlParams, 'f_C', searchParams.companyId);

  urlParams.append('start', start.toString());

  return url + urlParams.toString();
}

/** Parses job data from the LinkedIn response HTML. */
function parseJobs(jobData: string, config: ResolvedClientConfig): Job[] {
  try {
    const $ = cheerio.load(jobData);
    const jobs = $('li');

    config.logger.verbose(`Parsing ${jobs.length} job element(s).`);

    return jobs
      .map(function parseJobElement(_index, element): Job | null {
        try {
          const job = $(element);

          // Job
          const rawJobUrl = urlWithNoQueryParams(job.find('.base-card__full-link').attr('href') ?? undefined);
          const jobId = extractJobIdFromUrl(rawJobUrl);
          const jobUrl = buildCanonicalJobUrl(jobId, rawJobUrl) ?? rawJobUrl;

          // JobSummary
          const position = job.find('.base-search-card__title').text().trim() || undefined;
          const location = job.find('.job-search-card__location').text().trim() || undefined;
          const company = job.find('.base-search-card__subtitle').text().trim() || undefined;
          const companyPage = urlWithNoQueryParams(job.find('.base-search-card__subtitle > a').attr('href') ?? undefined);
          const companySlug = extractCompanySlug(companyPage);
          const companyLogo = job.find('.artdeco-entity-image').attr('data-delayed-url') ?? undefined;
          const salary = job.find('.job-search-card__salary-info').text().trim().replace(/\s+/g, ' ') || undefined;
          const highlight = job.find('.job-posting-benefits__text').text().trim().replace(/\s+/g, ' ') || undefined;
          const isNew = job.find('time').hasClass('job-search-card__listdate--new') ? true : undefined;
          const easyApplyText = job.find('.job-search-card__easy-apply-label').text().trim();
          const easyApply = easyApplyText ? true : undefined;

          // JobPosted
          const date = job.find('time').attr('datetime') ?? undefined;
          const agoTime = job.find('.job-search-card__listdate, .job-search-card__listdate--new').text().trim() || undefined;

          if (!position || !company) {
            return null;
          }

          return {
            id: jobId,
            url: jobUrl,
            summary: {
              position,
              location,
              company: {
                name: company,
                slug: companySlug,
                pageUrl: companyPage,
                logoUrl: companyLogo,
              },
              salary,
              highlight,
              isNew,
              easyApply,
            },
            posted: {
              date,
              ago: agoTime,
            },
          };
        } catch {
          return null;
        }
      })
      .get()
      .filter(function isValidJob(job): job is Job {
        return job !== null;
      });
  } catch (error: unknown) {
    throw new ParsingError('Failed to parse job list', error);
  }
}

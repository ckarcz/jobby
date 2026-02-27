import * as cheerio from 'cheerio';
import axios, { type AxiosRequestConfig } from 'axios';
import { type HttpConfig } from '../config.js';
import type { Logger } from '../logging.js';
import {
  type JobDetails,
  ParsingError,
  ValidationError,
} from '../types/index.js';
import { handleHttpError, createDetailsRequestHeaders } from '../utils/http.js';
import { urlWithNoQueryParams, extractJobIdFromUrl, buildCanonicalJobUrl } from '../utils/url.js';
import type { ParsedJobDetailsData } from '../parsers/types.js';
import { parseJsonLdToJobDetailsData } from '../parsers/job-details-jsonld.js';
import { scrapeJobDetailsDataFromDom } from '../parsers/job-details-scraper.js';

/**
 * Context returned by {@link fetchJobDetailsHtml} containing the raw HTML
 * response along with resolved configuration and timing data.
 */
interface JobDetailsQueryContext {
  html: string;
  config: HttpConfig;
  logger: Logger;
  startTime: number;
}

/**
 * Validates the job URL and fetches the raw HTML for a job details page.
 * This is the shared setup used by both parsed and raw-HTML detail functions.
 *
 * @param jobUrl - The LinkedIn job posting URL to fetch
 * @param clientConfig - Optional client configuration overrides
 * @returns The raw HTML response alongside resolved configuration context
 * @throws {ValidationError} If the URL is empty or malformed
 */
async function fetchJobDetailsHtml(
  jobUrl: string,
  config: HttpConfig,
  logger: Logger,
): Promise<JobDetailsQueryContext> {
  const startTime = Date.now();

  logger.verbose('Processing query...');

  if (!jobUrl.trim()) {
    throw new ValidationError('Job URL is required');
  }

  const normalizedUrl = jobUrl.trim();

  try {
    new URL(normalizedUrl);
  } catch {
    throw new ValidationError('Job URL must be a valid URL');
  }

  logger.verbose(`Fetching job details for ${normalizedUrl}.`);

  const headers = createDetailsRequestHeaders(config.userAgent);

  try {
    const axiosConfig: AxiosRequestConfig = {
      headers,
      timeout: config.timeout,
    };

    if (config.signal) {
      axiosConfig.signal = config.signal;
    }

    logger.verbose(`Executing query ${normalizedUrl}...`);

    const response = await axios.get<string>(normalizedUrl, axiosConfig);

    return { html: response.data, config, logger, startTime };
  } catch (error: unknown) {
    return handleHttpError(error, logger);
  }
}

/** Fetches detailed information for a specific job posting by URL. */
export async function executeJobDetailsQueryByUrl(
  jobUrl: string,
  config: HttpConfig,
  logger: Logger,
): Promise<JobDetails> {
  const { html, startTime } = await fetchJobDetailsHtml(jobUrl, config, logger);

  logger.verbose('Processing query response...');

  const details = parseJobDetails(html, jobUrl, logger);

  logger.info('Job details query completed.', { durationMs: Date.now() - startTime });

  return details;
}

/** Fetches the raw HTML response for a specific job posting by URL. */
export async function executeJobDetailsQueryRawHtmlByUrl(
  jobUrl: string,
  config: HttpConfig,
  logger: Logger,
): Promise<string> {
  const { html, startTime } = await fetchJobDetailsHtml(jobUrl, config, logger);

  logger.info('Raw job details query completed.', { durationMs: Date.now() - startTime });

  return html;
}

/** Fetches detailed information for a specific job posting by job ID. */
export async function executeJobDetailsQueryById(
  jobId: string,
  config: HttpConfig,
  logger: Logger,
): Promise<JobDetails> {
  const trimmedId = jobId.trim();
  if (!trimmedId) {
    throw new ValidationError('Job ID is required');
  }
  const jobUrl = `https://${config.baseUrl}/jobs/view/${trimmedId}`;
  const { html, startTime } = await fetchJobDetailsHtml(jobUrl, config, logger);

  logger.verbose('Processing query response...');

  const details = parseJobDetails(html, jobUrl, logger);

  logger.info('Job details query completed.', { durationMs: Date.now() - startTime });

  return details;
}

/** Fetches the raw HTML response for a specific job posting by job ID. */
export async function executeJobDetailsQueryRawHtmlById(
  jobId: string,
  config: HttpConfig,
  logger: Logger,
): Promise<string> {
  const trimmedId = jobId.trim();
  if (!trimmedId) {
    throw new ValidationError('Job ID is required');
  }
  const jobUrl = `https://${config.baseUrl}/jobs/view/${trimmedId}`;
  const { html, startTime } = await fetchJobDetailsHtml(jobUrl, config, logger);

  logger.info('Raw job details query completed.', { durationMs: Date.now() - startTime });

  return html;
}

/**
 * Merges two parsed detail records, preferring the primary source for each field.
 * Adding a new field to {@link ParsedJobDetailsData} automatically gets merged
 * here — no manual `primary.x ?? fallback.x` line required.
 *
 * @remarks
 * Only `undefined` and `null` values fall through to the fallback.
 * Both mean "not present in this source" and will not overwrite
 * a non-nullish fallback value.
 *
 * @internal Exported for testing only
 */
export function mergeJobDetailsData(primary: ParsedJobDetailsData, fallback: ParsedJobDetailsData): ParsedJobDetailsData {
  const merged = { ...fallback };
  for (const key of Object.keys(primary) as (keyof ParsedJobDetailsData)[]) {
    const value = primary[key];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data may contain null despite types
    if (value !== undefined && value !== null) {
      (merged as Record<keyof ParsedJobDetailsData, string | undefined>)[key] = value;
    }
  }
  return merged;
}

/**
 * Parses job details from the HTML response by combining JSON-LD structured data
 * (priority) with HTML DOM scraping (fallback and supplementary data).
 */
function parseJobDetails(html: string, jobUrl: string, logger: Logger): JobDetails {
  try {
    const $ = cheerio.load(html);

    const jsonLdDetails = parseJsonLdToJobDetailsData($, logger);
    const scrapedDetails = scrapeJobDetailsDataFromDom($);
    const merged = mergeJobDetailsData(jsonLdDetails, scrapedDetails);

    const rawJobUrl = urlWithNoQueryParams(merged.jobUrl ?? jobUrl) ?? jobUrl;
    const jobId = extractJobIdFromUrl(rawJobUrl) ?? extractJobIdFromUrl(jobUrl);
    const resolvedJobUrl = buildCanonicalJobUrl(jobId, rawJobUrl) ?? rawJobUrl;

    if (!jobId) {
      throw new ParsingError(`Could not extract job ID from URL: ${jobUrl}`);
    }

    return {
      id: jobId,
      url: resolvedJobUrl,
      summary: {
        position: merged.title,
        location: merged.location,
        company: {
          name: merged.company,
          slug: merged.companySlug,
          pageUrl: merged.companyPage,
          logoUrl: merged.companyLogo,
        },
        salary: merged.salary,
        highlight: undefined,
        isNew: undefined,
        easyApply: undefined,
      },
      posted: {
        date: merged.postedDate,
        ago: merged.postedTimeAgo,
        expirationDate: merged.expirationDate,
      },
      details: {
        description: merged.description,
        salary: merged.salary,
        location: merged.location,
        workplaceType: merged.workplaceType,
        employmentType: merged.employmentType,
        seniorityLevel: merged.seniorityLevel,
        applicants: merged.applicantCount,
        industry: merged.industry,
        jobFunction: merged.jobFunction,
        experienceRequired: merged.experienceRequired,
        educationRequired: merged.educationRequired,
        applyUrl: merged.applyUrl,
        applyText: merged.applyText,
        shortDescription: merged.shortDescription,
        sharingImageUrl: merged.sharingImageUrl,
        benefitsInfo: merged.benefitsInfo,
        incentiveInfo: merged.incentiveInfo,
      },
    };
  } catch (error: unknown) {
    throw new ParsingError('Failed to parse job details', error);
  }
}

import * as cheerio from 'cheerio';
import axios, { type AxiosRequestConfig } from 'axios';
import { type HttpConfig } from '../config.js';
import type { Logger } from '../logging.js';
import {
  type JobDetails,
  ParsingError,
  ValidationError,
} from '../types/index.js';
import { type JsonLdJobPosting, JsonLdJobPostingSchema } from '../types/responses.js';
import { handleHttpError, createDetailsRequestHeaders } from '../utils/http.js';
import { urlWithNoQueryParams, extractJobIdFromUrl, buildCanonicalJobUrl, extractCompanySlug } from '../utils/url.js';
import { htmlToMarkdown } from '../utils/html.js';

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
 * Internal flat representation used during parsing before building
 * the final nested JobDetails shape.
 */
interface ParsedJobDetailsData {
  jobUrl: string | undefined;
  title: string | undefined;
  location: string | undefined;
  company: string | undefined;
  companyPage: string | undefined;
  companyLogo: string | undefined;
  companySlug: string | undefined;
  salary: string | undefined;
  postedDate: string | undefined;
  postedTimeAgo: string | undefined;
  expirationDate: string | undefined;
  description: string | undefined;
  workplaceType: string | undefined;
  employmentType: string | undefined;
  seniorityLevel: string | undefined;
  applicantCount: string | undefined;
  industry: string | undefined;
  jobFunction: string | undefined;
  experienceRequired: string | undefined;
  educationRequired: string | undefined;
  applyUrl: string | undefined;
  applyText: string | undefined;
  shortDescription: string | undefined;
  sharingImageUrl: string | undefined;
  benefitsInfo: string | undefined;
  incentiveInfo: string | undefined;
}

/**
 * Merges two parsed detail records, preferring the primary source for each field.
 * Adding a new field to {@link ParsedJobDetailsData} automatically gets merged
 * here — no manual `primary.x ?? fallback.x` line required.
 *
 * @remarks
 * Only `undefined` values fall through to the fallback. A `null` primary value
 * **will** overwrite a non-null fallback — this is intentional (`null` means
 * "explicitly absent", `undefined` means "not present in this source").
 *
 * @internal Exported for testing only
 */
export function mergeJobDetailsData(primary: ParsedJobDetailsData, fallback: ParsedJobDetailsData): ParsedJobDetailsData {
  const merged = { ...fallback };
  for (const key of Object.keys(primary) as (keyof ParsedJobDetailsData)[]) {
    const value = primary[key];
    if (value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- generic merge across heterogeneous field types
      (merged as any)[key] = value;
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

/** Parses JSON-LD structured data into flat parsed details data. */
function parseJsonLdToJobDetailsData($: ReturnType<typeof cheerio.load>, logger: Logger): ParsedJobDetailsData {
  const jsonLd = extractJsonLd($, logger);

  const locationParts: string[] = [];
  if (jsonLd?.jobLocation?.address) {
    const addr = jsonLd.jobLocation.address;
    if (addr.addressLocality) {
      locationParts.push(addr.addressLocality);
    }
    if (addr.addressRegion) {
      locationParts.push(addr.addressRegion);
    }
    if (addr.addressCountry && addr.addressCountry !== 'US') {
      locationParts.push(addr.addressCountry);
    }
  }

  const employmentTypeMap: Record<string, string> = {
    'FULL_TIME': 'Full-time',
    'PART_TIME': 'Part-time',
    'CONTRACT': 'Contract',
    'TEMPORARY': 'Temporary',
    'INTERNSHIP': 'Internship',
    'VOLUNTEER': 'Volunteer',
  };
  const rawEmploymentType = jsonLd?.employmentType;

  return {
    jobUrl: undefined,
    title: jsonLd?.title ?? undefined,
    location: locationParts.length > 0 ? locationParts.join(', ') : undefined,
    company: jsonLd?.hiringOrganization?.name ?? undefined,
    companyPage: urlWithNoQueryParams(jsonLd?.hiringOrganization?.sameAs),
    companyLogo: jsonLd?.hiringOrganization?.logo ?? undefined,
    companySlug: extractCompanySlug(urlWithNoQueryParams(jsonLd?.hiringOrganization?.sameAs)),
    salary: extractSalary(jsonLd),
    postedDate: jsonLd?.datePosted ?? undefined,
    postedTimeAgo: undefined,
    expirationDate: jsonLd?.validThrough ?? undefined,
    description: jsonLd?.description ? htmlToMarkdown(jsonLd.description) : undefined,
    workplaceType: jsonLd?.jobLocationType === 'TELECOMMUTE' ? 'Remote' : undefined,
    employmentType: rawEmploymentType ? (employmentTypeMap[rawEmploymentType] ?? rawEmploymentType) : undefined,
    seniorityLevel: undefined,
    applicantCount: undefined,
    industry: jsonLd?.industry ?? undefined,
    jobFunction: undefined,
    experienceRequired: formatExperienceRequirement(jsonLd?.experienceRequirements?.monthsOfExperience),
    educationRequired: jsonLd?.educationRequirements?.credentialCategory ?? undefined,
    applyUrl: undefined,
    applyText: undefined,
    shortDescription: undefined,
    sharingImageUrl: undefined,
    benefitsInfo: undefined,
    incentiveInfo: undefined,
  };
}

/** Scrapes all available job detail fields from the HTML DOM. */
function scrapeJobDetailsDataFromDom($: ReturnType<typeof cheerio.load>): ParsedJobDetailsData {
  const companyPage = scrapeCompanyPage($);
  return {
    jobUrl: scrapeJobUrl($),
    title: scrapeTitle($),
    location: scrapeLocation($),
    company: scrapeCompany($),
    companyPage,
    companyLogo: scrapeCompanyLogo($),
    companySlug: extractCompanySlug(companyPage),
    salary: scrapeSalary($),
    postedDate: scrapePostedDate($),
    postedTimeAgo: scrapePostedTimeAgo($),
    expirationDate: undefined,
    description: scrapeDescription($),
    workplaceType: scrapeWorkplaceType($),
    employmentType: extractCriteriaValue($, 'Employment type'),
    seniorityLevel: extractCriteriaValue($, 'Seniority level'),
    applicantCount: scrapeApplicantCount($),
    industry: extractCriteriaValue($, 'Industries'),
    jobFunction: extractCriteriaValue($, 'Job function'),
    experienceRequired: undefined,
    educationRequired: undefined,
    applyUrl: scrapeApplyUrl($),
    applyText: scrapeApplyText($),
    shortDescription: scrapeShortDescription($),
    sharingImageUrl: scrapeSharingImageUrl($),
    benefitsInfo: scrapeBenefitsInfo($),
    incentiveInfo: scrapeIncentiveInfo($),
  };
}

/** Scrapes the canonical job URL from link[rel=canonical] or meta tags. */
function scrapeJobUrl($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('link[rel="canonical"]').attr('href')?.trim()
    ?? $('meta[property="og:url"]').attr('content')?.trim()
    ?? $('meta[property="lnkd:url"]').attr('content')?.trim()
    ?? undefined;
}

/** Scrapes the job title from the top card heading. */
function scrapeTitle($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.top-card-layout__title').text().trim() || undefined;
}

/** Scrapes the company name from the top card link. */
function scrapeCompany($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.topcard__org-name-link').text().trim() || undefined;
}

/** Scrapes the company page URL from the top card link's href. */
function scrapeCompanyPage($: ReturnType<typeof cheerio.load>): string | undefined {
  return urlWithNoQueryParams($('.topcard__org-name-link').attr('href')?.trim());
}

/** Scrapes the company logo URL from the top card entity image. */
function scrapeCompanyLogo($: ReturnType<typeof cheerio.load>): string | undefined {
  const topCardImg = $('.top-card-layout__entity-info-container').closest('section').find('img.artdeco-entity-image');
  return topCardImg.attr('data-delayed-url')?.trim()
    ?? topCardImg.attr('src')?.trim()
    ?? undefined;
}

/** Scrapes the location text from the topcard flavor bullet. */
function scrapeLocation($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.topcard__flavor--bullet').first().text().trim() || undefined;
}

/** Scrapes the workplace type from meta description or topcard hints. */
function scrapeWorkplaceType($: ReturnType<typeof cheerio.load>): string | undefined {
  const metaDesc = $('meta[property="og:title"]').attr('content') ?? '';
  if (/\(remote\)/i.test(metaDesc)) {
    return 'Remote';
  }
  if (/\(hybrid\)/i.test(metaDesc)) {
    return 'Hybrid';
  }
  if (/\(on-site\)/i.test(metaDesc)) {
    return 'On-site';
  }
  return undefined;
}

/** Scrapes the description from the show-more-less section and converts it to Markdown. */
function scrapeDescription($: ReturnType<typeof cheerio.load>): string | undefined {
  const html = $('.show-more-less-html__markup').html()?.trim();
  if (!html) {
    return undefined;
  }
  return htmlToMarkdown(html) || undefined;
}

/** Scrapes the raw salary text from the top card or salary section. */
function scrapeSalary($: ReturnType<typeof cheerio.load>): string | undefined {
  const salaryText = $('.salary-main-rail__compensation-value').text().trim()
    || $('.compensation__salary').text().trim()
    || '';
  return salaryText.replace(/\s+/g, ' ') || undefined;
}

/** Scrapes the posted date from time elements or meta tags. */
function scrapePostedDate($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('time.posted-time-ago__text').attr('datetime')?.trim() ?? undefined;
}

/** Scrapes the relative posted time text. */
function scrapePostedTimeAgo($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.posted-time-ago__text').text().trim() || undefined;
}

/** Scrapes the applicant count text. */
function scrapeApplicantCount($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.num-applicants__caption').text().trim() || undefined;
}

/** Scrapes the apply button URL from the page. */
function scrapeApplyUrl($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.apply-button').attr('href')?.trim()
    ?? $('.top-card-layout__cta-container a').attr('href')?.trim()
    ?? $('.apply-button--top-card').attr('href')?.trim()
    ?? undefined;
}

/** Scrapes the apply button text from the page. */
function scrapeApplyText($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('.apply-button').text().trim()
    || $('.top-card-layout__cta-container a').text().trim()
    || $('.apply-button--top-card').text().trim()
    || undefined;
}

/** Scrapes the short description from the og:description meta tag. */
function scrapeShortDescription($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('meta[property="og:description"]').attr('content')?.trim() ?? undefined;
}

/** Scrapes the sharing image URL from the og:image meta tag. */
function scrapeSharingImageUrl($: ReturnType<typeof cheerio.load>): string | undefined {
  return $('meta[property="og:image"]').attr('content')?.trim() ?? undefined;
}

/**
 * Scrapes benefits and perks information from the page.
 * Tries multiple known LinkedIn benefits section selectors.
 */
function scrapeBenefitsInfo($: ReturnType<typeof cheerio.load>): string | undefined {
  const text = $('.job-details-benefits__text').text().trim()
    || $('.benefits__description').text().trim()
    || $('.salary-main-rail__benefits-value').text().trim()
    || '';
  if (!text) {
    return undefined;
  }
  return text.replace(/\s+/g, ' ');
}

/**
 * Scrapes bonus and incentive compensation information from the page.
 * Tries multiple known LinkedIn compensation detail selectors.
 */
function scrapeIncentiveInfo($: ReturnType<typeof cheerio.load>): string | undefined {
  const text = $('.compensation__incentive-value').text().trim()
    || $('.compensation__bonus-value').text().trim()
    || $('.salary-main-rail__incentive-value').text().trim()
    || '';
  if (!text) {
    return undefined;
  }
  return text.replace(/\s+/g, ' ');
}

/** Extracts JSON-LD job posting data from the page using Zod schema validation. */
function extractJsonLd($: ReturnType<typeof cheerio.load>, logger: Logger): JsonLdJobPosting | undefined {
  let jsonLd: JsonLdJobPosting | undefined;
  $('script[type="application/ld+json"]').each((_index, element) => {
    try {
      const content = $(element).html();
      if (content) {
        const result = JsonLdJobPostingSchema.safeParse(JSON.parse(content));
        if (result.success) {
          jsonLd = result.data;
        }
      }
    } catch (error: unknown) {
      logger.warn('Failed to parse JSON-LD content.', { error: error instanceof Error ? error.message : String(error) });
    }
  });
  return jsonLd;
}

/** Formats months of experience into a human-readable years string. */
function formatExperienceRequirement(months: number | undefined): string | undefined {
  if (months === undefined) {
    return undefined;
  }
  const years = Math.round(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

/** Extracts salary information from JSON-LD as a display string. */
function extractSalary(jsonLd: JsonLdJobPosting | undefined): string | undefined {
  const baseSalary = jsonLd?.baseSalary;
  const value = baseSalary?.value;
  if (!value || (value.minValue === undefined && value.maxValue === undefined)) {
    return undefined;
  }

  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  const symbol = baseSalary.currency ? (currencySymbols[baseSalary.currency] ?? baseSalary.currency + ' ') : '';
  const formatNum = (n: number): string => n.toLocaleString('en-US');
  const periodLabels: Record<string, string> = { YEAR: '/yr', MONTH: '/mo', HOUR: '/hr' };
  const periodSuffix = value.unitText ? (periodLabels[value.unitText] ?? '') : '';

  if (value.minValue !== undefined && value.maxValue !== undefined && value.minValue !== value.maxValue) {
    return `${symbol}${formatNum(value.minValue)} - ${symbol}${formatNum(value.maxValue)}${periodSuffix}`;
  }

  const single = value.minValue ?? value.maxValue;
  return single !== undefined ? `${symbol}${formatNum(single)}${periodSuffix}` : undefined;
}

/** Extracts a criteria value from the job details page. */
function extractCriteriaValue($: ReturnType<typeof cheerio.load>, label: string): string | undefined {
  let value: string | undefined;
  $('.description__job-criteria-item').each((_index, element) => {
    const header = $(element).find('.description__job-criteria-subheader').text().trim();
    if (header.toLowerCase() === label.toLowerCase()) {
      value = $(element).find('.description__job-criteria-text').text().trim() || undefined;
      return false;
    }
    return;
  });
  return value;
}

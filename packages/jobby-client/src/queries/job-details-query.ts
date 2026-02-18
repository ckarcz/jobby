import * as cheerio from 'cheerio';
import axios, { type AxiosRequestConfig } from 'axios';
import { type ClientConfig, resolveConfig, type ResolvedClientConfig } from '../config.js';
import {
  type JsonLdJobPosting,
  JsonLdJobPostingSchema,
  type JobDetails,
  type JobDetailsInfo,
  ParsingError,
  ValidationError,
} from '../types/index.js';
import { handleHttpError, createDetailsRequestHeaders } from '../utils/http.js';
import { urlWithNoQueryParams, extractJobIdFromUrl, buildCanonicalJobUrl, extractCompanySlug } from '../utils/url.js';
import { htmlToMarkdown } from '../utils/html.js';

/**
 * Context returned by {@link fetchJobDetailsHtml} containing the raw HTML
 * response along with resolved configuration and timing data.
 */
interface JobDetailsQueryContext {
  html: string;
  config: ResolvedClientConfig;
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
  clientConfig?: ClientConfig
): Promise<JobDetailsQueryContext> {
  const config = resolveConfig(clientConfig);
  const { logger } = config;
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

    return { html: response.data, config, startTime };
  } catch (error: unknown) {
    return handleHttpError(error, logger);
  }
}

/** Fetches detailed information for a specific job posting by URL. */
export async function executeJobDetailsQueryByUrl(
  jobUrl: string,
  clientConfig?: ClientConfig
): Promise<JobDetails> {
  const { html, config, startTime } = await fetchJobDetailsHtml(jobUrl, clientConfig);

  config.logger.verbose('Processing query response...');

  const details = parseJobDetails(html, jobUrl, config);

  config.logger.info('Job details query completed.', JSON.stringify({ durationMs: Date.now() - startTime }));

  return details;
}

/** Fetches the raw HTML response for a specific job posting by URL. */
export async function executeJobDetailsQueryRawHtmlByUrl(
  jobUrl: string,
  clientConfig?: ClientConfig
): Promise<string> {
  const { html, config, startTime } = await fetchJobDetailsHtml(jobUrl, clientConfig);

  config.logger.info('Raw job details query completed.', JSON.stringify({ durationMs: Date.now() - startTime }));

  return html;
}

/** Fetches detailed information for a specific job posting by job ID. */
export async function executeJobDetailsQueryById(
  jobId: string,
  clientConfig?: ClientConfig
): Promise<JobDetails> {
  if (!jobId.trim()) {
    throw new ValidationError('Job ID is required');
  }
  const config = resolveConfig(clientConfig);
  const jobUrl = `https://${config.baseUrl}/jobs/view/${jobId}`;
  return executeJobDetailsQueryByUrl(jobUrl, clientConfig);
}

/** Fetches the raw HTML response for a specific job posting by job ID. */
export async function executeJobDetailsQueryRawHtmlById(
  jobId: string,
  clientConfig?: ClientConfig
): Promise<string> {
  if (!jobId.trim()) {
    throw new ValidationError('Job ID is required');
  }
  const config = resolveConfig(clientConfig);
  const jobUrl = `https://${config.baseUrl}/jobs/view/${jobId}`;
  return executeJobDetailsQueryRawHtmlByUrl(jobUrl, clientConfig);
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
  salary: JobDetailsInfo['salary'];
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

/** Formats structured salary data into a human-readable display string. */
function formatSalaryDisplay(salary: JobDetailsInfo['salary']): string | undefined {
  if (!salary) {
    return undefined;
  }

  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  const symbol = salary.currency ? (currencySymbols[salary.currency] ?? salary.currency + ' ') : '';

  const formatNum = (n: number | undefined): string =>
    n !== undefined ? n.toLocaleString('en-US') : '?';

  const periodLabels: Record<string, string> = { YEAR: '/yr', MONTH: '/mo', HOUR: '/hr' };
  const periodSuffix = salary.period ? (periodLabels[salary.period] ?? '') : '';

  if (salary.min !== undefined && salary.max !== undefined && salary.min !== salary.max) {
    return `${symbol}${formatNum(salary.min)} - ${symbol}${formatNum(salary.max)}${periodSuffix}`;
  }

  const value = salary.min ?? salary.max;
  return `${symbol}${formatNum(value)}${periodSuffix}`;
}

/**
 * Parses job details from the HTML response by combining JSON-LD structured data
 * (priority) with HTML DOM scraping (fallback and supplementary data).
 */
function parseJobDetails(html: string, jobUrl: string, config: ResolvedClientConfig): JobDetails {
  try {
    const $ = cheerio.load(html);

    const jsonLdDetails = parseJsonLdToJobDetailsData($, config);
    const scrapedDetails = scrapeJobDetailsDataFromDom($);

    // JSON-LD takes priority, scraped HTML is fallback
    const rawJobUrl = urlWithNoQueryParams(scrapedDetails.jobUrl ?? jobUrl);
    const jobId = extractJobIdFromUrl(rawJobUrl);
    const resolvedJobUrl = buildCanonicalJobUrl(jobId, rawJobUrl) ?? rawJobUrl;

    const salary = jsonLdDetails.salary ?? scrapedDetails.salary;
    const location = jsonLdDetails.location ?? scrapedDetails.location;

    return {
      id: jobId,
      url: resolvedJobUrl,
      summary: {
        position: jsonLdDetails.title ?? scrapedDetails.title,
        location,
        company: {
          name: jsonLdDetails.company ?? scrapedDetails.company,
          slug: jsonLdDetails.companySlug ?? scrapedDetails.companySlug,
          pageUrl: jsonLdDetails.companyPage ?? scrapedDetails.companyPage,
          logoUrl: jsonLdDetails.companyLogo ?? scrapedDetails.companyLogo,
        },
        salary: formatSalaryDisplay(salary),
        highlight: undefined,
        isNew: undefined,
        easyApply: undefined,
      },
      posted: {
        date: jsonLdDetails.postedDate ?? scrapedDetails.postedDate,
        ago: jsonLdDetails.postedTimeAgo ?? scrapedDetails.postedTimeAgo,
        expirationDate: jsonLdDetails.expirationDate ?? scrapedDetails.expirationDate,
      },
      details: {
        description: jsonLdDetails.description ?? scrapedDetails.description,
        salary,
        location,
        workplaceType: jsonLdDetails.workplaceType ?? scrapedDetails.workplaceType,
        employmentType: jsonLdDetails.employmentType ?? scrapedDetails.employmentType,
        seniorityLevel: jsonLdDetails.seniorityLevel ?? scrapedDetails.seniorityLevel,
        applicants: jsonLdDetails.applicantCount ?? scrapedDetails.applicantCount,
        industry: jsonLdDetails.industry ?? scrapedDetails.industry,
        jobFunction: jsonLdDetails.jobFunction ?? scrapedDetails.jobFunction,
        experienceRequired: jsonLdDetails.experienceRequired ?? scrapedDetails.experienceRequired,
        educationRequired: jsonLdDetails.educationRequired ?? scrapedDetails.educationRequired,
        applyUrl: jsonLdDetails.applyUrl ?? scrapedDetails.applyUrl,
        applyText: jsonLdDetails.applyText ?? scrapedDetails.applyText,
        shortDescription: jsonLdDetails.shortDescription ?? scrapedDetails.shortDescription,
        sharingImageUrl: jsonLdDetails.sharingImageUrl ?? scrapedDetails.sharingImageUrl,
        benefitsInfo: jsonLdDetails.benefitsInfo ?? scrapedDetails.benefitsInfo,
        incentiveInfo: jsonLdDetails.incentiveInfo ?? scrapedDetails.incentiveInfo,
      },
    };
  } catch (error: unknown) {
    throw new ParsingError('Failed to parse job details', error);
  }
}

/** Parses JSON-LD structured data into flat parsed details data. */
function parseJsonLdToJobDetailsData($: ReturnType<typeof cheerio.load>, config: ResolvedClientConfig): ParsedJobDetailsData {
  const jsonLd = extractJsonLd($, config);

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
  return {
    jobUrl: scrapeJobUrl($),
    title: scrapeTitle($),
    location: scrapeLocation($),
    company: scrapeCompany($),
    companyPage: scrapeCompanyPage($),
    companyLogo: scrapeCompanyLogo($),
    companySlug: extractCompanySlug(scrapeCompanyPage($)),
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

/** Scrapes salary information from the top card or salary section. */
function scrapeSalary($: ReturnType<typeof cheerio.load>): JobDetailsInfo['salary'] {
  const salaryText = $('.salary-main-rail__compensation-value').text().trim()
    || $('.compensation__salary').text().trim()
    || '';
  if (!salaryText) {
    return undefined;
  }
  return parseSalaryText(salaryText);
}

/** Parses a salary text string like "$115,000.00 - $145,000.00" into structured data. */
function parseSalaryText(text: string): JobDetailsInfo['salary'] {
  const currencyMatch = /([£€$])/.exec(text);
  const currencyMap: Record<string, string> = { '$': 'USD', '€': 'EUR', '£': 'GBP' };
  const currencySymbol = currencyMatch?.[1];
  const currency: string | undefined = currencySymbol ? (currencyMap[currencySymbol] ?? currencySymbol) : undefined;
  const numbers = [...text.matchAll(/[\d,]+(?:\.\d+)?/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
  if (numbers.length === 0) {
    return undefined;
  }
  const periodMatch = (/\/(yr|hr|mo)/i.exec(text)) ?? (/per\s+(year|hour|month)/i.exec(text));
  const periodMap: Record<string, string> = { yr: 'YEAR', year: 'YEAR', hr: 'HOUR', hour: 'HOUR', mo: 'MONTH', month: 'MONTH' };
  const periodKey = periodMatch?.[1]?.toLowerCase();
  const period: string | undefined = periodKey ? (periodMap[periodKey] ?? undefined) : undefined;
  return {
    min: numbers[0],
    max: numbers.length > 1 ? numbers[1] : numbers[0],
    currency,
    period,
  };
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
  const content = $('meta[property="og:description"]').attr('content')?.trim();
  if (!content) {
    return undefined;
  }
  return content;
}

/** Scrapes the sharing image URL from the og:image meta tag. */
function scrapeSharingImageUrl($: ReturnType<typeof cheerio.load>): string | undefined {
  const content = $('meta[property="og:image"]').attr('content')?.trim();
  if (!content) {
    return undefined;
  }
  return content;
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
function extractJsonLd($: ReturnType<typeof cheerio.load>, config: ResolvedClientConfig): JsonLdJobPosting | undefined {
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
      config.logger.warn('Failed to parse JSON-LD content.', { error: error instanceof Error ? error.message : String(error) });
    }
  });
  return jsonLd;
}

/** Formats months of experience into a human-readable years string. */
function formatExperienceRequirement(months: number | undefined): string | undefined {
  if (months === undefined) {
    return undefined;
  }
  return `${Math.round(months / 12)} years`;
}

/** Extracts salary information from JSON-LD. */
function extractSalary(jsonLd: JsonLdJobPosting | undefined): JobDetailsInfo['salary'] {
  if (jsonLd?.baseSalary?.value) {
    return {
      min: jsonLd.baseSalary.value.minValue,
      max: jsonLd.baseSalary.value.maxValue,
      currency: jsonLd.baseSalary.currency,
      period: jsonLd.baseSalary.value.unitText,
    };
  }
  return undefined;
}

/** Extracts a criteria value from the job details page. */
function extractCriteriaValue($: ReturnType<typeof cheerio.load>, label: string): string | undefined {
  let value: string | undefined;
  $('.description__job-criteria-item').each((_index, element) => {
    const header = $(element).find('.description__job-criteria-subheader').text().trim();
    if (header.toLowerCase() === label.toLowerCase()) {
      value = $(element).find('.description__job-criteria-text').text().trim() || undefined;
    }
  });
  return value;
}

import type * as cheerio from 'cheerio';
import type { Logger } from '../logging.js';
import { type JsonLdJobPosting, JsonLdJobPostingSchema } from '../types/responses.js';
import { urlWithNoQueryParams, extractCompanySlug } from '../utils/url.js';
import { htmlToMarkdown } from '../utils/html.js';
import type { ParsedJobDetailsData } from './types.js';

/** Extracts JSON-LD job posting data from the page using Zod schema validation. */
export function extractJsonLd($: ReturnType<typeof cheerio.load>, logger: Logger): JsonLdJobPosting | undefined {
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

/** Parses JSON-LD structured data into flat parsed details data. */
export function parseJsonLdToJobDetailsData($: ReturnType<typeof cheerio.load>, logger: Logger): ParsedJobDetailsData {
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

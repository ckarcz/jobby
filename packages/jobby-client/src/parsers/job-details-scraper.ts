import type * as cheerio from 'cheerio';
import { urlWithNoQueryParams, extractCompanySlug } from '../utils/url.js';
import { htmlToMarkdown } from '../utils/html.js';
import type { ParsedJobDetailsData } from './types.js';

/** Scrapes all available job detail fields from the HTML DOM. */
export function scrapeJobDetailsDataFromDom($: ReturnType<typeof cheerio.load>): ParsedJobDetailsData {
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

/** Extracts a criteria value from the job details page. */
export function extractCriteriaValue($: ReturnType<typeof cheerio.load>, label: string): string | undefined {
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

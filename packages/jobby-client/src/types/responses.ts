import { z } from 'zod';
import type { JobSearchParams } from './index.js';

/** Company information associated with a job listing. */
export interface JobCompany {
  /** The name of the hiring company. */
  name: string | undefined;
  /** The company's URL slug (e.g. "intuit" from linkedin.com/company/intuit). */
  slug: string | undefined;
  /** URL to the company's LinkedIn page. */
  pageUrl: string | undefined;
  /** URL to the company's logo image. */
  logoUrl: string | undefined;
}

/** Summary information for a job listing. */
export interface JobSummary {
  /** The job position title. */
  position: string | undefined;
  /** The job location (city, state, country, etc.). */
  location: string | undefined;
  /** Company information. */
  company: JobCompany;
  /** The salary information as a display string, if available. */
  salary: string | undefined;
  /** Highlight badge text (e.g. "Actively Hiring +4 benefits"). */
  highlight: string | undefined;
  /** Whether this is a new listing. True if new, undefined otherwise. */
  isNew: boolean | undefined;
  /** Whether the Easy Apply badge is present. True if present, undefined otherwise. */
  easyApply: boolean | undefined;
}

/** Posting date information for a job listing. */
export interface JobPosted {
  /** The date the job was posted. */
  date: string | undefined;
  /** Relative time since the job was posted (e.g., "2 days ago"). */
  ago: string | undefined;
  /** The ISO date string when the job listing expires. Only populated in details responses. */
  expirationDate?: string | undefined;
}

/** Job data returned from a jobs search. */
export interface Job {
  /** The unique LinkedIn job ID. */
  id: string | undefined;
  /** The canonical URL for the job listing. */
  url: string | undefined;
  /** Summary information about the job. */
  summary: JobSummary;
  /** Posting date information. */
  posted: JobPosted;
}

/** Detailed information about a job posting. */
export interface JobDetailsInfo {
  /** The full job description, converted to markdown. */
  description: string | undefined;
  /** Structured salary information, if available. */
  salary: {
    /** The minimum salary value. */
    min: number | undefined;
    /** The maximum salary value. */
    max: number | undefined;
    /** The salary currency code (e.g., "USD"). */
    currency: string | undefined;
    /** The salary period (e.g., "YEAR", "MONTH"). */
    period: string | undefined;
  } | undefined;
  /** The job location (city, state, country, etc.). */
  location: string | undefined;
  /** The workplace type (e.g., "On-site", "Remote", "Hybrid"). */
  workplaceType: string | undefined;
  /** The employment type (e.g., "Full-time", "Contract"). */
  employmentType: string | undefined;
  /** The seniority level (e.g., "Mid-Senior level"). */
  seniorityLevel: string | undefined;
  /** The number of applicants, as a display string. */
  applicants: string | undefined;
  /** The industry associated with the job. */
  industry: string | undefined;
  /** The job function category. */
  jobFunction: string | undefined;
  /** The experience required, as extracted from the listing. */
  experienceRequired: string | undefined;
  /** The education required, as extracted from the listing. */
  educationRequired: string | undefined;
  /** The apply button URL, if available. */
  applyUrl: string | undefined;
  /** The apply button text (e.g. "Apply", "Easy Apply"). */
  applyText: string | undefined;
  /** Short description from og:description meta tag. */
  shortDescription: string | undefined;
  /** Sharing image URL from og:image meta tag. */
  sharingImageUrl: string | undefined;
  /** Benefits and perks information, if available (e.g. "Benefits Eligible: Yes"). */
  benefitsInfo: string | undefined;
  /** Bonus and incentive compensation information, if available (e.g. "Bonus Eligible: Yes"). */
  incentiveInfo: string | undefined;
}

/**
 * Job detail data returned from fetching job details.
 * Extends the base Job shape with a nested details object.
 */
export interface JobDetails extends Job {
  /** Detailed information about the job posting. */
  details: JobDetailsInfo;
}

/** Pagination information for search results. */
export interface PaginationInfo {
  /**
   * The start parameter used in the LinkedIn query.
   */
  start: number;

  /**
   * The skip parameter used in the LinkedIn query.
   */
  skip: number | undefined;

  /**
   * The take parameter used in the LinkedIn query.
   */
  take: number | undefined;

  /**
   * Number of jobs parsed from the LinkedIn response, before applying skip and take.
   */
  responseCount: number;

  /**
   * Number of results returned after applying skip and take.
   * Always `<= responseCount`. Equals `responseCount` when neither skip nor take is used.
   */
  resultsCount: number;
}

/** Metadata about the search request. */
export interface SearchMetadata {
  timestamp: Date;
  durationMs: number;
  searchUrl: string;
}

/** Wrapper for search response data. */
export interface SearchResponse<T> {
  results: T[];
  pagination: PaginationInfo;
  query: JobSearchParams;
  metadata: SearchMetadata;
}

/** Progress information for long-running operations. */
export interface ProgressInfo {
  type: 'querying' | 'parsing' | 'completed';
  current?: number;
  total?: number | undefined;
  message: string;
}

/** Zod schema for JSON-LD JobPosting structured data from LinkedIn pages. */
export const JsonLdJobPostingSchema = z.object({
  '@type': z.literal('JobPosting'),
  title: z.string().optional(),
  description: z.string().optional(),
  datePosted: z.string().optional(),
  validThrough: z.string().optional(),
  employmentType: z.string().optional(),
  hiringOrganization: z.object({
    name: z.string().optional(),
    sameAs: z.string().optional(),
    logo: z.string().optional(),
  }).optional(),
  jobLocation: z.object({
    address: z.object({
      addressLocality: z.string().optional(),
      addressRegion: z.string().optional(),
      addressCountry: z.string().optional(),
    }).optional(),
  }).optional(),
  jobLocationType: z.string().optional(),
  baseSalary: z.object({
    currency: z.string().optional(),
    value: z.object({
      minValue: z.number().optional(),
      maxValue: z.number().optional(),
      unitText: z.string().optional(),
    }).optional(),
  }).optional(),
  experienceRequirements: z.object({
    monthsOfExperience: z.number().optional(),
  }).optional(),
  educationRequirements: z.object({
    credentialCategory: z.string().optional(),
  }).optional(),
  industry: z.string().optional(),
  identifier: z.object({
    name: z.string().optional(),
    value: z.string().optional(),
  }).optional(),
}).loose();

/** Internally used type that models the actual JSON-LD data contained in a LinkedIn jobs listing page. */
export type JsonLdJobPosting = z.infer<typeof JsonLdJobPostingSchema>;

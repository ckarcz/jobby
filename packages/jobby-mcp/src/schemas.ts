import { z } from 'zod';
import {
  JOB_TYPE_CHOICES,
  EXPERIENCE_LEVEL_CHOICES,
  MINIMUM_SALARY_CHOICES,
  normalizeMinimumSalaryInput,
  WORKPLACE_TYPE_CHOICES,
  LISTING_AGE_CHOICES,
} from 'jobby-client';

function asNonEmpty<T>(arr: readonly T[]): [T, ...T[]] {
  return arr as [T, ...T[]];
}

/**
 * Input schema for the `search_jobs` MCP tool.
 *
 * Validates and describes every filter and pagination parameter accepted by
 * the LinkedIn job search endpoint.
 */
export const SearchInputSchema = z.object({
  keyword: z.string().min(1).optional().describe('Job title, skill, or company name to search for'),
  location: z.string().min(1).optional().describe('City, state, or country to search in'),
  jobType: z.union([
    z.enum(asNonEmpty(JOB_TYPE_CHOICES)),
    z.array(z.enum(asNonEmpty(JOB_TYPE_CHOICES))),
  ]).optional().describe(`Type of employment. Valid values: ${JOB_TYPE_CHOICES.join(', ')}. Single value or array.`),
  experienceLevel: z.union([
    z.enum(asNonEmpty(EXPERIENCE_LEVEL_CHOICES)),
    z.array(z.enum(asNonEmpty(EXPERIENCE_LEVEL_CHOICES))),
  ]).optional().describe(`Required experience level. Valid values: ${EXPERIENCE_LEVEL_CHOICES.join(', ')}. Single value or array.`),
  minimumSalary: z.preprocess(
    (val) => normalizeMinimumSalaryInput(val) ?? val,
    z.enum(asNonEmpty(MINIMUM_SALARY_CHOICES)),
  ).optional().describe(`Minimum salary filter. Valid values: ${MINIMUM_SALARY_CHOICES.join(', ')}. Also accepts plain numbers (e.g. 180000) or underscore-separated (180_000).`),
  workplaceType: z.union([
    z.enum(asNonEmpty(WORKPLACE_TYPE_CHOICES)),
    z.array(z.enum(asNonEmpty(WORKPLACE_TYPE_CHOICES))),
  ]).optional().describe(`Workplace arrangement. Valid values: ${WORKPLACE_TYPE_CHOICES.join(', ')}. Single value or array.`),
  listingAge: z.enum(asNonEmpty(LISTING_AGE_CHOICES)).optional().describe(`How recently the job was posted. Valid values: ${LISTING_AGE_CHOICES.join(', ')}.`),
  geoId: z.string().optional().describe('LinkedIn geo ID (e.g. 103644278 for US, 101165590 for UK)'),
  companyId: z.string().optional().describe('LinkedIn company ID (e.g. 1441 for Google, 1035 for Microsoft)'),
  start: z.number().int().nonnegative().optional().describe('Starting offset for the query.'),
  skip: z.number().int().nonnegative().optional().describe('Number of results to skip from the query response.'),
  take: z.number().int().positive().optional().describe('Number of results to take from the query response (after skip). Must be >= 1.'),
});

/**
 * Base object schema for the `get_job_details` MCP tool.
 *
 * Exported separately so that `JobDetailsBaseSchema.shape` can be passed to
 * the MCP SDK's `registerTool` (which requires a plain object shape), while
 * the refined version ({@link JobDetailsInputSchema}) is used for runtime
 * validation in the handler.
 */
export const JobDetailsBaseSchema = z.object({
  jobUrl: z.url().optional().describe('The LinkedIn job posting URL'),
  jobId: z.string().min(1).optional().describe('The LinkedIn job ID'),
});

/**
 * Refined input schema for the `get_job_details` MCP tool.
 *
 * Requires at least one of `jobUrl` or `jobId` to identify the target posting.
 * When both are supplied the handler prefers `jobUrl`.  The `.refine()`
 * constraint makes the "at least one required" rule visible at the schema level
 * rather than only in handler logic.
 */
export const JobDetailsInputSchema = JobDetailsBaseSchema.refine(
  (data) => data.jobUrl !== undefined || data.jobId !== undefined,
  { message: 'Either jobUrl or jobId is required' },
);

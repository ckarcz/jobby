import { z } from 'zod';
import type { JobSearchParams, PaginationParams } from '../types/index.js';
import { ValidationError } from '../types/index.js';
import {
  JobTypeSchema,
  ExperienceLevelSchema,
  MinimumSalarySchema,
  WorkplaceTypeSchema,
  ListingAgeSchema,
} from '../types/params-schemas.js';

/** Helper that accepts a single value or an array of values for a Zod enum schema. */
function singleOrArray<T extends z.ZodEnum>(schema: T): z.ZodType<z.infer<T> | z.infer<T>[]> {
  return z.union([schema, z.array(schema)]);
}

const JobSearchParamsSchema = z.object({
  keyword: z.string().transform(s => s.trim()).optional(),
  location: z.string().transform(s => s.trim()).optional(),
  jobType: singleOrArray(JobTypeSchema).optional(),
  experienceLevel: singleOrArray(ExperienceLevelSchema).optional(),
  minimumSalary: MinimumSalarySchema.optional(),
  workplaceType: singleOrArray(WorkplaceTypeSchema).optional(),
  listingAge: ListingAgeSchema.optional(),
  geoId: z.string().optional(),
  companyId: z.string().optional(),
});

const PaginationParamsSchema = z.object({
  start: z.number().optional(),
  skip: z.number().optional(),
  take: z.number().optional(),
});

/** Converts a ZodError into a ValidationError with a readable message. */
function toValidationError(error: z.ZodError): ValidationError {
  const messages = error.issues.map(issue => {
    const path = issue.path.join('.');
    if (issue.code === 'invalid_value' && 'values' in issue) {
      return `Invalid value for the ${path} parameter. Valid values: ${(issue.values as string[]).join(', ')}`;
    }
    return `Invalid value for the ${path} parameter: ${issue.message}`;
  });
  return new ValidationError(messages.join('; '));
}

/** Zod-inferred output type for normalized search params. */
type NormalizedJobSearchParams = z.output<typeof JobSearchParamsSchema>;

/** Zod-inferred output type for normalized pagination params. */
type NormalizedPaginationParams = z.output<typeof PaginationParamsSchema>;

/**
 * Normalizes job search parameters for query building.
 * Trims keyword/location whitespace and validates enum values.
 * @throws {ValidationError} If any enum value is invalid.
 */
export function normalizeJobSearchParams(params: JobSearchParams): NormalizedJobSearchParams {
  const result = JobSearchParamsSchema.safeParse(params);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

/** Normalizes pagination parameters for query building. */
export function normalizePaginationParams(params: PaginationParams): NormalizedPaginationParams {
  const result = PaginationParamsSchema.safeParse(params);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

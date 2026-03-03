import { z } from 'zod';
import type { ParamMap } from './params.js';
import {
  JOB_TYPE_MAPPING,
  EXPERIENCE_LEVEL_MAPPING,
  MINIMUM_SALARY_MAPPING,
  WORKPLACE_TYPE_MAPPING,
  LISTING_AGE_MAPPING,
  normalizeMinimumSalaryInput,
} from './params.js';

/**
 * Creates a Zod enum schema from a parameter map.
 * The schema validates that the value is one of the map's keys,
 * and the inferred type is the proper literal union of those keys.
 */
export function zodEnumFromMap<T extends ParamMap>(map: T): z.ZodEnum<{ [K in keyof T & string]: K }> {
  const keys = Object.keys(map) as (keyof T & string)[];
  if (keys.length === 0) {
    throw new Error('zodEnumFromMap requires a map with at least one key');
  }
  return z.enum(keys);
}

/** Zod schema for job type keys. */
export const JobTypeSchema = zodEnumFromMap(JOB_TYPE_MAPPING);

/** Zod schema for experience level keys. */
export const ExperienceLevelSchema = zodEnumFromMap(EXPERIENCE_LEVEL_MAPPING);

/** Zod schema for minimum salary keys. Accepts flexible formats (e.g. `180000`, `180_000`, `180,000`). */
export const MinimumSalarySchema = z.preprocess(
  (val) => normalizeMinimumSalaryInput(val) ?? val,
  zodEnumFromMap(MINIMUM_SALARY_MAPPING),
);

/** Zod schema for workplace type keys. */
export const WorkplaceTypeSchema = zodEnumFromMap(WORKPLACE_TYPE_MAPPING);

/** Zod schema for listing age keys. */
export const ListingAgeSchema = zodEnumFromMap(LISTING_AGE_MAPPING);

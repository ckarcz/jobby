import { JobbyClient, JobbyError } from 'jobby-client';
import type { z } from 'zod';
import type { SearchInputSchema, JobDetailsInputSchema } from './schemas.js';

/**
 * Shared Jobby API client used by all tool handlers.
 *
 * Instantiated once at module level so every request reuses the same
 * configuration without creating a new client per call.
 */
const client = new JobbyClient({ timeout: 30000 });

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- must be `type` for MCP SDK index signature compatibility
type ToolResponse = {
  content: { type: 'text'; text: string }[];
  isError?: true;
};

/**
 * Format an unknown thrown value into a human-readable error message.
 *
 * - {@link JobbyError} instances include the error code prefix.
 * - Standard `Error` instances use their `message` property.
 * - All other values are coerced to strings.
 */
export function handleError(error: unknown): string {
  if (error instanceof JobbyError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Handler for the `search_jobs` MCP tool.
 *
 * Parses the validated arguments, delegates to the Jobby client's
 * {@link JobbyClient.jobs.queryForJobs} method, and returns the
 * results as a JSON text response.
 */
export async function handleSearchJobs(
  args: z.infer<typeof SearchInputSchema>,
): Promise<ToolResponse> {
  try {
    const response = await client.jobs.queryForJobs({
      keyword: args.keyword,
      location: args.location,
      jobType: args.jobType,
      experienceLevel: args.experienceLevel,
      minimumSalary: args.minimumSalary,
      workplaceType: args.workplaceType,
      listingAge: args.listingAge,
      geoId: args.geoId,
      companyId: args.companyId,
    }, {
      start: args.start,
      skip: args.skip,
      take: args.take,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
    };
  } catch (error: unknown) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${handleError(error)}` }],
      isError: true,
    };
  }
}

/**
 * Handler for the `get_job_details` MCP tool.
 *
 * Fetches detailed information for a single job posting identified by URL or
 * ID.  When both `jobUrl` and `jobId` are supplied, `jobUrl` takes precedence.
 * Returns an error response if neither identifier is provided.
 */
export async function handleGetJobDetails(
  args: z.infer<typeof JobDetailsInputSchema>,
): Promise<ToolResponse> {
  try {
    if (!args.jobUrl && !args.jobId) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Either jobUrl or jobId is required' }],
        isError: true,
      };
    }

    const details = args.jobUrl
      ? await client.jobs.queryForJobDetailsByUrl(args.jobUrl)
      : await client.jobs.queryForJobDetailsById(args.jobId ?? '');

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details, null, 2) }],
    };
  } catch (error: unknown) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${handleError(error)}` }],
      isError: true,
    };
  }
}

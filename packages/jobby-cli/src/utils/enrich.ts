import type { Job, JobDetails, JobDetailsInfo } from 'jobby-client';
import { delay } from 'jobby-client';

/**
 * A job search result enriched with its full details.
 * The `details` field is `null` if the detail fetch failed.
 */
export interface EnrichedJob extends Job {
  details: JobDetailsInfo | null;
}

/** Options for controlling the batched detail-fetching behavior. */
interface FetchDetailsOptions {
  /** Number of detail requests to issue concurrently. @default 3 */
  batchSize?: number | undefined;
  /** Delay in milliseconds between batches. @default 2500 */
  delayMs?: number | undefined;
}

/**
 * Fetches full job details for a list of jobs in rate-limited batches.
 * Each batch runs concurrently, with a configurable delay between batches
 * to avoid triggering rate limits.
 *
 * @param jobs - Array of jobs to enrich with details
 * @param fetchFn - Function that fetches details for a single job by ID
 * @param options - Optional batch size and delay configuration
 * @returns Array of enriched jobs with details (or `null` on failure)
 */
export async function fetchDetailsInBatches(
  jobs: Job[],
  fetchFn: (jobId: string) => Promise<JobDetails>,
  options: FetchDetailsOptions = {},
): Promise<EnrichedJob[]> {
  const { batchSize = 3, delayMs = 2500 } = options;

  if (jobs.length === 0) {
    return [];
  }

  const results: EnrichedJob[] = [];

  for (let i = 0; i < jobs.length; i += batchSize) {
    if (i > 0) {
      await delay(delayMs);
    }

    const batch = jobs.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map((job) => {
        if (!job.id) {
          return Promise.reject(new Error('Job has no id'));
        }
        return fetchFn(job.id);
      }),
    );

    for (const [j, job] of batch.entries()) {
      const result = settled[j];
      results.push({
        ...job,
        details: result?.status === 'fulfilled' ? result.value.details : null,
      });
    }
  }

  return results;
}

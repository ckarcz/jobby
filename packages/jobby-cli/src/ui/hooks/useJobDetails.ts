import { useEffect, useMemo, useRef } from 'react';
import { JobbyClient } from 'jobby-client';
import { useSearchState, useSelectionState, useJobDetailsState, useAppDispatch } from '../state/context.js';
import { JOB_DETAILS_DEBOUNCE_MS } from '../constants.js';

/** Fetches job details for the selected job with debounce and cancellation. */
export function useJobDetails(): void {
  const { totalResults, searchStatus } = useSearchState();
  const { selectedJobIndex } = useSelectionState();
  const { jobDetailsStatus } = useJobDetailsState();
  const dispatch = useAppDispatch();
  const client = useMemo(() => new JobbyClient({ logging: { level: 'silent' } }), []);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedJob = searchStatus === 'results' ? (totalResults[selectedJobIndex] ?? null) : null;
  const selectedJobId = selectedJob?.id ?? null;

  // Track status in a ref so the effect can read it without re-triggering
  const statusRef = useRef(jobDetailsStatus);
  statusRef.current = jobDetailsStatus;

  useEffect(() => {
    // Clear any pending debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = null;

    // Only dispatch CLEAR if details aren't already idle (avoids a no-op re-render)
    if (statusRef.current !== 'idle') {
      dispatch({ type: 'CLEAR_JOB_DETAILS' });
    }

    if (!selectedJobId) {
      return;
    }

    // Debounce before fetching
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'JOB_DETAILS_START' });

      void client.jobs.queryForJobDetailsById(selectedJobId)
        .then((details) => {
          if (controller.signal.aborted) {
            return;
          }
          dispatch({ type: 'JOB_DETAILS_SUCCESS', details });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          dispatch({ type: 'JOB_DETAILS_ERROR', error: message });
        });
    }, JOB_DETAILS_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [selectedJobId, client, dispatch]);
}

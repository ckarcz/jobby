import { useCallback, useRef } from 'react';
import { JobbyClient } from 'jobby-client';
import { useAppState, useAppDispatch } from '../state/context.js';
import { buildSearchParams } from '../utils/buildSearchParams.js';
import type { SearchFilters } from '../state/filterTypes.js';

interface UseSearchResult {
  search: (keyword: string, filters?: SearchFilters) => void;
  loadMore: () => void;
}

/** Fires a job search and dispatches results to state. */
export function useSearch(): UseSearchResult {
  const { searchQuery, searchPagination, loadMoreStatus } = useAppState();
  const dispatch = useAppDispatch();
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    (keyword: string, filters?: SearchFilters) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'SEARCH_START' });

      const client = new JobbyClient({ signal: controller.signal, logging: { level: 'silent' } });
      const params = buildSearchParams(keyword, filters);

      void client.jobs.queryForJobs(params)
        .then((response) => {
          if (controller.signal.aborted) {
            return;
          }
          dispatch({
            type: 'SEARCH_SUCCESS',
            results: response.results,
            pagination: response.pagination,
            metadata: response.metadata,
            query: response.query,
          });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          dispatch({ type: 'SEARCH_ERROR', error: message });
        });
    },
    [dispatch],
  );

  const loadMore = useCallback(() => {
    if (loadMoreStatus !== 'idle' || !searchQuery || !searchPagination) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const nextStart = searchPagination.start + searchPagination.responseCount;
    dispatch({ type: 'LOAD_MORE_START' });

    const client = new JobbyClient({ signal: controller.signal, logging: { level: 'silent' } });

    void client.jobs.queryForJobs(searchQuery, { start: nextStart })
      .then((response) => {
        if (controller.signal.aborted) {
            return;
          }
        dispatch({
          type: 'LOAD_MORE_SUCCESS',
          results: response.results,
          pagination: response.pagination,
          metadata: response.metadata,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
            return;
          }
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'LOAD_MORE_ERROR', error: message });
      });
  }, [dispatch, searchQuery, searchPagination, loadMoreStatus]);

  return { search, loadMore };
}

import { useCallback, useMemo, useRef } from 'react';
import { JobbyClient } from 'jobby-client';
import { useSearchState, useAppDispatch } from '../state/context.js';
import { buildSearchParams } from '../utils/buildSearchParams.js';
import type { SearchFilters } from '../state/filterTypes.js';

interface UseSearchResult {
  search: (keyword: string, filters?: SearchFilters) => void;
  loadMore: () => void;
}

/** Fires a job search and dispatches results to state. */
export function useSearch(): UseSearchResult {
  const { searchQuery, searchPagination, loadMoreStatus } = useSearchState();
  const dispatch = useAppDispatch();
  const abortRef = useRef<AbortController | null>(null);
  const client = useMemo(() => new JobbyClient({ logging: { level: 'silent' } }), []);

  const search = useCallback(
    (keyword: string, filters?: SearchFilters) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'SEARCH_START' });

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
    [client, dispatch],
  );

  const loadMore = useCallback(() => {
    if ((loadMoreStatus !== 'idle' && loadMoreStatus !== 'error') || !searchQuery || !searchPagination) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const nextStart = searchPagination.start + searchPagination.responseCount;
    dispatch({ type: 'LOAD_MORE_START' });

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
  }, [client, dispatch, searchQuery, searchPagination, loadMoreStatus]);

  return { search, loadMore };
}

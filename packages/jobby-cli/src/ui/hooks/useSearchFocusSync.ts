import { useEffect, useRef } from 'react';
import { useSearchState, useAppDispatch } from '../state/context.js';
import type { SearchStatus } from '../state/types.js';

/** Auto-focus results panel after a search completes successfully. */
export function useSearchFocusSync(): void {
  const { searchStatus, totalResults } = useSearchState();
  const dispatch = useAppDispatch();
  const prevStatusRef = useRef<SearchStatus>(searchStatus);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = searchStatus;

    if (prev === 'searching' && searchStatus === 'results' && totalResults.length > 0) {
      dispatch({ type: 'FOCUS_PANEL', panel: 'results' });
    }
  }, [searchStatus, totalResults.length, dispatch]);
}

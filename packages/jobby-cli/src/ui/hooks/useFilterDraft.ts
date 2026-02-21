import { useReducer, useEffect, useRef } from 'react';
import { useAppState } from '../state/context.js';
import { filterDrawerReducer, createInitialDraftState } from '../state/filterReducer.js';
import type { FilterDrawerState, FilterDrawerAction } from '../state/filterReducer.js';

/** Manages filter drawer draft state, including reset-on-open. */
export function useFilterDraft(): [FilterDrawerState, React.Dispatch<FilterDrawerAction>] {
  const { filterDrawerOpen, searchFilters } = useAppState();
  const [draft, draftDispatch] = useReducer(filterDrawerReducer, searchFilters, createInitialDraftState);
  const prevOpenRef = useRef(filterDrawerOpen);

  // Reset draft state when drawer opens
  useEffect(() => {
    if (filterDrawerOpen && !prevOpenRef.current) {
      draftDispatch({ type: 'RESET_FILTERS', filters: searchFilters });
    }
    prevOpenRef.current = filterDrawerOpen;
  }, [filterDrawerOpen, searchFilters]);

  return [draft, draftDispatch];
}

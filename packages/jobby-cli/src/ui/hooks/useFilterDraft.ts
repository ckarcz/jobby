import { useReducer, useEffect, useRef } from 'react';
import { useAppState } from '../state/context.js';
import { filterDrawerReducer, createInitialDraftState } from '../state/filterReducer.js';
import type { FilterDrawerState, FilterDrawerAction } from '../state/filterReducer.js';
import { getSectionLineOffset } from '../state/filterHelpers.js';
import { FILTER_DRAWER_CHROME_LINES } from '../constants.js';

/** Manages filter drawer draft state, including reset-on-open and auto-scroll. */
export function useFilterDraft(): [FilterDrawerState, React.Dispatch<FilterDrawerAction>] {
  const { filterDrawerOpen, searchFilters, maxHeight } = useAppState();
  const [draft, draftDispatch] = useReducer(filterDrawerReducer, searchFilters, createInitialDraftState);
  const prevOpenRef = useRef(filterDrawerOpen);

  // Reset draft state when drawer opens
  useEffect(() => {
    if (filterDrawerOpen && !prevOpenRef.current) {
      draftDispatch({ type: 'RESET', filters: searchFilters });
    }
    prevOpenRef.current = filterDrawerOpen;
  }, [filterDrawerOpen, searchFilters]);

  // Auto-scroll to keep active section visible
  useEffect(() => {
    const sectionOffset = getSectionLineOffset(draft.activeSectionIndex);
    const section = draft.sections[draft.activeSectionIndex];
    if (!section) {
      return;
    }
    const sectionHeight = 1 + (section.type === 'text' ? 1 : section.options.length);
    const availableHeight = maxHeight - FILTER_DRAWER_CHROME_LINES;

    if (sectionOffset < draft.scrollOffset) {
      draftDispatch({ type: 'SET_SCROLL_OFFSET', offset: sectionOffset });
    } else if (sectionOffset + sectionHeight > draft.scrollOffset + availableHeight) {
      draftDispatch({ type: 'SET_SCROLL_OFFSET', offset: Math.max(0, sectionOffset + sectionHeight - availableHeight) });
    }
  }, [draft.activeSectionIndex, draft.sections, draft.scrollOffset, maxHeight]);

  return [draft, draftDispatch];
}

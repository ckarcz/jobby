import type { SearchFilters, FilterSectionKey } from './filterTypes.js';
import { SECTION_ORDER } from './filterTypes.js';

/** Local draft state for the FilterDrawer. */
export interface FilterDrawerState {
  activeSection: FilterSectionKey;
  cursors: Record<FilterSectionKey, number>;
  selections: SearchFilters;
}

export type FilterDrawerAction =
  | { type: 'NAVIGATE_FILTERS'; activeSection: FilterSectionKey; cursor: number }
  | { type: 'SET_FILTERS'; filters: Partial<SearchFilters> }
  | { type: 'RESET_FILTERS'; filters: SearchFilters };

/** Create initial cursors record with all keys at 0. */
function createInitialCursors(): Record<FilterSectionKey, number> {
  const cursors = {} as Record<FilterSectionKey, number>;
  for (const key of SECTION_ORDER) {
    cursors[key] = 0;
  }
  return cursors;
}

/** The first section key in navigation order. */
const FIRST_SECTION: FilterSectionKey = 'jobType';

/** Create initial draft state from applied filters. */
export function createInitialDraftState(filters: SearchFilters): FilterDrawerState {
  return {
    activeSection: FIRST_SECTION,
    cursors: createInitialCursors(),
    selections: { ...filters },
  };
}

export function filterDrawerReducer(state: FilterDrawerState, action: FilterDrawerAction): FilterDrawerState {
  switch (action.type) {
    case 'NAVIGATE_FILTERS': {
      const cursors = { ...state.cursors, [action.activeSection]: action.cursor };
      return { ...state, activeSection: action.activeSection, cursors };
    }
    case 'SET_FILTERS':
      return { ...state, selections: { ...state.selections, ...action.filters } };
    case 'RESET_FILTERS':
      return createInitialDraftState(action.filters);
  }
}

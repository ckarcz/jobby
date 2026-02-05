import type { Job, PaginationInfo, SearchMetadata, JobSearchParams } from 'jobby-client';
import type { SearchFilters } from './filterTypes.js';

export type { SearchFilters } from './filterTypes.js';

/** Identifiers for focusable panels. */
export type PanelId = 'search' | 'results' | 'filters';

/** Current search lifecycle status. */
export type SearchStatus = 'idle' | 'searching' | 'results' | 'error';

/** Status of loading the next page of results. */
export type LoadMoreStatus = 'idle' | 'loading' | 'exhausted';

/** Complete application state. */
export interface AppState {
  terminalWidth: number;
  terminalHeight: number;
  maxWidth: number;
  maxHeight: number;
  focusedPanel: PanelId | null;
  searchKeyword: string;
  searchStatus: SearchStatus;
  totalResults: Job[];
  searchResults: Job[];
  searchPagination: PaginationInfo | undefined;
  searchMetadata: SearchMetadata | undefined;
  searchQuery: JobSearchParams | undefined;
  searchError: string | undefined;
  selectedJobIndex: number;
  loadMoreStatus: LoadMoreStatus;
  searchFilters: SearchFilters;
  filterDrawerOpen: boolean;
}

/** All possible state actions. */
export type AppAction =
  | { type: 'SET_TERMINAL_SIZE'; width: number; height: number }
  | { type: 'FOCUS_PANEL'; panel: PanelId }
  | { type: 'BLUR_ALL' }
  | { type: 'SET_SEARCH_KEYWORD'; keyword: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; results: Job[]; pagination: PaginationInfo; metadata: SearchMetadata; query: JobSearchParams }
  | { type: 'SEARCH_ERROR'; error: string }
  | { type: 'SET_SELECTED_JOB_INDEX'; index: number }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; results: Job[]; pagination: PaginationInfo; metadata: SearchMetadata }
  | { type: 'LOAD_MORE_ERROR'; error: string }
  | { type: 'OPEN_FILTER_DRAWER' }
  | { type: 'CLOSE_FILTER_DRAWER' }
  | { type: 'APPLY_FILTERS'; filters: SearchFilters };

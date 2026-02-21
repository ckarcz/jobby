import { createContext, useContext } from 'react';
import type { Job, JobDetails, PaginationInfo, SearchMetadata, JobSearchParams } from 'jobby-client';
import type { AppAction, PanelId, SearchStatus, LoadMoreStatus, JobDetailsStatus } from './types.js';
import type { SearchFilters } from './filterTypes.js';
import { emptyFilters } from './filterTypes.js';

/** Terminal dimensions, panel focus, and drawer visibility. */
export interface LayoutState {
  terminalWidth: number;
  terminalHeight: number;
  maxWidth: number;
  maxHeight: number;
  focusedPanel: PanelId | null;
  filterDrawerOpen: boolean;
}

/** Search lifecycle: keyword, status, results, pagination, filters. */
export interface SearchState {
  searchKeyword: string;
  searchStatus: SearchStatus;
  totalResults: Job[];
  searchResults: Job[];
  searchPagination: PaginationInfo | undefined;
  searchMetadata: SearchMetadata | undefined;
  searchQuery: JobSearchParams | undefined;
  searchError: string | undefined;
  searchFilters: SearchFilters;
  loadMoreStatus: LoadMoreStatus;
  loadMoreError: string | undefined;
}

/** Current selection index in the results list. */
export interface SelectionState {
  selectedJobIndex: number;
}

/** Job details for the selected job. */
export interface JobDetailsState {
  jobDetails: JobDetails | null;
  jobDetailsStatus: JobDetailsStatus;
  jobDetailsError: string | undefined;
}

// --- Default values ---

const defaultLayout: LayoutState = {
  terminalWidth: process.stdout.columns,
  terminalHeight: process.stdout.rows,
  maxWidth: process.stdout.columns,
  maxHeight: process.stdout.rows,
  focusedPanel: null,
  filterDrawerOpen: false,
};

const defaultSearch: SearchState = {
  searchKeyword: '',
  searchStatus: 'idle',
  totalResults: [],
  searchResults: [],
  searchPagination: undefined,
  searchMetadata: undefined,
  searchQuery: undefined,
  searchError: undefined,
  searchFilters: emptyFilters,
  loadMoreStatus: 'idle',
  loadMoreError: undefined,
};

const defaultSelection: SelectionState = {
  selectedJobIndex: 0,
};

const defaultJobDetails: JobDetailsState = {
  jobDetails: null,
  jobDetailsStatus: 'idle',
  jobDetailsError: undefined,
};

// --- Contexts ---

export const LayoutContext = createContext<LayoutState>(defaultLayout);
export const SearchContext = createContext<SearchState>(defaultSearch);
export const SelectionContext = createContext<SelectionState>(defaultSelection);
export const JobDetailsContext = createContext<JobDetailsState>(defaultJobDetails);
export const DispatchContext = createContext<React.Dispatch<AppAction>>(() => undefined);

// --- Consumer hooks ---

/** Layout state: terminal size, focused panel, drawer visibility. */
export function useLayoutState(): LayoutState {
  return useContext(LayoutContext);
}

/** Search state: keyword, status, results, pagination, filters. */
export function useSearchState(): SearchState {
  return useContext(SearchContext);
}

/** Selection state: selected index in results list. */
export function useSelectionState(): SelectionState {
  return useContext(SelectionContext);
}

/** Job details state: details, status, error for the selected job. */
export function useJobDetailsState(): JobDetailsState {
  return useContext(JobDetailsContext);
}

/** Stable dispatch function (identity never changes). */
export function useAppDispatch(): React.Dispatch<AppAction> {
  return useContext(DispatchContext);
}

/** Returns the currently focused panel ID (or null). */
export function useFocusedPanel(): PanelId | null {
  return useContext(LayoutContext).focusedPanel;
}

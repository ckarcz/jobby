import type { AppState, AppAction } from './types.js';
import { emptyFilters } from './filterTypes.js';

export const initialState: AppState = {
  terminalWidth: process.stdout.columns,
  terminalHeight: process.stdout.rows,
  maxWidth: process.stdout.columns - 1,
  maxHeight: process.stdout.rows - 1,
  focusedPanel: null,
  searchKeyword: '',
  searchStatus: 'idle',
  totalResults: [],
  searchResults: [],
  searchPagination: undefined,
  searchMetadata: undefined,
  searchQuery: undefined,
  searchError: undefined,
  selectedJobIndex: 0,
  loadMoreStatus: 'idle',
  searchFilters: emptyFilters,
  filterDrawerOpen: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TERMINAL_SIZE':
      return { ...state, terminalWidth: action.width, terminalHeight: action.height, maxWidth: action.width - 1, maxHeight: action.height - 1 };
    case 'FOCUS_PANEL':
      return { ...state, focusedPanel: action.panel };
    case 'BLUR_ALL':
      return { ...state, focusedPanel: null };
    case 'SET_SEARCH_KEYWORD':
      return { ...state, searchKeyword: action.keyword };
    case 'SEARCH_START':
      return {
        ...state,
        searchStatus: 'searching',
        searchError: undefined,
        loadMoreStatus: 'idle',
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        searchStatus: 'results',
        totalResults: action.results,
        searchResults: action.results,
        searchPagination: action.pagination,
        searchMetadata: action.metadata,
        searchQuery: action.query,
        selectedJobIndex: 0,
        loadMoreStatus: 'idle',
      };
    case 'SEARCH_ERROR':
      return {
        ...state,
        searchStatus: 'error',
        searchError: action.error,
      };
    case 'SET_SELECTED_JOB_INDEX':
      return { ...state, selectedJobIndex: action.index };
    case 'CLEAR_RESULTS':
      return { ...state, searchStatus: 'idle', totalResults: [], searchResults: [], searchPagination: undefined, searchMetadata: undefined, searchQuery: undefined, searchError: undefined, selectedJobIndex: 0, loadMoreStatus: 'idle' };
    case 'LOAD_MORE_START':
      return { ...state, loadMoreStatus: 'loading' };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        totalResults: [...state.totalResults, ...action.results],
        searchResults: action.results,
        searchPagination: action.pagination,
        searchMetadata: action.metadata,
        loadMoreStatus: action.results.length === 0 ? 'exhausted' : 'idle',
      };
    case 'LOAD_MORE_ERROR':
      return { ...state, loadMoreStatus: 'idle' };
    case 'OPEN_FILTER_DRAWER':
      return { ...state, filterDrawerOpen: true };
    case 'CLOSE_FILTER_DRAWER':
      return state.filterDrawerOpen ? { ...state, filterDrawerOpen: false } : state;
    case 'APPLY_FILTERS':
      return { ...state, searchFilters: action.filters };
  }
}

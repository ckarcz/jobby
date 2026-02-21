import React, { useMemo, useReducer, useRef } from 'react';
import {
  LayoutContext, SearchContext, SelectionContext, JobDetailsContext, DispatchContext, TextInputActiveContext,
  type LayoutState, type SearchState, type SelectionState, type JobDetailsState,
} from './state/context.js';
import { appReducer, initialState } from './state/reducer.js';
import { Layout } from './components/Layout.js';
import { useFullScreen } from './hooks/useFullScreen.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { useJobDetails } from './hooks/useJobDetails.js';
import { useSearchFocusSync } from './hooks/useSearchFocusSync.js';

/** Inner app component that uses context hooks (must be inside providers). */
function AppInner(): React.ReactElement {
  useFullScreen();
  useKeyboardNavigation();
  useSearchFocusSync();
  useJobDetails();
  return <Layout />;
}

/** Root application component for the interactive terminal UI. */
export function App(): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const textInputActiveRef = useRef(0);

  const layoutState = useMemo<LayoutState>(() => ({
    terminalWidth: state.terminalWidth,
    terminalHeight: state.terminalHeight,
    maxWidth: state.maxWidth,
    maxHeight: state.maxHeight,
    focusedPanel: state.focusedPanel,
    filterDrawerOpen: state.filterDrawerOpen,
  }), [state.terminalWidth, state.terminalHeight, state.maxWidth, state.maxHeight, state.focusedPanel, state.filterDrawerOpen]);

  const searchState = useMemo<SearchState>(() => ({
    searchKeyword: state.searchKeyword,
    searchStatus: state.searchStatus,
    totalResults: state.totalResults,
    searchResults: state.searchResults,
    searchPagination: state.searchPagination,
    searchMetadata: state.searchMetadata,
    searchQuery: state.searchQuery,
    searchError: state.searchError,
    searchFilters: state.searchFilters,
    loadMoreStatus: state.loadMoreStatus,
    loadMoreError: state.loadMoreError,
  }), [state.searchKeyword, state.searchStatus, state.totalResults, state.searchResults, state.searchPagination, state.searchMetadata, state.searchQuery, state.searchError, state.searchFilters, state.loadMoreStatus, state.loadMoreError]);

  const selectionState = useMemo<SelectionState>(() => ({
    selectedJobIndex: state.selectedJobIndex,
  }), [state.selectedJobIndex]);

  const jobDetailsState = useMemo<JobDetailsState>(() => ({
    jobDetails: state.jobDetails,
    jobDetailsStatus: state.jobDetailsStatus,
    jobDetailsError: state.jobDetailsError,
  }), [state.jobDetails, state.jobDetailsStatus, state.jobDetailsError]);

  return (
    <DispatchContext.Provider value={dispatch}>
      <TextInputActiveContext.Provider value={textInputActiveRef}>
        <LayoutContext.Provider value={layoutState}>
          <SearchContext.Provider value={searchState}>
            <SelectionContext.Provider value={selectionState}>
              <JobDetailsContext.Provider value={jobDetailsState}>
                <AppInner />
              </JobDetailsContext.Provider>
            </SelectionContext.Provider>
          </SearchContext.Provider>
        </LayoutContext.Provider>
      </TextInputActiveContext.Provider>
    </DispatchContext.Provider>
  );
}

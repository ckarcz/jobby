import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from './reducer.js';
import type { AppState } from './types.js';

/**
 * Tests for the appReducer, focusing on LOAD_MORE_ERROR behavior
 * to ensure errors are stored in state rather than silently discarded.
 */

describe('appReducer - LOAD_MORE_ERROR handling', () => {
  const stateWithResults: AppState = {
    ...initialState,
    searchStatus: 'results',
    totalResults: [{ id: '1' }] as AppState['totalResults'],
    searchResults: [{ id: '1' }] as AppState['searchResults'],
    loadMoreStatus: 'loading',
  };

  it('should set loadMoreStatus to error and store the error message', () => {
    const result = appReducer(stateWithResults, { type: 'LOAD_MORE_ERROR', error: 'Network timeout' });
    expect(result.loadMoreStatus).toBe('error');
    expect(result.loadMoreError).toBe('Network timeout');
  });

  it('should preserve existing results when load more fails', () => {
    const result = appReducer(stateWithResults, { type: 'LOAD_MORE_ERROR', error: 'Server error' });
    expect(result.totalResults).toBe(stateWithResults.totalResults);
    expect(result.searchResults).toBe(stateWithResults.searchResults);
  });

  it('should clear loadMoreError on LOAD_MORE_START', () => {
    const stateWithError: AppState = {
      ...stateWithResults,
      loadMoreStatus: 'error',
      loadMoreError: 'Previous error',
    };
    const result = appReducer(stateWithError, { type: 'LOAD_MORE_START' });
    expect(result.loadMoreStatus).toBe('loading');
    expect(result.loadMoreError).toBeUndefined();
  });

  it('should clear loadMoreError on SEARCH_START', () => {
    const stateWithError: AppState = {
      ...stateWithResults,
      loadMoreStatus: 'error',
      loadMoreError: 'Previous error',
    };
    const result = appReducer(stateWithError, { type: 'SEARCH_START' });
    expect(result.loadMoreStatus).toBe('idle');
    expect(result.loadMoreError).toBeUndefined();
  });

  it('should clear loadMoreError on CLEAR_RESULTS', () => {
    const stateWithError: AppState = {
      ...stateWithResults,
      loadMoreStatus: 'error',
      loadMoreError: 'Previous error',
    };
    const result = appReducer(stateWithError, { type: 'CLEAR_RESULTS' });
    expect(result.loadMoreStatus).toBe('idle');
    expect(result.loadMoreError).toBeUndefined();
  });

  it('should have loadMoreError as undefined in initial state', () => {
    expect(initialState.loadMoreError).toBeUndefined();
    expect(initialState.loadMoreStatus).toBe('idle');
  });
});

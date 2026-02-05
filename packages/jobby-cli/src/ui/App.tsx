import React, { useEffect, useReducer, useRef } from 'react';
import { AppContext, useAppState, useAppDispatch } from './state/context.js';
import { appReducer, initialState } from './state/reducer.js';
import { Layout } from './components/Layout.js';
import { useFullScreen } from './hooks/useFullScreen.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import type { SearchStatus } from './state/types.js';

/** Auto-focus results panel after a search completes successfully. */
function useSearchFocusSync(): void {
  const { searchStatus, totalResults } = useAppState();
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

/** Inner app component that uses context hooks (must be inside providers). */
function AppInner(): React.ReactElement {
  useFullScreen();
  useKeyboardNavigation();
  useSearchFocusSync();
  return <Layout />;
}

/** Root application component for the interactive terminal UI. */
export function App(): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppInner />
    </AppContext.Provider>
  );
}

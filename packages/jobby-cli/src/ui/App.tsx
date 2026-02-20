import React, { useReducer } from 'react';
import { AppContext } from './state/context.js';
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

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppInner />
    </AppContext.Provider>
  );
}

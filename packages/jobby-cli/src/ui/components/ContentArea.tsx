import React from 'react';
import { useSearchState } from '../state/context.js';
import { WelcomeScreen } from './WelcomeScreen.js';
import { SearchingSpinner } from './SearchingSpinner.js';
import { SearchResults } from './SearchResults.js';
import { SearchError } from './SearchError.js';
import { NoSearchResults } from './NoSearchResults.js';

/** Routes the main content area based on the current search status. */
export function ContentArea(): React.ReactElement {
  const { searchStatus, searchError, totalResults } = useSearchState();

  switch (searchStatus) {
    case 'idle':
      return <WelcomeScreen />;
    case 'searching':
      return <SearchingSpinner />;
    case 'results':
      return totalResults.length === 0 ? <NoSearchResults /> : <SearchResults />;
    case 'error':
      return <SearchError message={searchError ?? 'An unknown error occurred'} />;
    default: {
      const _exhaustive: never = searchStatus;
      return _exhaustive;
    }
  }
}

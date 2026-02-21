import { createContext, useContext } from 'react';
import type { SearchFilters } from './filterTypes.js';

/** Actions provided by the single useSearch() call. */
export interface SearchActions {
  search: (keyword: string, filters?: SearchFilters) => void;
  loadMore: () => void;
}

/** Context for search/loadMore actions — created once in AppInner, consumed everywhere. */
export const SearchActionsContext = createContext<SearchActions>({
  search: () => undefined,
  loadMore: () => undefined,
});

/** Consume the shared search actions (search, loadMore). */
export function useSearchActions(): SearchActions {
  return useContext(SearchActionsContext);
}

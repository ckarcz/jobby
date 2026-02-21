import React, { useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useAppState, useAppDispatch } from '../state/context.js';
import { useSearch } from '../hooks/useSearch.js';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { colors, icons } from '../theme.js';

/** Search bar that mounts a TextInput when focused, shows static text when blurred. */
export function SearchBar(): React.ReactElement {
  const { searchKeyword, searchFilters, totalResults } = useAppState();
  const dispatch = useAppDispatch();
  const { search } = useSearch();
  const focused = usePanelFocus('search');

  // Persist typed text across TextInput mount/unmount cycles
  const draftRef = useRef(searchKeyword);

  // Stable refs for callbacks that need current values
  const searchFiltersRef = useRef(searchFilters);
  searchFiltersRef.current = searchFilters;
  const searchRef = useRef(search);
  searchRef.current = search;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useInput((_input, key) => {
    if (key.escape) {
      if (totalResults.length > 0) {
        dispatch({ type: 'FOCUS_PANEL', panel: 'results' });
      } else {
        dispatch({ type: 'BLUR_ALL' });
      }
    }
  }, { isActive: focused });

  const handleChange = useCallback((value: string) => {
    draftRef.current = value;
  }, []);

  const handleSubmit = useCallback((value: string) => {
    const keyword = value.trim();
    draftRef.current = keyword;
    dispatchRef.current({ type: 'BLUR_ALL' });
    dispatchRef.current({ type: 'SET_SEARCH_KEYWORD', keyword });
    searchRef.current(keyword, searchFiltersRef.current);
  }, []);

  if (focused) {
    return (
      <Box>
        <Text color={colors.focus}>{icons.search} Search: </Text>
        <TextInput
          defaultValue={draftRef.current}
          placeholder="Enter job keyword..."
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </Box>
    );
  }

  if (searchKeyword) {
    return (
      <Box>
        <Text>{icons.search} Search: </Text>
        <Text dimColor>
          {searchKeyword}
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text>{icons.search} Search: </Text>
      <Text dimColor>
        Press / to search...
      </Text>
    </Box>
  );
}

import React, { useRef, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useSearchState, useAppDispatch, useTextInputRegistration } from '../state/context.js';
import { useSearchActions } from '../state/searchActions.js';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { colors, icons } from '../theme.js';

/** Search bar that mounts a TextInput when focused, shows static text when blurred. */
export function SearchBar(): React.ReactElement {
  const { searchKeyword, searchFilters, totalResults } = useSearchState();
  const dispatch = useAppDispatch();
  const { search } = useSearchActions();
  const focused = usePanelFocus('search');

  // Register that a text input is active when search bar is focused
  useTextInputRegistration(focused);

  // Persist typed text across TextInput mount/unmount cycles
  const draftRef = useRef(searchKeyword);

  // Keep ref in sync when global state changes (e.g. CLEAR_RESULTS resets keyword)
  useEffect(() => {
    draftRef.current = searchKeyword;
  }, [searchKeyword]);

  // Stable refs for callbacks that need current values
  const searchFiltersRef = useRef(searchFilters);
  searchFiltersRef.current = searchFilters;
  const searchRef = useRef(search);
  searchRef.current = search;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // Note: TextInput (rendered below) has its own internal useInput that handles
  // Enter (onSubmit) and printable characters (onChange). Do NOT add handlers for
  // those keys here — both handlers fire simultaneously and would cause double actions.
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

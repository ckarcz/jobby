import React, { useRef } from 'react';
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

  useInput((_input, key) => {
    if (key.escape) {
      if (totalResults.length > 0) {
        dispatch({ type: 'FOCUS_PANEL', panel: 'results' });
      } else {
        dispatch({ type: 'BLUR_ALL' });
      }
    }
  }, { isActive: focused });

  if (focused) {
    return (
      <Box>
        <Text color={colors.focus}>{icons.search} Search: </Text>
        <TextInput
          defaultValue={draftRef.current}
          placeholder="Enter job keyword..."
          onChange={(value) => {
            draftRef.current = value;
          }}
          onSubmit={(value) => {
            const keyword = value.trim();
            draftRef.current = keyword;
            dispatch({ type: 'BLUR_ALL' });
            dispatch({ type: 'SET_SEARCH_KEYWORD', keyword });
            search(keyword, searchFilters);
          }}
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

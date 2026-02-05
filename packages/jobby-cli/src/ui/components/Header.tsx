import React from 'react';
import { Box } from 'ink';
import { SearchBar } from './SearchBar.js';

/** Top bar showing the application title and search bar. */
export function Header(): React.ReactElement {
  return (
    <Box width="100%" paddingX={1} gap={2}>
      <SearchBar />
    </Box>
  );
}

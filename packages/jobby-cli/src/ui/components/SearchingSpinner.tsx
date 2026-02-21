import React from 'react';
import { Box } from 'ink';
import { Spinner } from '@inkjs/ui';

/** Centered spinner shown while a search is in progress. */
export const SearchingSpinner = React.memo(function SearchingSpinner(): React.ReactElement {
  return (
    <Box flexGrow={1} justifyContent="center" alignItems="center">
      <Spinner label="Searching for jobs..." />
    </Box>
  );
});

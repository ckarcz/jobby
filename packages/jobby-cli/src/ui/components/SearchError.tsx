import React from 'react';
import { Box, Text } from 'ink';
import { Alert } from '@inkjs/ui';

interface SearchErrorProps {
  message: string;
}

/** Error display with retry hint. */
export const SearchError = React.memo(function SearchError({ message }: SearchErrorProps): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1} paddingTop={1}>
      <Alert variant="error">{message}</Alert>
      <Box justifyContent="center" paddingTop={1}>
        <Text dimColor>Press <Text bold>/</Text> to try a new search</Text>
      </Box>
    </Box>
  );
});

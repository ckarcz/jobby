import React from 'react';
import { Box, Text } from 'ink';
import { icons } from '../theme.js';

/** Shown when a search completes but returns no matching jobs. */
export const NoSearchResults = React.memo(function NoSearchResults(): React.ReactElement {
  return (
    <Box rowGap={1} flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Box flexDirection="column" justifyContent="center" alignItems="center">
        <Text>
          {icons.crying}
        </Text>
        <Text>
          No jobs found
        </Text>
      </Box>
      <Box>
        <Text dimColor>Try different keywords or broaden your search</Text>
      </Box>
      <Box>
        <Text>
          Press <Text color="yellow">/</Text> to try again
        </Text>
      </Box>
    </Box>
  );
});

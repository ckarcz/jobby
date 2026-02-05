import React from 'react';
import { Box, Text } from 'ink';
import { icons } from '../theme.js';

/** Initial screen shown before the first search. */
export function WelcomeScreen(): React.ReactElement {
  return (
    <Box rowGap={1} flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
      <Text>
        {icons.rocket} Job Search
      </Text>
      <Text>
        Press <Text color="yellow">/</Text> to start searching
      </Text>
    </Box>
  );
}

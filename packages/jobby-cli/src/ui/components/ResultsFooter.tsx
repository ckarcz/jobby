import React from 'react';
import { Box, Text } from 'ink';
import type { LoadMoreStatus } from '../state/types.js';
import { icons } from '../theme.js';

interface ResultsFooterProps {
  isOnLastItem: boolean;
  loadMoreStatus: LoadMoreStatus;
  hasResults: boolean;
}

/** Load-more status messages below the results list. */
export function ResultsFooter({ isOnLastItem, loadMoreStatus, hasResults }: ResultsFooterProps): React.ReactElement | null {
  if (!hasResults || !isOnLastItem) {
    return null;
  }

  let text = '';
  if (loadMoreStatus === 'loading') {
    text = `${icons.lightning}Fetching more jobs...`;
  } else if (loadMoreStatus === 'exhausted') {
    text = 'No more jobs ლ(ಠ益ಠლ)';
  } else {
    text = '[↓] To try to load more';
  }

  return (
    <Box paddingLeft={2}>
      <Text dimColor>{text}</Text>
    </Box>
  );
}

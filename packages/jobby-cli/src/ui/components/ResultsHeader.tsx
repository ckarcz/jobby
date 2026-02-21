import React from 'react';
import { Box, Text } from 'ink';
import type { ViewportState } from 'ink-virtual-list';
import { icons } from '../theme.js';

interface ResultsHeaderProps {
  viewport: ViewportState;
  totalCount: number;
  showLoadDuration: boolean;
  loadDurationSec: string | null;
  fetchedCount: number;
}

/** Viewport info and load duration display above the results list. */
export const ResultsHeader = React.memo(function ResultsHeader({ viewport, totalCount, showLoadDuration, loadDurationSec, fetchedCount }: ResultsHeaderProps): React.ReactElement {
  return (
    <Box height={1}>
      <Box position="absolute" width="100%" justifyContent="center">
        <Text dimColor>
          Showing {viewport.offset + 1}–{Math.min(viewport.offset + viewport.visibleCount, totalCount)} of {totalCount}
        </Text>
      </Box>
      {showLoadDuration && loadDurationSec !== null && (
        <Box position="absolute" width="100%" justifyContent="flex-end">
          <Text dimColor>
            {icons.lightning} Fetched {fetchedCount} jobs in {loadDurationSec}s
          </Text>
        </Box>
      )}
    </Box>
  );
});

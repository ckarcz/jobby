import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../state/context.js';
import { countActiveFilters } from '../state/filterTypes.js';

/** Bottom bar showing context-sensitive keyboard hints. */
export function StatusBar(): React.ReactElement {
  const { searchFilters, terminalWidth, terminalHeight, focusedPanel } = useAppState();

  const activeCount = countActiveFilters(searchFilters);
  const filterBadge = activeCount > 0 ? ` (${String(activeCount)})` : '';

  let leftHints: string;
  if (focusedPanel === 'search') {
    leftHints = '[Type]:Keyword  [Enter]:Search  [Esc]:Cancel';
  } else if (focusedPanel === 'filters') {
    leftHints = '[Tab]:Next  [↑↓]:Move  [Space]:Select  [Enter]:Search  [Esc]:Cancel';
  } else if (focusedPanel === 'results') {
    leftHints = `[/]:Search  [\\]:Filters${filterBadge}  [↑↓]:Navigate  [Esc]:Clear`;
  } else {
    leftHints = `[/]:Search  [\\]:Filters${filterBadge}`;
  }

  const rightInfo = `[${String(terminalWidth)}x${String(terminalHeight)}]`;

  return (
    <Box width="100%" paddingX={1} justifyContent="space-between">
      <Text dimColor>{leftHints}</Text>
      <Text dimColor>{rightInfo}</Text>
    </Box>
  );
}

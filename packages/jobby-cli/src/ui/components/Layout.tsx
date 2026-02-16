import React from 'react';
import { Box } from 'ink';
import { useAppState } from '../state/context.js';
import { Header } from './Header.js';
import { ContentArea } from './ContentArea.js';
import { StatusBar } from './StatusBar.js';
import { FocusableBox } from './FocusableBox.js';
import { FilterDrawer } from './FilterDrawer.js';

/** Fullscreen layout with header, main content area, and status bar. */
export function Layout(): React.ReactElement {
  const { maxWidth, maxHeight, filterDrawerOpen } = useAppState();

  return (
    <Box flexDirection="column" width={maxWidth} height={maxHeight} marginTop={0}>
      <Header />
      <Box flexDirection="row" flexGrow={1}>
        {filterDrawerOpen && <FilterDrawer />}
        <FocusableBox panel="results" flexGrow={1} flexDirection="column" borderStyle="single" paddingX={1}>
          <ContentArea />
        </FocusableBox>
      </Box>
      <StatusBar />
    </Box>
  );
}

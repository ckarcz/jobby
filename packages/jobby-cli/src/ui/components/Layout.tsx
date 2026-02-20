import React from 'react';
import { Box } from 'ink';
import { useAppState } from '../state/context.js';
import { Header } from './Header.js';
import { ContentArea } from './ContentArea.js';
import { StatusBar } from './StatusBar.js';
import { FocusableBox } from './FocusableBox.js';
import { FilterDrawer } from './FilterDrawer.js';
import { JobDetailsPanel } from './JobDetailsPanel.js';
import { FILTER_DRAWER_WIDTH } from '../constants.js';

/** Fullscreen layout with header, main content area, and status bar. */
export function Layout(): React.ReactElement {
  const { maxWidth, maxHeight, filterDrawerOpen, searchStatus, totalResults } = useAppState();

  const showDetailsPanel = searchStatus === 'results' && totalResults.length > 0;

  return (
    <Box flexDirection="column" width={maxWidth} height={maxHeight} marginTop={0}>
      <Header />
      <Box flexDirection="row" flexGrow={1}>
        {filterDrawerOpen && (
          <FocusableBox panel="filters" flexDirection="column" borderStyle="single" paddingX={1} width={FILTER_DRAWER_WIDTH} overflow="hidden">
            <FilterDrawer />
          </FocusableBox>
        )}
        <Box flexGrow={1} flexDirection="row">
          <FocusableBox panel="results" flexGrow={1} flexBasis={0} flexDirection="column" borderStyle="single" paddingX={1}>
            <ContentArea />
          </FocusableBox>
          {showDetailsPanel && (
            <FocusableBox panel="details" flexGrow={1} flexBasis={0} flexDirection="column" borderStyle="single" paddingX={1}>
              <JobDetailsPanel />
            </FocusableBox>
          )}
        </Box>
      </Box>
      <StatusBar />
    </Box>
  );
}

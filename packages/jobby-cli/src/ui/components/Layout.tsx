import React from 'react';
import { Box } from 'ink';
import { useAppState } from '../state/context.js';
import { useSlideAnimation } from '../hooks/useSlideAnimation.js';
import { Header } from './Header.js';
import { ContentArea } from './ContentArea.js';
import { StatusBar } from './StatusBar.js';
import { FocusableBox } from './FocusableBox.js';
import { FilterDrawer } from './FilterDrawer.js';
import { FILTER_DRAWER_WIDTH } from '../constants.js';

/** Fullscreen layout with header, main content area, and status bar. */
export function Layout(): React.ReactElement {
  const { maxWidth, maxHeight, filterDrawerOpen } = useAppState();
  const { currentWidth, isVisible } = useSlideAnimation(filterDrawerOpen, FILTER_DRAWER_WIDTH);

  return (
    <Box flexDirection="column" width={maxWidth} height={maxHeight} marginTop={0}>
      <Header />
      <Box flexDirection="row" flexGrow={1}>
        {isVisible && <FilterDrawer width={currentWidth} />}
        <FocusableBox panel="results" flexGrow={1} flexDirection="column" borderStyle="single" paddingX={1}>
          <ContentArea />
        </FocusableBox>
      </Box>
      <StatusBar />
    </Box>
  );
}

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Box, type DOMElement } from 'ink';
import { VirtualList, type VirtualListRef, type ViewportState } from 'ink-virtual-list';
import { useSearchState, useNavigationState } from '../state/context.js';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { useContainerHeight } from '../hooks/useContainerHeight.js';
import { useResultsKeyboard } from '../hooks/useResultsKeyboard.js';
import { useTimedVisibility } from '../hooks/useTimedVisibility.js';
import { JOBCARD_HEIGHT, JobCard } from './JobCard.js';
import { ResultsHeader } from './ResultsHeader.js';
import { ResultsFooter } from './ResultsFooter.js';
import { VIRTUAL_LIST_RESERVED_LINES, LOAD_DURATION_DISPLAY_MS } from '../constants.js';
import type { Job } from 'jobby-client';

/** Scrollable list of job search results. */
export function SearchResults(): React.ReactElement {
  const { totalResults, searchResults, searchMetadata, loadMoreStatus, loadMoreError } = useSearchState();
  const { selectedJobIndex } = useNavigationState();
  const panelFocused = usePanelFocus('results');
  const containerRef = useRef<DOMElement>(null);
  const listRef = useRef<VirtualListRef>(null);
  const [viewport, setViewport] = useState<ViewportState>({ offset: 0, visibleCount: 0, totalCount: 0 });

  useContainerHeight(containerRef);
  useResultsKeyboard(listRef, viewport);

  const showLoadDuration = useTimedVisibility(searchMetadata, LOAD_DURATION_DISPLAY_MS);
  const loadDurationSec = useMemo(
    () => searchMetadata ? (searchMetadata.durationMs / 1_000).toFixed(1) : null,
    [searchMetadata],
  );
  const isOnLastItem = selectedJobIndex >= totalResults.length - 1;

  const keyExtractor = useCallback((_: Job, i: number) => `job-${String(i)}`, []);

  const renderItem = useCallback(({ item, isSelected }: { item: Job; isSelected: boolean }) => (
    <JobCard job={item} focused={panelFocused && isSelected} />
  ), [panelFocused]);

  return (
    <Box ref={containerRef} flexDirection="column" flexGrow={1} justifyContent="flex-start" alignItems="stretch">
      <ResultsHeader
        viewport={viewport}
        totalCount={totalResults.length}
        showLoadDuration={showLoadDuration}
        loadDurationSec={loadDurationSec}
        fetchedCount={searchResults.length}
      />
      <VirtualList
        ref={listRef}
        items={totalResults}
        selectedIndex={selectedJobIndex}
        keyExtractor={keyExtractor}
        height='auto'
        reservedLines={VIRTUAL_LIST_RESERVED_LINES}
        itemHeight={JOBCARD_HEIGHT}
        onViewportChange={setViewport}
        renderItem={renderItem}
      />
      <ResultsFooter
        isOnLastItem={isOnLastItem}
        loadMoreStatus={loadMoreStatus}
        loadMoreError={loadMoreError}
        hasResults={totalResults.length > 0}
      />
    </Box>
  );
}

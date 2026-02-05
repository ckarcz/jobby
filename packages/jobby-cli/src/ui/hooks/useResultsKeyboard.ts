import { useRef, useEffect } from 'react';
import { useInput } from 'ink';
import type { VirtualListRef, ViewportState } from 'ink-virtual-list';
import { useAppState, useAppDispatch } from '../state/context.js';
import { usePanelFocus } from './usePanelFocus.js';
import { useSearch } from './useSearch.js';

/** Keyboard handling and deferred-scroll logic for the results list. */
export function useResultsKeyboard(
  listRef: React.RefObject<VirtualListRef | null>,
  viewport: ViewportState,
): void {
  const { totalResults, selectedJobIndex, loadMoreStatus } = useAppState();
  const dispatch = useAppDispatch();
  const panelFocused = usePanelFocus('results');
  const { loadMore } = useSearch();

  const pendingScroll = useRef<{ index: number; alignment: 'top' | 'bottom' } | null>(null);
  const scrollAfterLoadMore = useRef(false);

  const maxIndex = totalResults.length - 1;
  const isOnLastItem = selectedJobIndex >= maxIndex;

  // After a page jump, scroll so the new selection is at the correct position
  useEffect(() => {
    if (pendingScroll.current !== null) {
      listRef.current?.scrollToIndex(pendingScroll.current.index, pendingScroll.current.alignment);
      pendingScroll.current = null;
    }
  }, [selectedJobIndex, listRef]);

  // After load-more triggered by a key-press, scroll forward one screenful
  useEffect(() => {
    if (!scrollAfterLoadMore.current) { return; }
    if (loadMoreStatus === 'loading') { return; }
    scrollAfterLoadMore.current = false;
    if (loadMoreStatus !== 'idle') { return; }
    const newMaxIndex = totalResults.length - 1;
    if (newMaxIndex <= selectedJobIndex) { return; }
    const target = Math.min(selectedJobIndex + viewport.visibleCount, newMaxIndex);
    pendingScroll.current = { index: target, alignment: 'bottom' };
    dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: target });
  }, [totalResults.length, loadMoreStatus, selectedJobIndex, viewport.visibleCount, dispatch]);

  useInput((_input, key) => {
    if (key.downArrow) {
      if (isOnLastItem) {
        loadMore();
      } else {
        dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: Math.min(selectedJobIndex + 1, maxIndex) });
      }
      return;
    }

    if (key.upArrow) {
      dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: Math.max(selectedJobIndex - 1, 0) });
      return;
    }

    if (key.home) {
      dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: 0 });
      return;
    }

    if (key.end) {
      if (isOnLastItem) {
        if (loadMoreStatus === 'idle') {
          scrollAfterLoadMore.current = true;
          loadMore();
        }
        return;
      }
      dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: maxIndex });
      return;
    }

    if (key.pageDown) {
      if (isOnLastItem) {
        if (loadMoreStatus === 'idle') {
          scrollAfterLoadMore.current = true;
          loadMore();
        }
        return;
      }
      const lastVisibleIndex = Math.min(viewport.offset + viewport.visibleCount - 1, maxIndex);
      if (selectedJobIndex < lastVisibleIndex) {
        dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: lastVisibleIndex });
      } else {
        const target = Math.min(lastVisibleIndex + viewport.visibleCount, maxIndex);
        pendingScroll.current = { index: target, alignment: 'bottom' };
        dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: target });
      }
      return;
    }

    if (key.pageUp) {
      const firstVisibleIndex = viewport.offset;
      if (selectedJobIndex > firstVisibleIndex) {
        dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: firstVisibleIndex });
      } else {
        const target = Math.max(firstVisibleIndex - viewport.visibleCount, 0);
        pendingScroll.current = { index: target, alignment: 'top' };
        dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: target });
      }
      return;
    }

    if (key.escape) {
      dispatch({ type: 'CLEAR_RESULTS' });
      dispatch({ type: 'BLUR_ALL' });
      return;
    }
  }, { isActive: panelFocused });
}

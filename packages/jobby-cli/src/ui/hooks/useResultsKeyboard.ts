import { useRef, useEffect, useCallback } from 'react';
import { useInput } from 'ink';
import type { VirtualListRef, ViewportState } from 'ink-virtual-list';
import { useSearchState, useSelectionState, useAppDispatch } from '../state/context.js';
import { usePanelFocus } from './usePanelFocus.js';
import { useSearchActions } from '../state/searchActions.js';

interface InputKey { downArrow: boolean; upArrow: boolean; home: boolean; end: boolean; pageDown: boolean; pageUp: boolean; return: boolean; escape: boolean }

/** Keyboard handling and deferred-scroll logic for the results list. */
export function useResultsKeyboard(
  listRef: React.RefObject<VirtualListRef | null>,
  viewport: ViewportState,
): void {
  const { totalResults, loadMoreStatus } = useSearchState();
  const { selectedJobIndex } = useSelectionState();
  const dispatch = useAppDispatch();
  const panelFocused = usePanelFocus('results');
  const { loadMore } = useSearchActions();

  const pendingScroll = useRef<{ index: number; alignment: 'top' | 'bottom' } | null>(null);
  const scrollAfterLoadMore = useRef(false);

  // Store values in refs so the stable handler always reads current state
  const selectedJobIndexRef = useRef(selectedJobIndex);
  selectedJobIndexRef.current = selectedJobIndex;
  const totalResultsRef = useRef(totalResults);
  totalResultsRef.current = totalResults;
  const loadMoreStatusRef = useRef(loadMoreStatus);
  loadMoreStatusRef.current = loadMoreStatus;
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

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
    if (loadMoreStatus !== 'idle' && loadMoreStatus !== 'error') { return; }
    const newMaxIndex = totalResults.length - 1;
    if (newMaxIndex <= selectedJobIndex) { return; }
    const target = Math.min(selectedJobIndex + viewport.visibleCount, newMaxIndex);
    pendingScroll.current = { index: target, alignment: 'bottom' };
    dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: target });
  }, [totalResults.length, loadMoreStatus, selectedJobIndex, viewport.visibleCount, dispatch]);

  const stableHandler = useCallback((_input: string, key: InputKey): void => {
    const idx = selectedJobIndexRef.current;
    const results = totalResultsRef.current;
    const lmStatus = loadMoreStatusRef.current;
    const maxIdx = results.length - 1;
    const onLastItem = idx >= maxIdx;
    const vp = viewportRef.current;

    if (key.downArrow) {
      if (onLastItem) {
        loadMoreRef.current();
      } else {
        dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: Math.min(idx + 1, maxIdx) });
      }
      return;
    }

    if (key.upArrow) {
      dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: Math.max(idx - 1, 0) });
      return;
    }

    if (key.home) {
      dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: 0 });
      return;
    }

    if (key.end) {
      if (onLastItem) {
        if (lmStatus === 'idle' || lmStatus === 'error') {
          scrollAfterLoadMore.current = true;
          loadMoreRef.current();
        }
        return;
      }
      dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: maxIdx });
      return;
    }

    if (key.pageDown) {
      if (onLastItem) {
        if (lmStatus === 'idle' || lmStatus === 'error') {
          scrollAfterLoadMore.current = true;
          loadMoreRef.current();
        }
        return;
      }
      const lastVisibleIndex = Math.min(vp.offset + vp.visibleCount - 1, maxIdx);
      if (idx < lastVisibleIndex) {
        dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: lastVisibleIndex });
      } else {
        const target = Math.min(lastVisibleIndex + vp.visibleCount, maxIdx);
        pendingScroll.current = { index: target, alignment: 'bottom' };
        dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: target });
      }
      return;
    }

    if (key.pageUp) {
      const firstVisibleIndex = vp.offset;
      if (idx > firstVisibleIndex) {
        dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: firstVisibleIndex });
      } else {
        const target = Math.max(firstVisibleIndex - vp.visibleCount, 0);
        pendingScroll.current = { index: target, alignment: 'top' };
        dispatchRef.current({ type: 'SET_SELECTED_JOB_INDEX', index: target });
      }
      return;
    }

    if (key.return) {
      if (results.length > 0) {
        dispatchRef.current({ type: 'FOCUS_PANEL', panel: 'details' });
      }
      return;
    }

    if (key.escape) {
      dispatchRef.current({ type: 'CLEAR_RESULTS' });
      dispatchRef.current({ type: 'BLUR_ALL' });
      return;
    }
  }, []);

  useInput(stableHandler, { isActive: panelFocused });
}

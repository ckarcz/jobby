import { useRef, useCallback } from 'react';
import { useInput } from 'ink';
import { useAppState, useAppDispatch } from '../state/context.js';
import { usePanelFocus } from './usePanelFocus.js';
import { useSearch } from './useSearch.js';
import type { FilterDrawerState, FilterDrawerAction } from '../state/filterReducer.js';

interface InputKey { escape: boolean; return: boolean; tab: boolean; shift: boolean; upArrow: boolean; downArrow: boolean }

/** Keyboard handling for the filter drawer panel. */
export function useFilterKeyboard(
  draft: FilterDrawerState,
  draftDispatch: React.Dispatch<FilterDrawerAction>,
): void {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { search } = useSearch();
  const focused = usePanelFocus('filters');

  // Capture all values in refs so the stable handler always reads current state
  // without forcing useInput to re-subscribe.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const draftDispatchRef = useRef(draftDispatch);
  draftDispatchRef.current = draftDispatch;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const searchRef = useRef(search);
  searchRef.current = search;
  const stateRef = useRef(state);
  stateRef.current = state;

  const stableHandler = useCallback((_input: string, key: InputKey): void => {
    const d = draftRef.current;
    const activeSection = d.sections[d.activeSectionIndex];
    const isTextSection = activeSection?.type === 'text';

    if (key.return) {
      dispatchRef.current({ type: 'APPLY_FILTERS', filters: d.selections });
      dispatchRef.current({ type: 'CLOSE_FILTER_DRAWER' });
      searchRef.current(stateRef.current.searchKeyword, d.selections);
      return;
    }

    if (key.tab) {
      if (key.shift) {
        draftDispatchRef.current({ type: 'PREV_SECTION' });
      } else {
        draftDispatchRef.current({ type: 'NEXT_SECTION' });
      }
      return;
    }

    if (key.upArrow && !isTextSection) {
      draftDispatchRef.current({ type: 'MOVE_UP' });
      return;
    }

    if (key.downArrow && !isTextSection) {
      draftDispatchRef.current({ type: 'MOVE_DOWN' });
      return;
    }

    if (_input === ' ') {
      if (activeSection && !isTextSection) {
        draftDispatchRef.current({ type: 'TOGGLE_OPTION' });
      }
      return;
    }
  }, []);

  useInput(stableHandler, { isActive: focused });
}

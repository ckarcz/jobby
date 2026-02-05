import { useRef, useCallback } from 'react';
import { useInput } from 'ink';
import { useAppState, useAppDispatch } from '../state/context.js';
import { usePanelFocus } from './usePanelFocus.js';
import { useSearch } from './useSearch.js';
import type { FilterDrawerState, FilterDrawerAction } from '../state/filterReducer.js';

/** Keyboard handling for the filter drawer panel. */
export function useFilterKeyboard(
  draft: FilterDrawerState,
  draftDispatch: React.Dispatch<FilterDrawerAction>,
): void {
  const appState = useAppState();
  const appDispatch = useAppDispatch();
  const { search } = useSearch();
  const focused = usePanelFocus('filters');

  // Use ref-based handler pattern to prevent useInput from re-subscribing on every render.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handlerRef = useRef((_input: string, _key: { escape: boolean; return: boolean; tab: boolean; shift: boolean; upArrow: boolean; downArrow: boolean }): void => {});
  handlerRef.current = (_input, key): void => {
    const activeSection = draft.sections[draft.activeSectionIndex];
    const isTextSection = activeSection?.type === 'text';

    if (_input === '\\' && !isTextSection) {
      appDispatch({ type: 'CLOSE_FILTER_DRAWER' });
      appDispatch({ type: 'FOCUS_PANEL', panel: 'results' });
      return;
    }

    if (_input === '/' && !isTextSection) {
      appDispatch({ type: 'FOCUS_PANEL', panel: 'search' });
      return;
    }

    if (key.return) {
      appDispatch({ type: 'APPLY_FILTERS', filters: draft.selections });
      search(appState.searchKeyword, draft.selections);
      return;
    }

    if (key.tab) {
      if (key.shift) {
        draftDispatch({ type: 'PREV_SECTION' });
      } else {
        draftDispatch({ type: 'NEXT_SECTION' });
      }
      return;
    }

    if (key.upArrow) {
      draftDispatch({ type: 'MOVE_UP' });
      return;
    }

    if (key.downArrow) {
      draftDispatch({ type: 'MOVE_DOWN' });
      return;
    }

    if (_input === ' ') {
      if (activeSection && !isTextSection) {
        draftDispatch({ type: 'TOGGLE_OPTION' });
      }
      return;
    }
  };

  const stableHandler = useCallback((input: string, key: Parameters<typeof handlerRef.current>[1]) => {
    handlerRef.current(input, key);
  }, []);

  useInput(stableHandler, { isActive: focused });
}

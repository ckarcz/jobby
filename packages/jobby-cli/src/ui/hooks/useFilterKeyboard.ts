import { useRef, useCallback } from 'react';
import { useInput } from 'ink';
import { useSearchState, useAppDispatch } from '../state/context.js';
import { usePanelFocus } from './usePanelFocus.js';
import { useSearch } from './useSearch.js';
import { toggleCheckboxOption, toggleRadioOption } from '../state/filterHelpers.js';
import { SECTION_ORDER, getFilterSection } from '../state/filterTypes.js';
import type { FilterSectionKey } from '../state/filterTypes.js';
import type { FilterDrawerState, FilterDrawerAction } from '../state/filterReducer.js';

interface InputKey { escape: boolean; return: boolean; tab: boolean; shift: boolean; upArrow: boolean; downArrow: boolean }

/** Get the section key at offset from a given index, or undefined if out of bounds. */
function getSectionKeyAt(index: number): FilterSectionKey | undefined {
  return SECTION_ORDER[index];
}

/** Move to the previous section or option within the current section. */
function moveUp(state: FilterDrawerState): FilterDrawerAction | undefined {
  const sectionIdx = SECTION_ORDER.indexOf(state.activeSection);
  const section = getFilterSection(state.activeSection);
  const cursor = state.cursors[state.activeSection];

  // Text sections have no cursor options — always move to previous section
  if (section.type === 'text') {
    const prevKey = getSectionKeyAt(sectionIdx - 1);
    if (prevKey) {
      const prevSection = getFilterSection(prevKey);
      const prevCursor = prevSection.type !== 'text' ? prevSection.options.length - 1 : 0;
      return { type: 'NAVIGATE_FILTERS', activeSection: prevKey, cursor: prevCursor };
    }
    return undefined;
  }

  // At top of section — move to previous section
  if (cursor <= 0) {
    const prevKey = getSectionKeyAt(sectionIdx - 1);
    if (prevKey) {
      const prevSection = getFilterSection(prevKey);
      const prevCursor = prevSection.type !== 'text' ? prevSection.options.length - 1 : 0;
      return { type: 'NAVIGATE_FILTERS', activeSection: prevKey, cursor: prevCursor };
    }
    return undefined;
  }

  // Normal movement within section
  return { type: 'NAVIGATE_FILTERS', activeSection: state.activeSection, cursor: cursor - 1 };
}

/** Move to the next section or option within the current section. */
function moveDown(state: FilterDrawerState): FilterDrawerAction | undefined {
  const sectionIdx = SECTION_ORDER.indexOf(state.activeSection);
  const section = getFilterSection(state.activeSection);
  const cursor = state.cursors[state.activeSection];

  // Text sections have no cursor options — always move to next section
  if (section.type === 'text') {
    const nextKey = getSectionKeyAt(sectionIdx + 1);
    if (nextKey) {
      return { type: 'NAVIGATE_FILTERS', activeSection: nextKey, cursor: 0 };
    }
    return undefined;
  }

  // At bottom of section — move to next section
  if (cursor >= section.options.length - 1) {
    const nextKey = getSectionKeyAt(sectionIdx + 1);
    if (nextKey) {
      return { type: 'NAVIGATE_FILTERS', activeSection: nextKey, cursor: 0 };
    }
    return undefined;
  }

  // Normal movement within section
  return { type: 'NAVIGATE_FILTERS', activeSection: state.activeSection, cursor: cursor + 1 };
}

/** Move to the next section (Tab). */
function nextSection(state: FilterDrawerState): FilterDrawerAction | undefined {
  const sectionIdx = SECTION_ORDER.indexOf(state.activeSection);
  const nextKey = getSectionKeyAt(sectionIdx + 1);
  if (nextKey) {
    return { type: 'NAVIGATE_FILTERS', activeSection: nextKey, cursor: 0 };
  }
  return undefined;
}

/** Move to the previous section (Shift+Tab). */
function prevSection(state: FilterDrawerState): FilterDrawerAction | undefined {
  const sectionIdx = SECTION_ORDER.indexOf(state.activeSection);
  const prevKey = getSectionKeyAt(sectionIdx - 1);
  if (prevKey) {
    return { type: 'NAVIGATE_FILTERS', activeSection: prevKey, cursor: 0 };
  }
  return undefined;
}

/** Toggle the option at the current cursor position. */
function toggleOption(state: FilterDrawerState): FilterDrawerAction | undefined {
  const section = getFilterSection(state.activeSection);
  if (section.type === 'text') {
    return undefined;
  }

  const cursor = state.cursors[state.activeSection];
  const option = section.options[cursor];
  if (!option) {
    return undefined;
  }

  const selections = section.type === 'checkbox'
    ? toggleCheckboxOption(state.selections, section.key, option)
    : toggleRadioOption(state.selections, section.key, option);

  return { type: 'SET_FILTERS', filters: selections };
}

/** Keyboard handling for the filter drawer panel. */
export function useFilterKeyboard(
  draft: FilterDrawerState,
  draftDispatch: React.Dispatch<FilterDrawerAction>,
): void {
  const searchState = useSearchState();
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
  const searchStateRef = useRef(searchState);
  searchStateRef.current = searchState;

  const stableHandler = useCallback((_input: string, key: InputKey): void => {
    const d = draftRef.current;
    const section = getFilterSection(d.activeSection);
    const isTextSection = section.type === 'text';

    if (key.return) {
      dispatchRef.current({ type: 'APPLY_FILTERS', filters: d.selections });
      dispatchRef.current({ type: 'CLOSE_FILTER_DRAWER' });
      searchRef.current(searchStateRef.current.searchKeyword, d.selections);
      return;
    }

    if (key.tab) {
      const action = key.shift ? prevSection(d) : nextSection(d);
      if (action) {
        draftDispatchRef.current(action);
      }
      return;
    }

    if (key.upArrow) {
      const action = moveUp(d);
      if (action) {
        draftDispatchRef.current(action);
      }
      return;
    }

    if (key.downArrow) {
      const action = moveDown(d);
      if (action) {
        draftDispatchRef.current(action);
      }
      return;
    }

    if (_input === ' ') {
      if (!isTextSection) {
        const action = toggleOption(d);
        if (action) {
          draftDispatchRef.current(action);
        }
      }
      return;
    }
  }, []);

  useInput(stableHandler, { isActive: focused });
}

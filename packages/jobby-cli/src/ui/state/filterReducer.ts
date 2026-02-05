import type { SearchFilters, FilterSectionDef, TextFilterKey } from './filterTypes.js';
import { filterSections } from './filterTypes.js';
import { toggleCheckboxOption, toggleRadioOption } from './filterHelpers.js';

/** Local draft state for the FilterDrawer. */
export interface FilterDrawerState {
  sections: FilterSectionDef[];
  activeSectionIndex: number;
  cursorIndexes: number[];
  selections: SearchFilters;
  scrollOffset: number;
}

export type FilterDrawerAction =
  | { type: 'NEXT_SECTION' }
  | { type: 'PREV_SECTION' }
  | { type: 'MOVE_UP' }
  | { type: 'MOVE_DOWN' }
  | { type: 'TOGGLE_OPTION' }
  | { type: 'SET_TEXT'; key: TextFilterKey; value: string }
  | { type: 'SET_SCROLL_OFFSET'; offset: number }
  | { type: 'RESET'; filters: SearchFilters };

/** Create initial draft state from applied filters. */
export function createInitialDraftState(filters: SearchFilters): FilterDrawerState {
  return {
    sections: filterSections,
    activeSectionIndex: 0,
    cursorIndexes: filterSections.map(() => 0),
    selections: { ...filters },
    scrollOffset: 0,
  };
}

/** Get the section at a given index safely. */
function getSection(sections: FilterSectionDef[], index: number): FilterSectionDef {
  const section = sections[index];
  if (!section) {
    throw new Error(`Invalid section index: ${String(index)}`);
  }
  return section;
}

/** Get the cursor index at a given section index safely. */
function getCursorIndex(cursorIndexes: number[], index: number): number {
  const cursor = cursorIndexes[index];
  if (cursor === undefined) {
    throw new Error(`Invalid cursor index: ${String(index)}`);
  }
  return cursor;
}

export function filterDrawerReducer(state: FilterDrawerState, action: FilterDrawerAction): FilterDrawerState {
  switch (action.type) {
    case 'NEXT_SECTION': {
      const next = Math.min(state.activeSectionIndex + 1, state.sections.length - 1);
      return { ...state, activeSectionIndex: next };
    }
    case 'PREV_SECTION': {
      const prev = Math.max(state.activeSectionIndex - 1, 0);
      return { ...state, activeSectionIndex: prev };
    }
    case 'MOVE_UP': {
      const section = getSection(state.sections, state.activeSectionIndex);
      if (section.type === 'text') {
        return state;
      }
      const cursors = [...state.cursorIndexes];
      cursors[state.activeSectionIndex] = Math.max(0, getCursorIndex(cursors, state.activeSectionIndex) - 1);
      return { ...state, cursorIndexes: cursors };
    }
    case 'MOVE_DOWN': {
      const section = getSection(state.sections, state.activeSectionIndex);
      if (section.type === 'text') {
        return state;
      }
      const cursors = [...state.cursorIndexes];
      cursors[state.activeSectionIndex] = Math.min(section.options.length - 1, getCursorIndex(cursors, state.activeSectionIndex) + 1);
      return { ...state, cursorIndexes: cursors };
    }
    case 'TOGGLE_OPTION': {
      const section = getSection(state.sections, state.activeSectionIndex);
      if (section.type === 'text') {
        return state;
      }

      const cursorIndex = getCursorIndex(state.cursorIndexes, state.activeSectionIndex);
      const option = section.options[cursorIndex];
      if (!option) {
        return state;
      }

      const selections = section.type === 'checkbox'
        ? toggleCheckboxOption(state.selections, section.key, option)
        : toggleRadioOption(state.selections, section.key, option);

      return { ...state, selections };
    }
    case 'SET_TEXT': {
      const selections = { ...state.selections, [action.key]: action.value };
      return { ...state, selections };
    }
    case 'SET_SCROLL_OFFSET':
      return { ...state, scrollOffset: action.offset };
    case 'RESET':
      return createInitialDraftState(action.filters);
  }
}

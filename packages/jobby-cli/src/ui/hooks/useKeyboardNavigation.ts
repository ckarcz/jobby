import { useCallback } from 'react';
import { useInput } from 'ink';
import { useLayoutState, useAppDispatch, useIsTextInputActive } from '../state/context.js';
import { useLatest } from './useLatest.js';

/**
 * Global keyboard handler — routes shortcuts based on current panel focus.
 *
 * Printable character shortcuts (`\`, `/`) are only handled when no
 * text input is active. Text input components register themselves via the
 * TextInputActiveContext ref, so this check works regardless of which panel
 * contains the text input — no need to enumerate panels by name.
 *
 * Escape key mapping (all handlers across the TUI):
 *
 * | Context          | File                        | Behaviour                                   |
 * |------------------|-----------------------------|---------------------------------------------|
 * | details panel    | useKeyboardNavigation.ts    | Focus → results panel                       |
 * | filters panel    | useKeyboardNavigation.ts    | Close drawer, focus → results panel          |
 * | results panel    | useResultsKeyboard.ts       | Clear results and blur all panels            |
 * | search bar       | SearchBar.tsx               | Focus → results (if any), otherwise blur all |
 */
export function useKeyboardNavigation(): void {
  const { focusedPanel, filterDrawerOpen } = useLayoutState();
  const dispatch = useAppDispatch();
  const textInputActiveRef = useIsTextInputActive();

  const focusedPanelRef = useLatest(focusedPanel);
  const filterDrawerOpenRef = useLatest(filterDrawerOpen);
  const dispatchRef = useLatest(dispatch);

  const stableHandler = useCallback((input: string, key: { escape: boolean }) => {
    const inTextInput = textInputActiveRef.current > 0;

    if (input === '\\' && !inTextInput) {
      if (filterDrawerOpenRef.current) {
        dispatchRef.current({ type: 'FOCUS_PANEL', panel: 'filters' });
      } else {
        dispatchRef.current({ type: 'OPEN_FILTER_DRAWER' });
        dispatchRef.current({ type: 'FOCUS_PANEL', panel: 'filters' });
      }
      return;
    }

    if (input === '/' && !inTextInput) {
      dispatchRef.current({ type: 'FOCUS_PANEL', panel: 'search' });
      return;
    }

    if (key.escape && focusedPanelRef.current === 'details') {
      dispatchRef.current({ type: 'FOCUS_PANEL', panel: 'results' });
      return;
    }

    if (key.escape && focusedPanelRef.current === 'filters') {
      dispatchRef.current({ type: 'CLOSE_FILTER_DRAWER' });
      dispatchRef.current({ type: 'FOCUS_PANEL', panel: 'results' });
      return;
    }
  }, []);

  // isActive: explicitly enabled. Set to false to suppress global shortcuts
  // (e.g. when a modal/dialog overlay is open).
  useInput(stableHandler, { isActive: true });
}

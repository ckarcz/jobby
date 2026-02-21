import { useInput } from 'ink';
import { useLayoutState, useAppDispatch, useIsTextInputActive } from '../state/context.js';

/**
 * Global keyboard handler — routes shortcuts based on current panel focus.
 *
 * Printable character shortcuts (`\`, `/`) are only handled when no
 * text input is active. Text input components register themselves via the
 * TextInputActiveContext ref, so this check works regardless of which panel
 * contains the text input — no need to enumerate panels by name.
 */
export function useKeyboardNavigation(): void {
  const { focusedPanel, filterDrawerOpen } = useLayoutState();
  const dispatch = useAppDispatch();
  const textInputActiveRef = useIsTextInputActive();

  useInput((input, key) => {
    const inTextInput = textInputActiveRef.current > 0;

    if (input === '\\' && !inTextInput) {
      if (filterDrawerOpen) {
        dispatch({ type: 'FOCUS_PANEL', panel: 'filters' });
      } else {
        dispatch({ type: 'OPEN_FILTER_DRAWER' });
        dispatch({ type: 'FOCUS_PANEL', panel: 'filters' });
      }
      return;
    }

    if (input === '/' && !inTextInput) {
      dispatch({ type: 'FOCUS_PANEL', panel: 'search' });
      return;
    }

    if (key.escape && focusedPanel === 'details') {
      dispatch({ type: 'FOCUS_PANEL', panel: 'results' });
      return;
    }

    if (key.escape && focusedPanel === 'filters') {
      dispatch({ type: 'CLOSE_FILTER_DRAWER' });
      dispatch({ type: 'FOCUS_PANEL', panel: 'results' });
      return;
    }
  });
}

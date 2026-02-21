import { useInput } from 'ink';
import { useLayoutState, useAppDispatch } from '../state/context.js';

/**
 * Global keyboard handler — routes shortcuts based on current panel focus.
 *
 * Printable character shortcuts (`\`, `/`) are only handled when no
 * text input is active (i.e. not in search or filters panel). This prevents
 * shortcut characters from leaking into TextInput components, since Ink
 * fires all useInput handlers with no stopPropagation mechanism.
 *
 * Filter-specific shortcuts (`\`, `/`) are handled locally in FilterDrawer
 * where they only fire when the active section is not a text input.
 */
export function useKeyboardNavigation(): void {
  const { focusedPanel, filterDrawerOpen } = useLayoutState();
  const dispatch = useAppDispatch();

  useInput((input, key) => {
    const inTextInput = focusedPanel === 'search' || focusedPanel === 'filters';

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

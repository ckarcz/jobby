import { useInput } from 'ink';
import { usePanelFocus } from './usePanelFocus.js';

/** Keyboard handling for scrolling the job details panel content. */
export function useDetailsKeyboard(
  scrollOffset: number,
  setScrollOffset: (offset: number) => void,
  maxOffset: number,
): void {
  const panelFocused = usePanelFocus('details');

  useInput((_input, key) => {
    if (key.downArrow) {
      setScrollOffset(Math.min(scrollOffset + 1, maxOffset));
      return;
    }

    if (key.upArrow) {
      setScrollOffset(Math.max(scrollOffset - 1, 0));
      return;
    }

    if (key.pageDown) {
      setScrollOffset(Math.min(scrollOffset + 10, maxOffset));
      return;
    }

    if (key.pageUp) {
      setScrollOffset(Math.max(scrollOffset - 10, 0));
      return;
    }

    if (key.home) {
      setScrollOffset(0);
      return;
    }

    if (key.end) {
      setScrollOffset(maxOffset);
      return;
    }
  }, { isActive: panelFocused });
}

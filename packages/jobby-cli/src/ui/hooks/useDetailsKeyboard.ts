import { useRef, useCallback } from 'react';
import { useInput } from 'ink';
import { usePanelFocus } from './usePanelFocus.js';

/** Keyboard handling for scrolling the job details panel content. */
export function useDetailsKeyboard(
  scrollOffset: number,
  setScrollOffset: (offset: number) => void,
  maxOffset: number,
): void {
  const panelFocused = usePanelFocus('details');

  // Use refs so the useInput callback identity stays stable across renders.
  // This avoids re-registering the input handler on every Spinner tick / scroll change.
  const scrollRef = useRef(scrollOffset);
  scrollRef.current = scrollOffset;
  const maxRef = useRef(maxOffset);
  maxRef.current = maxOffset;

  const handler = useCallback((_input: string, key: { downArrow?: boolean; upArrow?: boolean; pageDown?: boolean; pageUp?: boolean; home?: boolean; end?: boolean }) => {
    if (key.downArrow) {
      setScrollOffset(Math.min(scrollRef.current + 1, maxRef.current));
      return;
    }

    if (key.upArrow) {
      setScrollOffset(Math.max(scrollRef.current - 1, 0));
      return;
    }

    if (key.pageDown) {
      setScrollOffset(Math.min(scrollRef.current + 10, maxRef.current));
      return;
    }

    if (key.pageUp) {
      setScrollOffset(Math.max(scrollRef.current - 10, 0));
      return;
    }

    if (key.home) {
      setScrollOffset(0);
      return;
    }

    if (key.end) {
      setScrollOffset(maxRef.current);
      return;
    }
  }, [setScrollOffset]);

  useInput(handler, { isActive: panelFocused });
}

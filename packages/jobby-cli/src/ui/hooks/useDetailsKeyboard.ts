import { useCallback, type RefObject } from 'react';
import { useInput } from 'ink';
import type { ScrollViewRef } from 'ink-scroll-view';
import { usePanelFocus } from './usePanelFocus.js';

/** Keyboard handling for scrolling the job details panel description. */
export function useDetailsKeyboard(
  scrollRef: RefObject<ScrollViewRef | null>,
): void {
  const panelFocused = usePanelFocus('details');

  const handler = useCallback((_input: string, key: { downArrow?: boolean; upArrow?: boolean; pageDown?: boolean; pageUp?: boolean; home?: boolean; end?: boolean }) => {
    if (key.downArrow) {
      scrollRef.current?.scrollBy(1);
      return;
    }

    if (key.upArrow) {
      scrollRef.current?.scrollBy(-1);
      return;
    }

    if (key.pageDown) {
      scrollRef.current?.scrollBy(10);
      return;
    }

    if (key.pageUp) {
      scrollRef.current?.scrollBy(-10);
      return;
    }

    if (key.home) {
      scrollRef.current?.scrollToTop();
      return;
    }

    if (key.end) {
      scrollRef.current?.scrollToBottom();
      return;
    }
  }, [scrollRef]);

  useInput(handler, { isActive: panelFocused });
}

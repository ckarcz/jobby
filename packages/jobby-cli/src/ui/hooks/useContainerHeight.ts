import { useState, useEffect, useRef, type RefObject } from 'react';
import { measureElement, type DOMElement } from 'ink';
import { useLayoutState } from '../state/context.js';

/**
 * Measures the height of a DOM element and returns it as state.
 *
 * Re-measures when terminal dimensions or filter drawer visibility change,
 * as these are the state changes that affect Ink layout geometry.
 */
export function useContainerHeight(ref: RefObject<DOMElement | null>): number {
  const { terminalWidth, terminalHeight, filterDrawerOpen } = useLayoutState();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const measuredHeightRef = useRef(0);

  useEffect(() => {
    if (ref.current) {
      const { height } = measureElement(ref.current);
      if (height !== measuredHeightRef.current) {
        measuredHeightRef.current = height;
        setMeasuredHeight(height);
      }
    }
  }, [terminalWidth, terminalHeight, filterDrawerOpen]);

  return measuredHeight;
}

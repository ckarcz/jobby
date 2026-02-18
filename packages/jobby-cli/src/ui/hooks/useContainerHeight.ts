import { useState, useEffect, type RefObject } from 'react';
import { measureElement, type DOMElement } from 'ink';

/**
 * Measures the height of a DOM element and returns it as state.
 *
 * The effect runs after every render intentionally: Ink has no resize event
 * API, so terminal resize is detected by re-rendering and re-measuring.
 * The `height !== measuredHeight` guard ensures state is only updated when the
 * height actually changes, preventing unnecessary downstream re-renders.
 */
export function useContainerHeight(ref: RefObject<DOMElement | null>): number {
  const [measuredHeight, setMeasuredHeight] = useState(0);

  // No dependency array — intentional. See JSDoc above.
  useEffect(() => {
    if (ref.current) {
      const { height } = measureElement(ref.current);
      if (height !== measuredHeight) {
        setMeasuredHeight(height);
      }
    }
  });

  return measuredHeight;
}

import { useState, useEffect, type RefObject } from 'react';
import { measureElement, type DOMElement } from 'ink';

/** Measures the height of a DOM element, updating on every render. */
export function useContainerHeight(ref: RefObject<DOMElement | null>): number {
  const [measuredHeight, setMeasuredHeight] = useState(0);

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

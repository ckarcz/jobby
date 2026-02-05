import { useState, useEffect } from 'react';

/** Returns `true` for `durationMs` after `trigger` changes to a truthy value, then reverts to `false`. */
export function useTimedVisibility(trigger: unknown, durationMs: number): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) {
      return;
    }
    setVisible(true);
    const timer = setTimeout((): void => { setVisible(false); }, durationMs);
    return (): void => { clearTimeout(timer); };
  }, [trigger, durationMs]);

  return visible;
}

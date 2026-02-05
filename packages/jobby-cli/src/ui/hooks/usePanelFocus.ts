import type { PanelId } from '../state/types.js';
import { useFocusedPanel } from '../state/context.js';

/** Returns whether the given panel currently owns keyboard focus. */
export function usePanelFocus(panel: PanelId): boolean {
  return useFocusedPanel() === panel;
}

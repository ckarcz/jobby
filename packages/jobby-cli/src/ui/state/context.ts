import { createContext, useContext } from 'react';
import type { AppState, AppAction, PanelId } from './types.js';
import { initialState } from './reducer.js';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue>({
  state: initialState,
  dispatch: () => undefined,
});

export function useAppState(): AppState {
  return useContext(AppContext).state;
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  return useContext(AppContext).dispatch;
}

/** Returns the currently focused panel ID (or null). */
export function useFocusedPanel(): PanelId | null {
  return useContext(AppContext).state.focusedPanel;
}

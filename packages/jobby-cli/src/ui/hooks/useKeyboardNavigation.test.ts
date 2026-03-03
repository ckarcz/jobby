import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Capture the handler registered by useInput
let capturedHandler: (input: string, key: Record<string, boolean>) => void;
vi.mock('ink', () => ({
  useInput: vi.fn((handler: (input: string, key: Record<string, boolean>) => void) => {
    capturedHandler = handler;
  }),
}));

// Shared mutable mock state
const mockLayoutState = { focusedPanel: null as string | null, filterDrawerOpen: false };
const mockSearchState = { searchStatus: 'idle' as string, totalResults: [] as unknown[] };
const mockDispatch = vi.fn();
const mockTextInputRef = { current: 0 };

vi.mock('../state/context.js', () => ({
  useLayoutState: () => mockLayoutState,
  useSearchState: () => mockSearchState,
  useAppDispatch: () => mockDispatch,
  useIsTextInputActive: () => mockTextInputRef,
}));

// Let useLatest work naturally via its real implementation (ref assignment)
// but we need to mock it since it's an ESM import with .js extension
vi.mock('./useLatest.js', () => ({
  useLatest: (value: unknown) => ({ current: value }),
}));

// Import after mocks are set up
const { useKeyboardNavigation } = await import('./useKeyboardNavigation.js');

const noKey = { escape: false, leftArrow: false, rightArrow: false };

function pressLeft(): void {
  capturedHandler('', { ...noKey, leftArrow: true });
}

function pressRight(): void {
  capturedHandler('', { ...noKey, rightArrow: true });
}

describe('useKeyboardNavigation — arrow key navigation', () => {
  beforeEach(() => {
    mockLayoutState.focusedPanel = null;
    mockLayoutState.filterDrawerOpen = false;
    mockSearchState.searchStatus = 'idle';
    mockSearchState.totalResults = [];
    mockTextInputRef.current = 0;
    mockDispatch.mockClear();

    // Re-invoke the hook so it captures fresh refs via useLatest mock
    useKeyboardNavigation();
  });

  // --- Results → Filters (left arrow) ---

  it('left arrow from results opens drawer and focuses filters', () => {
    mockLayoutState.focusedPanel = 'results';
    mockLayoutState.filterDrawerOpen = false;
    // Re-invoke to pick up new state
    useKeyboardNavigation();

    pressLeft();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_FILTER_DRAWER' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'FOCUS_PANEL', panel: 'filters' });
  });

  it('left arrow from results focuses filters when drawer already open', () => {
    mockLayoutState.focusedPanel = 'results';
    mockLayoutState.filterDrawerOpen = true;
    useKeyboardNavigation();

    pressLeft();

    expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'OPEN_FILTER_DRAWER' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'FOCUS_PANEL', panel: 'filters' });
  });

  // --- Filters → Results (right arrow) ---

  it('right arrow from filters closes drawer and focuses results', () => {
    mockLayoutState.focusedPanel = 'filters';
    useKeyboardNavigation();

    pressRight();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_FILTER_DRAWER' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'FOCUS_PANEL', panel: 'results' });
  });

  // --- Results → Details (right arrow) ---

  it('right arrow from results focuses details when details panel is visible', () => {
    mockLayoutState.focusedPanel = 'results';
    mockSearchState.searchStatus = 'results';
    mockSearchState.totalResults = [{ id: '1' }];
    useKeyboardNavigation();

    pressRight();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'FOCUS_PANEL', panel: 'details' });
  });

  it('right arrow from results does nothing when no results', () => {
    mockLayoutState.focusedPanel = 'results';
    mockSearchState.searchStatus = 'idle';
    mockSearchState.totalResults = [];
    useKeyboardNavigation();

    pressRight();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  // --- Details → Results (left arrow) ---

  it('left arrow from details focuses results', () => {
    mockLayoutState.focusedPanel = 'details';
    useKeyboardNavigation();

    pressLeft();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'FOCUS_PANEL', panel: 'results' });
  });

  // --- Text input gating ---

  it('left arrow is suppressed when text input is active', () => {
    mockLayoutState.focusedPanel = 'results';
    mockTextInputRef.current = 1;
    useKeyboardNavigation();

    pressLeft();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('right arrow is suppressed when text input is active', () => {
    mockLayoutState.focusedPanel = 'filters';
    mockTextInputRef.current = 1;
    useKeyboardNavigation();

    pressRight();

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

# TUI Application Audit: React & Ink Best Practices Review

> **Date:** 2026-02-20 (updated 2026-02-21, round 2)
> **Scope:** `packages/jobby-cli/src/ui/` — the interactive TUI (Ink/React terminal UI)
> **Methodology:** Cross-referenced against React documentation, Ink library source code & documentation, `@inkjs/ui` API, and community Ink component libraries.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What the Codebase Does Well](#2-what-the-codebase-does-well)
3. [Critical Issues](#3-critical-issues)
4. [Performance Issues](#4-performance-issues)
5. [React Anti-Patterns](#5-react-anti-patterns)
6. [Ink-Specific Issues](#6-ink-specific-issues)
7. [State Management Concerns](#7-state-management-concerns)
8. [Input Handling Issues](#8-input-handling-issues)
9. [Dead Code](#9-dead-code)
10. [Minor Issues & Recommendations](#10-minor-issues--recommendations)
11. [Summary Table](#11-summary-table)

---

## 1. Executive Summary

The jobby-cli TUI is a well-structured application that follows many best practices. It uses a Redux-style `useReducer` + Context architecture, proper abort controller patterns for cancellation, and a clean component hierarchy. However, there are several areas where React and Ink best practices are not fully followed, leading to potential performance degradation, unnecessary re-renders, and missed optimization opportunities.

**Key findings:**
- ~~**1 critical issue** — `JobDetailsPanel` renders all off-screen content (no virtualization)~~ **Fixed** — proper windowing implemented
- ~~**4 performance issues** — context structure causing unnecessary re-renders, missing memoization, measurement on every render, unmount/remount pattern~~ **All fixed** — context split into 5 (Layout, Search, Selection, JobDetails, Dispatch), `useContainerHeight` dependency array added, FilterDrawer uses `display="none"`, leaf components memoized
- ~~**4 job-details performance issues** — Spinner in allLines driving 80ms re-renders, NavigationContext coupling, stale closure in useDetailsKeyboard, unnecessary CLEAR_JOB_DETAILS dispatches~~ **All fixed** — Spinner moved outside scrollable content, Selection/JobDetails contexts split, ref-based stable handler, conditional dispatch
- **3 React anti-patterns** — stale ref, missing `isActive` on `useInput`, derived state opportunities
- **3 Ink-specific issues** — no use of `<Static>`, keyboard event propagation, custom vs @inkjs/ui filter inputs (resolved — kept custom with dedicated memoized components)
- **2 dead code items** — `useSlideAnimation` hook, `Modal` component
- **Several minor improvements** — responsive filter width, key prop reset pattern, composition optimizations

---

## 2. What the Codebase Does Well

Before listing issues, it's important to acknowledge the strong patterns already in place:

### 2.1 Redux-Style Architecture with `useReducer` + Split Contexts
The `App` → providers → `AppInner` split is textbook. State is managed by a single `useReducer` but exposed through five split contexts (`LayoutContext`, `SearchContext`, `SelectionContext`, `JobDetailsContext`, `DispatchContext`) via `useMemo` slicing. This ensures components only re-render when their specific state slice changes — in particular, selection changes (arrow keys) don't re-render job details consumers, and job details loading/Spinner ticks don't re-render the results list. Hooks that consume context are correctly placed *inside* the providers (in `AppInner`), avoiding the classic mistake of calling context hooks at the provider level.

### 2.2 Two-Level Filter State (Draft Pattern)
The filter drawer maintains a local `useReducer` (draft state) that is only committed to global state on Enter. This "controlled draft" pattern prevents intermediate edits from triggering searches and is exactly the right approach for form-like UIs. The reducer is intentionally minimal (3 actions: `NAVIGATE_FILTERS`, `SET_FILTERS`, `RESET_FILTERS`) — navigation computation lives in the keyboard hook, and the reducer just applies the result.

### 2.3 AbortController for Request Cancellation
Both `useSearch` and `useJobDetails` maintain `abortRef` for in-flight request cancellation, and check `controller.signal.aborted` before dispatching to avoid stale responses. This is a best practice.

### 2.4 Ref-Based Handler Pattern in Keyboard Hooks
```typescript
const draftRef = useRef(draft);
draftRef.current = draft;
const stableHandler = useCallback((_input, key) => {
  const d = draftRef.current;
  // compute action from current state, dispatch result
}, []);
useInput(stableHandler, { isActive: focused });
```
This avoids stale closures while maintaining a stable `useInput` registration. This is the "latest ref" pattern — a sophisticated and correct approach. Used consistently across `useFilterKeyboard`, `useDetailsKeyboard`, `SearchBar`, and other keyboard hooks.

### 2.5 Exhaustive `never` Check
`ContentArea.tsx` uses the TypeScript `never` trick in the default case for compile-time exhaustiveness checking on `searchStatus`. This catches missing cases at build time.

### 2.6 Incremental Rendering Enabled
The TUI launch in `commands/ui.ts` passes `incrementalRendering: true` to Ink's `render()`. This is critical for performance — Ink normally erases and rewrites all lines on every update. Incremental rendering compares line-by-line and only writes changed lines, dramatically reducing flickering.

### 2.7 Debounced Job Details Fetching
`useJobDetails` implements a 300ms debounce before fetching details when the selected job changes. This prevents rapid-fire API calls when the user scrolls quickly through the results list.

### 2.8 Virtual List for Search Results
`SearchResults` uses `ink-virtual-list` for the job listing, which only renders visible items. This is critical for terminal performance.

---

## 3. Critical Issues

### 3.1 ~~`JobDetailsPanel` Renders ALL Lines Below Scroll Offset~~ **FIXED**

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Severity:** Critical (Performance) — **Resolved**

Proper windowing has been implemented. The visible lines are now sliced to only the viewport range:

```typescript
const visibleCount = Math.max(1, containerHeight);
const visibleLines = allLines.slice(scrollOffset, scrollOffset + visibleCount);
```

React now only manages the lines actually visible in the viewport, eliminating the performance cost of creating and reconciling off-screen elements.

---

## 4. Performance Issues

### 4.1 ~~Single Context Causes Unnecessary Re-Renders for All Consumers~~ **FIXED**

**File:** `src/ui/state/context.ts`
**Severity:** Medium — **Resolved**

The single `AppContext` has been split into five focused contexts:

```typescript
const LayoutContext = createContext<LayoutState>(...);      // terminal size, focusedPanel, filterDrawerOpen
const SearchContext = createContext<SearchState>(...);      // keyword, status, results, pagination, filters
const SelectionContext = createContext<SelectionState>(...); // selectedJobIndex
const JobDetailsContext = createContext<JobDetailsState>(...); // jobDetails, jobDetailsStatus, jobDetailsError
const DispatchContext = createContext<Dispatch<AppAction>>(...); // stable dispatch
```

`App.tsx` derives each context value via `useMemo`, so context objects only change when their specific fields change. All consumers use the specific hooks: `useLayoutState()`, `useSearchState()`, `useSelectionState()`, `useJobDetailsState()`, `useAppDispatch()`.

The Selection/JobDetails split is particularly important: arrow-key navigation (which changes `selectedJobIndex`) no longer re-renders the details panel's content lines, and job details status changes (loading/error/loaded) no longer re-render the results list.

### 4.2 ~~`useContainerHeight` Runs Measurement on Every Render~~ **FIXED**

**File:** `src/ui/hooks/useContainerHeight.ts`
**Severity:** Low-Medium — **Resolved**

The hook now consumes `useLayoutState()` and only re-measures when layout-affecting state changes:

```typescript
const { terminalWidth, terminalHeight, filterDrawerOpen } = useLayoutState();

useEffect(() => {
  if (ref.current) {
    const { height } = measureElement(ref.current);
    if (height !== measuredHeight) {
      setMeasuredHeight(height);
    }
  }
}, [terminalWidth, terminalHeight, filterDrawerOpen, measuredHeight, ref]);
```

This eliminates unnecessary Yoga layout traversals on every render while still catching all layout-affecting changes (terminal resize and filter drawer toggle).

### 4.3 ~~FilterDrawer Unmounts/Remounts on Toggle~~ **FIXED**

**File:** `src/ui/components/Layout.tsx`
**Severity:** Low-Medium — **Resolved**

The FilterDrawer now uses `display="none"` instead of conditional rendering:

```tsx
<FocusableBox panel="filters" display={filterDrawerOpen ? 'flex' : 'none'} ...>
  <FilterDrawer />
</FocusableBox>
```

The component stays mounted but hidden when the drawer is closed. Ink's `display="none"` is handled by Yoga and prevents the element from participating in layout calculation. This eliminates the cost of destroying and recreating the entire component subtree on every toggle.

### 4.4 ~~Missing `React.memo` on Leaf Components~~ **FIXED**

**Severity:** Low-Medium — **Resolved**

All leaf components are now wrapped in `React.memo`:

**All memoized components:**
- `FilterSection` — layout wrapper for filter sections
- `FilterCheckboxInput` — checkbox option list
- `FilterRadioInput` — radio option list
- `FilterTextInput` — text input field
- `JobCard` — rendered inside VirtualList
- `ResultsHeader` — viewport info display
- `ResultsFooter` — load-more status display
- `StatusBar` — context-sensitive keyboard hints
- `WelcomeScreen` — static initial screen
- `SearchingSpinner` — search progress indicator
- `SearchError` — error display with retry hint
- `NoSearchResults` — empty results display

### 4.5 ~~Spinner Inside `allLines` Drives 80ms Re-Render Cycle~~ **FIXED**

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Severity:** Medium — **Resolved**

The `<Spinner>` from `@inkjs/ui` uses an internal `setInterval` (~80ms) to animate. When embedded inside the `allLines` useMemo array, every tick invalidated the memo and caused the entire panel to rebuild its content line array and re-reconcile all visible elements.

The fix moves the Spinner outside the scrollable content. `allLines` now contains only static content (summary, metadata, description), while the Spinner is rendered below the visible lines as a separate element:

```tsx
{visibleLines.map((line) => (
  <Box key={line.key}>{line.element}</Box>
))}
{spinnerVisible && <Spinner label="Loading details..." />}
```

The `allLines` memo is no longer invalidated by the Spinner's animation ticks.

### 4.6 ~~`NavigationContext` Coupled Selection and JobDetails~~ **FIXED**

**File:** `src/ui/state/context.ts`
**Severity:** Medium — **Resolved**

The original `NavigationContext` bundled `selectedJobIndex` with `jobDetails`/`jobDetailsStatus`/`jobDetailsError`. This meant:
- Arrow-key navigation (changing `selectedJobIndex`) re-rendered `JobDetailsPanel`'s content even though the details hadn't changed yet
- Job details loading/completion re-rendered `SearchResults` even though selection hadn't changed

The fix splits `NavigationContext` into `SelectionContext` (just `selectedJobIndex`) and `JobDetailsContext` (details, status, error). Components now subscribe to only the slice they need.

### 4.7 ~~`useDetailsKeyboard` Stale Closure Pattern~~ **FIXED**

**File:** `src/ui/hooks/useDetailsKeyboard.ts`
**Severity:** Low-Medium — **Resolved**

The keyboard handler captured `scrollOffset` and `maxOffset` as direct closure values. Every time these changed (on every scroll or Spinner tick), Ink's `useInput` re-registered the handler.

The fix uses the "latest ref" pattern: values are stored in refs that are updated on every render, while the `useCallback` handler reads from refs. This keeps the handler identity stable, so `useInput` never re-registers:

```typescript
const scrollRef = useRef(scrollOffset);
scrollRef.current = scrollOffset;
const maxRef = useRef(maxOffset);
maxRef.current = maxOffset;

const handler = useCallback((_input, key) => {
  if (key.downArrow) {
    setScrollOffset(Math.min(scrollRef.current + 1, maxRef.current));
  }
  // ...
}, [setScrollOffset]);
```

### 4.8 ~~Unconditional `CLEAR_JOB_DETAILS` Dispatch~~ **FIXED**

**File:** `src/ui/hooks/useJobDetails.ts`
**Severity:** Low — **Resolved**

`useJobDetails` dispatched `CLEAR_JOB_DETAILS` on every selection change, even when the job details state was already idle. This caused an unnecessary re-render of all `JobDetailsContext` consumers.

The fix tracks `jobDetailsStatus` in a ref and only dispatches the clear action when the status isn't already `'idle'`:

```typescript
const statusRef = useRef(jobDetailsStatus);
statusRef.current = jobDetailsStatus;

// Inside useEffect:
if (statusRef.current !== 'idle') {
  dispatch({ type: 'CLEAR_JOB_DETAILS' });
}
```

---

## 5. React Anti-Patterns

### 5.1 ~~Stale `draftRef` in SearchBar~~ **FIXED**

**File:** `src/ui/components/SearchBar.tsx`
**Severity:** Low — **Resolved**

The `draftRef` is now synced with the global `searchKeyword` via `useEffect`:

```typescript
const draftRef = useRef(searchKeyword);

// Keep ref in sync when global state changes (e.g. CLEAR_RESULTS resets keyword)
useEffect(() => {
  draftRef.current = searchKeyword;
}, [searchKeyword]);
```

This ensures that external state changes (like `CLEAR_RESULTS` resetting the keyword to `''`) are reflected in the draft, preventing the `TextInput` from showing stale values.

### 5.2 `selectedJob` Derived in Component Instead of During Render

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Severity:** Low

```typescript
const selectedJob = totalResults[selectedJobIndex] ?? null;
```

This is fine as-is (it's computed during render, not stored in state), but the `selectedJobId` derivation in `useJobDetails` follows the same pattern:

```typescript
const selectedJob = totalResults[selectedJobIndex];
const selectedJobId = selectedJob?.id ?? null;
```

This is correct — derived values are computed during render rather than stored in state. No action needed, just noting this as a positive pattern to maintain.

### 5.3 Module-Level `Marked` Instance

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Severity:** Informational

```typescript
const md = new Marked(markedTerminal());
```

This creates the Marked instance at module import time, which is efficient (avoids re-creation on every render). This is actually a **best practice** for React — initializing external code at module level rather than in `useEffect` or `useMemo`. No change needed.

---

## 6. Ink-Specific Issues

### 6.1 No Use of `<Static>` Component

**Severity:** Low (not applicable in current UX, but worth considering)

Ink's `<Static>` component renders items permanently above the dynamic UI area. Once rendered, static items are never re-processed during subsequent renders — making it nearly 2x more performant than re-rendering lists.

The current TUI doesn't have an obvious use case for `<Static>` since all content is interactive. However, if features like search history or activity logs are added, they should use `<Static>`:

```typescript
// Hypothetical search history feature
<Static items={completedSearches}>
  {search => (
    <Box key={search.id}>
      <Text dimColor>Searched: "{search.keyword}" — {search.resultCount} results</Text>
    </Box>
  )}
</Static>
```

### 6.2 Ink Has No `stopPropagation` for `useInput`

**File:** `src/ui/hooks/useKeyboardNavigation.ts`
**Severity:** Medium (correctly documented in code, but could be improved)

The codebase correctly notes that Ink has no `stopPropagation` mechanism — all `useInput` handlers receive every keypress. The current mitigation uses an `inTextInput` check:

```typescript
const inTextInput = focusedPanel === 'search' || focusedPanel === 'filters';
```

This prevents `/` and `\` from leaking into TextInput components. However, this is a fragile pattern because:

1. Adding a new text input requires updating the `inTextInput` check
2. The check is a heuristic — it doesn't know if a TextInput is actually *mounted and active*

**Recommended improvement:** Instead of checking panel identity, use a shared ref or context value that TextInput components set when they mount:

```typescript
// In a shared context or ref
const textInputActiveRef = useRef(false);

// In TextInput wrapper
useEffect(() => {
  textInputActiveRef.current = true;
  return () => { textInputActiveRef.current = false; };
}, []);

// In useKeyboardNavigation
if (textInputActiveRef.current) return; // Skip all shortcuts
```

Or more simply, have each panel that contains text inputs set an `isTextInputActive` flag in the global state.

### 6.3 `useInput` Missing `isActive` on Global Handler

**File:** `src/ui/hooks/useKeyboardNavigation.ts`
**Severity:** Low

```typescript
useInput((input, key) => {
  // Always active — no isActive option
  ...
});
```

Ink's documentation strongly recommends using the `isActive` option when multiple `useInput` hooks coexist. While this global handler intentionally needs to run always (it handles cross-panel navigation), the other keyboard hooks correctly use conditional guards:

- `useResultsKeyboard`: guarded by `panelFocused`
- `useDetailsKeyboard`: guarded by `panelFocused`
- `useFilterKeyboard`: guarded by `{ isActive: focused }`

The global handler in `useKeyboardNavigation` is the only one that runs unconditionally. This is acceptable for a global shortcut handler, but the `inTextInput` guard should be robust (see 6.2 above).

### 6.4 Custom Filter Input Components vs `@inkjs/ui`

**Severity:** Low (style preference — decision made to keep custom)

The codebase uses `@inkjs/ui`'s `TextInput`, `Spinner`, and `Alert` components, which is good. The filter drawer uses custom `FilterCheckboxInput`, `FilterRadioInput`, and `FilterTextInput` components (each in their own file, memoized) instead of `@inkjs/ui`'s `Select`/`MultiSelect`. This is an intentional trade-off: the custom components provide custom glyphs (`▸`, `[✓]`, `(◉)`) and consistent visual styling, while keyboard navigation is centralized in `useFilterKeyboard` rather than delegated to individual components.

**Current architecture:** `FilterSection` is a pure layout wrapper (title + focus styling + children), and the three input components are self-contained presentational components composed inside it. The keyboard hook computes navigation targets and dispatches to the simplified reducer.

---

## 7. State Management Concerns

### 7.1 AppState Has 21 Fields in a Single Object

**File:** `src/ui/state/types.ts`
**Severity:** Medium (maintainability)

The `AppState` interface has grown to 21 fields covering terminal dimensions, panel focus, search state, pagination, job details, filters, and UI toggles. While `useReducer` handles this correctly, a single flat state object makes it harder to:

1. Understand which actions affect which fields
2. Split the context for performance (see 4.1)
3. Test individual state slices independently

**Recommended improvement:** Group related fields into sub-objects:

```typescript
interface AppState {
  terminal: {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
  };
  ui: {
    focusedPanel: PanelId | null;
    filterDrawerOpen: boolean;
  };
  search: {
    keyword: string;
    status: SearchStatus;
    results: Job[];
    totalResults: Job[];
    pagination: PaginationInfo | undefined;
    metadata: SearchMetadata | undefined;
    query: JobSearchParams | undefined;
    error: string | undefined;
    filters: SearchFilters;
  };
  navigation: {
    selectedJobIndex: number;
  };
  loadMore: {
    status: LoadMoreStatus;
    error: string | undefined;
  };
  jobDetails: {
    data: JobDetails | null;
    status: JobDetailsStatus;
    error: string | undefined;
  };
}
```

This makes the state shape self-documenting and makes it easier to split into separate contexts later if needed.

### 7.2 ~~Dispatch Identity Stability~~ **FIXED**

**File:** `src/ui/App.tsx`
**Severity:** Informational — **Resolved**

The `dispatch` function now has its own dedicated `DispatchContext`, separate from all state contexts. Since `dispatch` from `useReducer` has a stable identity, the `DispatchContext` value never changes, ensuring components that only need `dispatch` (like event handlers) never re-render due to state changes.

---

## 8. Input Handling Issues

### 8.1 Keyboard Shortcut Conflicts with TextInput

**File:** `src/ui/hooks/useKeyboardNavigation.ts`
**Severity:** Low (mitigated but fragile)

The `\` (backslash) and `/` (slash) shortcuts conflict with text input. The current mitigation:

```typescript
const inTextInput = focusedPanel === 'search' || focusedPanel === 'filters';

if (!inTextInput) {
  if (input === '\\') { /* open filters */ }
  if (input === '/') { /* focus search */ }
}
```

This works today but has two fragility concerns:

1. **Filter drawer text inputs are only active for text-type filter sections.** When the cursor is on a checkbox/radio section within the filters panel, the user might expect `\` and `/` to work, but they're suppressed because `focusedPanel === 'filters'`.

2. **New panels with text inputs require updating this check.** If a new panel is added that contains text inputs, forgetting to add it to the `inTextInput` check will cause character leakage.

**Recommended improvement:** Track text input focus state directly rather than inferring it from panel identity:

```typescript
// Add to AppState
textInputFocused: boolean;

// In SearchBar, when TextInput mounts:
dispatch({ type: 'SET_TEXT_INPUT_FOCUSED', value: true });
// On unmount or blur:
dispatch({ type: 'SET_TEXT_INPUT_FOCUSED', value: false });

// In useKeyboardNavigation:
const { textInputFocused } = useAppState();
if (!textInputFocused) {
  // Handle shortcuts
}
```

### 8.2 Escape Key Handling Across Panels

**Severity:** Informational

`Escape` is handled in three places:
1. `useKeyboardNavigation` — when details focused → focus results; when filters focused → close drawer + focus results
2. `SearchBar` — when focused → navigate back or blur
3. `useResultsKeyboard` — clears results + blurs all

This distributed handling is correct but could benefit from a single, documented key mapping table (perhaps in a comment or constants file) to prevent future conflicts.

---

## 9. Dead Code

### 9.1 `useSlideAnimation` Hook

**File:** `src/ui/hooks/useSlideAnimation.ts`
**Severity:** Low (cleanup)

This hook implements a frame-by-frame easing animation for a width value, with multiple easing functions (`linear`, `easeOutCubic`, `easeInCubic`, `easeInOutCubic`, `easeOutBounce`). It is fully implemented but **not used anywhere** in the codebase.

The related constants (`SLIDE_ANIMATION_FRAMES`, `SLIDE_ANIMATION_INTERVAL_MS`) in `constants.ts` are also unused.

**Recommendation:** Remove the hook and its unused constants. If slide animations are desired in the future, it can be re-implemented or retrieved from version control.

### 9.2 `Modal` Component

**File:** `src/ui/components/Modal.tsx`
**Severity:** Low (cleanup)

A fully implemented modal overlay component using Ink's `position="absolute"`. It is never imported or rendered by any other component.

**Recommendation:** Remove the component. If modal functionality is needed later, it can be re-implemented or retrieved from version control.

---

## 10. Minor Issues & Recommendations

### 10.1 Fixed Filter Drawer Width

**File:** `src/ui/constants.ts`

```typescript
export const FILTER_DRAWER_WIDTH = 22;
```

This is a fixed column width regardless of terminal size. On very narrow terminals (< 80 columns), the filter drawer consumes a significant portion of the available width. On very wide terminals (> 200 columns), it looks disproportionately small.

**Recommendation:** Consider a responsive approach:
```typescript
const filterDrawerWidth = Math.max(20, Math.min(30, Math.floor(terminalWidth * 0.2)));
```

### 10.2 Consider `key` Prop Reset Pattern for `JobDetailsPanel`

**File:** `src/ui/components/JobDetailsPanel.tsx`

The component manually resets `scrollOffset` to 0 when `selectedJob?.id` changes via `useEffect`:

```typescript
useEffect(() => {
  setScrollOffset(0);
}, [selectedJob?.id]);
```

React's `key` prop can handle this more idiomatically:

```typescript
// In Layout.tsx or wherever JobDetailsPanel is rendered:
<JobDetailsPanel key={selectedJobId} />
```

When the `key` changes, React unmounts the old instance and mounts a new one — automatically resetting all internal state (including `scrollOffset`). This eliminates the `useEffect` and is the React-recommended pattern for "resetting state when a prop changes."

**Trade-off:** This unmounts and remounts the component, which has a small cost. For `JobDetailsPanel`, the cost is negligible since the markdown parsing is the expensive part, not the React mount.

### 10.3 `VIRTUAL_LIST_RESERVED_LINES` May Need Dynamic Calculation

**File:** `src/ui/constants.ts`

```typescript
export const VIRTUAL_LIST_RESERVED_LINES = 5;
```

This reserves 5 lines for header/footer content in the virtual list. If the header or footer height changes (e.g., longer error messages, multi-line status), the reserved count won't match, potentially causing content to be clipped or overflow.

**Recommendation:** Calculate this dynamically based on actual header/footer measurement, or document the exact breakdown (e.g., "1 header + 1 border top + 1 footer + 1 border bottom + 1 margin = 5").

### 10.4 ~~Markdown Processing on Every Render~~ **FIXED**

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Status:** Resolved

The markdown-to-ANSI conversion is now wrapped in `useMemo` with `description` as the dependency:

```typescript
const descriptionLines = useMemo(() => {
  if (!description) return [];
  const rendered = renderMarkdown(description);
  return rendered.split('\n');
}, [description]);
```

### 10.5 ~~`buildSummaryLines` and `buildDetailsMetadataLines` Called Every Render~~ **FIXED**

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Status:** Resolved

Summary and metadata lines are now independently memoized:

```typescript
const summaryLines = useMemo(() => {
  return selectedJob ? buildSummaryLines(selectedJob) : [];
}, [selectedJob]);

const metadataLines = useMemo(() => {
  return jobDetailsStatus === 'loaded' && jobDetails ? buildDetailsMetadataLines(jobDetails) : [];
}, [jobDetailsStatus, jobDetails]);
```

The `allLines` useMemo composes these memoized arrays, so summary lines don't rebuild when details change and vice versa.

### 10.6 Process Signal Handlers Don't Clean Up

**File:** `src/main.ts`

```typescript
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));
```

These listeners are registered but never removed. In production CLI usage this is fine (the process exits), but in tests it could cause listener leaks if `main()` is called multiple times.

**Recommendation:** Return cleanup functions or use `once` instead of `on`:
```typescript
process.once('SIGINT', () => process.exit(130));
process.once('SIGTERM', () => process.exit(143));
```

---

## 11. Summary Table

| # | Issue | Severity | Category | Status |
|---|---|---|---|---|
| 3.1 | JobDetailsPanel renders all off-screen lines | Critical | Performance | **Fixed** |
| 4.1 | Single context causes unnecessary re-renders | Medium | Performance | **Fixed** |
| 4.2 | useContainerHeight measures on every render | Low-Medium | Performance | **Fixed** |
| 4.3 | FilterDrawer unmounts/remounts on toggle | Low-Medium | Performance | **Fixed** |
| 4.4 | Missing React.memo on leaf components | Low-Medium | Performance | **Fixed** |
| 4.5 | Spinner in allLines drives 80ms re-render cycle | Medium | Performance | **Fixed** |
| 4.6 | NavigationContext coupled Selection and JobDetails | Medium | Performance | **Fixed** |
| 4.7 | useDetailsKeyboard stale closure re-registration | Low-Medium | Performance | **Fixed** |
| 4.8 | Unconditional CLEAR_JOB_DETAILS dispatch | Low | Performance | **Fixed** |
| 7.2 | Dispatch bundled with state context | Informational | Performance | **Fixed** |
| 10.4 | Markdown re-parsed on every render | Low | Performance | **Fixed** |
| 10.5 | Metadata lines rebuilt on every render | Low | Performance | **Fixed** |
| 5.1 | Stale draftRef in SearchBar | Low | Anti-pattern | **Fixed** |
| 6.2 | No stopPropagation — fragile text input check | Medium | Ink-specific | Open |
| 6.4 | Custom filter input components vs @inkjs/ui (kept custom) | Low | Ink-specific | Done |
| 7.1 | 21-field flat state object | Medium | Maintainability | Open |
| 8.1 | Keyboard shortcut conflicts with TextInput | Low | Input | Open |
| 9.1 | useSlideAnimation dead code | Low | Cleanup | Open |
| 9.2 | Modal dead code | Low | Cleanup | Open |
| 10.1 | Fixed filter drawer width | Low | UX | Open |
| 10.2 | Manual scroll reset vs key prop pattern | Low | React pattern | Open |
| 10.6 | Process signal handlers don't clean up | Low | Robustness | Open |

### Priority Recommendations

**Completed (Round 1):**
1. ~~Fix `JobDetailsPanel` windowing (3.1)~~ — **Done**
2. ~~Split AppContext by update frequency (4.1)~~ — **Done** (5-context split with useMemo slicing)
3. ~~Add dependency array to `useContainerHeight` (4.2)~~ — **Done**
4. ~~Use `display="none"` for FilterDrawer instead of unmounting (4.3)~~ — **Done**
5. ~~Add `React.memo` to all leaf components (4.4)~~ — **Done**
6. ~~Separate dispatch into its own context (7.2)~~ — **Done**

**Completed (Round 2 — Job Details Performance):**
7. ~~Move Spinner outside allLines (4.5)~~ — **Done** (eliminates 80ms re-render tick from memo)
8. ~~Split Selection/JobDetails contexts (4.6)~~ — **Done** (arrow keys don't re-render details, details don't re-render results)
9. ~~Convert useDetailsKeyboard to ref-based stable handler (4.7)~~ — **Done** (stops handler re-registration)
10. ~~Conditional CLEAR_JOB_DETAILS dispatch (4.8)~~ — **Done** (skips no-op re-render when already idle)
11. ~~Memoize markdown parsing (10.4)~~ — **Done**
12. ~~Memoize summary/metadata lines independently (10.5)~~ — **Done**

**Completed (Round 3 — Anti-Patterns):**
13. ~~Sync `draftRef` in SearchBar (5.1)~~ — **Done**

**Remaining quick wins:**
1. Remove dead code (9.1, 9.2)

**Remaining medium-term improvements:**
3. Make text input focus tracking explicit (6.2, 8.1)

**Remaining larger refactors:**
4. Restructure AppState into sub-objects (7.1)

---

*Report generated from analysis of React documentation, Ink library source code (v5.x), @inkjs/ui component library, and community Ink component ecosystem.*

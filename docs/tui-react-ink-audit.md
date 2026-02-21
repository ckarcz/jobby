# TUI Application Audit: React & Ink Best Practices Review

> **Date:** 2026-02-20
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
- **1 critical issue** — `JobDetailsPanel` renders all off-screen content (no virtualization)
- **4 performance issues** — context structure causing unnecessary re-renders, missing memoization, measurement on every render, unmount/remount pattern
- **3 React anti-patterns** — stale ref, missing `isActive` on `useInput`, derived state opportunities
- **3 Ink-specific issues** — no use of `<Static>`, keyboard event propagation, custom vs @inkjs/ui filter inputs (resolved — kept custom with dedicated memoized components)
- **2 dead code items** — `useSlideAnimation` hook, `Modal` component
- **Several minor improvements** — responsive filter width, key prop reset pattern, composition optimizations

---

## 2. What the Codebase Does Well

Before listing issues, it's important to acknowledge the strong patterns already in place:

### 2.1 Redux-Style Architecture with `useReducer` + Context
The `App` → `AppContext.Provider` → `AppInner` split is textbook. Hooks that consume context are correctly placed *inside* the provider (in `AppInner`), avoiding the classic mistake of calling context hooks at the provider level.

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
This avoids stale closures while maintaining a stable `useInput` registration. This is the "latest ref" pattern — a sophisticated and correct approach. Used consistently across `useFilterKeyboard`, `SearchBar`, and other keyboard hooks.

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

### 3.1 `JobDetailsPanel` Renders ALL Lines Below Scroll Offset

**File:** `src/ui/components/JobDetailsPanel.tsx`
**Severity:** Critical (Performance)

The job details panel builds a flat array of `ContentLine[]` from metadata and the markdown description, then renders:

```typescript
const visibleLines = allLines.slice(scrollOffset);
```

This passes *every line from `scrollOffset` to the end* to React, relying on the containing `<Box overflow="hidden">` for visual clipping. While the user only sees the lines that fit in the viewport, **React still creates and reconciles elements for every off-screen line**.

For a typical job description with 50-200+ lines of content, this means React is creating, diffing, and managing 150+ elements that are never visible. In Ink's rendering pipeline, every element is traversed during the full-tree render, converted to the 2D character buffer, and then clipped — wasting CPU cycles.

**Impact:** Visible lag when scrolling long job descriptions. Ink performs a full-tree traversal on every state change, so extra elements directly increase render time.

**Recommended fix:** Implement proper windowing:

```typescript
// BEFORE (current)
const visibleLines = allLines.slice(scrollOffset);

// AFTER (windowed)
const visibleCount = containerHeight || 20;
const visibleLines = allLines.slice(scrollOffset, scrollOffset + visibleCount);
```

This limits React to only managing the lines actually visible in the viewport. Since `containerHeight` is already being measured via `useContainerHeight`, the value is readily available.

---

## 4. Performance Issues

### 4.1 Single Context Causes Unnecessary Re-Renders for All Consumers

**File:** `src/ui/state/context.ts`
**Severity:** Medium

The entire `AppState` (21 fields) and `dispatch` function are bundled into a single `AppContext`. Any state change — even changing `scrollOffset` in the details panel — causes *every* component that calls `useAppState()` to re-render, because the context value is a new object on every dispatch.

React Context triggers re-renders for ALL consumers when the context value changes, regardless of whether the specific fields a consumer uses have changed. This means:

- Typing in the search bar → `searchKeyword` changes → `StatusBar`, `FilterDrawer`, `JobDetailsPanel`, `SearchResults` all re-render
- Scrolling in details → `selectedJobIndex` changes → `SearchBar`, `StatusBar`, `FilterDrawer` all re-render
- Terminal resize → `terminalWidth`/`terminalHeight` changes → everything re-renders

**Recommended fix (choose one):**

**Option A — Split contexts by update frequency:**
```typescript
// Rarely changes (terminal size, drawer state)
const AppLayoutContext = createContext<LayoutState>(...);

// Changes during search lifecycle
const AppSearchContext = createContext<SearchState>(...);

// Changes during navigation
const AppNavigationContext = createContext<NavigationState>(...);

// Stable dispatch (never changes identity)
const AppDispatchContext = createContext<Dispatch<AppAction>>(...);
```

**Option B — Selector hooks with `useSyncExternalStore`:**
Create a store that allows subscribing to specific slices of state, so components only re-render when their slice changes.

**Option C — `React.memo` on leaf components (simpler):**
Wrap components like `StatusBar`, `JobCard`, `Header`, `ResultsHeader`, `ResultsFooter` in `React.memo()` so they skip re-rendering when their props haven't changed. This is the simplest approach and often sufficient.

### 4.2 `useContainerHeight` Runs Measurement on Every Render

**File:** `src/ui/hooks/useContainerHeight.ts`
**Severity:** Low-Medium

```typescript
useEffect(() => {
  if (!ref.current) return;
  const { height } = measureElement(ref.current);
  if (height !== measuredHeight) {
    setMeasuredHeight(height);
  }
});
```

The intentional omission of the dependency array means this `useEffect` fires after *every* render. While the guard `height !== measuredHeight` prevents infinite loops, `measureElement()` still runs on every render cycle across the entire application. Ink's `measureElement` calls into the Yoga layout engine to read computed dimensions.

**Why this matters in Ink:** Unlike browser DOM where layout measurements can be batched by the browser engine, Ink's `measureElement` reads directly from the Yoga node tree. Every call traverses the Yoga graph.

**Recommended fix:** This is intentionally designed to catch resize-driven layout changes, so it can't use a standard dependency array. However, it could be optimized by:

1. Only measuring when terminal dimensions change:
```typescript
const { terminalWidth, terminalHeight } = useAppState();

useEffect(() => {
  if (!ref.current) return;
  const { height } = measureElement(ref.current);
  if (height !== measuredHeight) {
    setMeasuredHeight(height);
  }
}, [terminalWidth, terminalHeight, measuredHeight]);
```

2. Or measuring after specific state changes that affect layout (e.g., `filterDrawerOpen`):
```typescript
const { terminalWidth, terminalHeight, filterDrawerOpen } = useAppState();

useEffect(() => {
  if (!ref.current) return;
  const { height } = measureElement(ref.current);
  if (height !== measuredHeight) {
    setMeasuredHeight(height);
  }
}, [terminalWidth, terminalHeight, filterDrawerOpen, measuredHeight]);
```

### 4.3 FilterDrawer Unmounts/Remounts on Toggle

**File:** `src/ui/components/Layout.tsx`
**Severity:** Low-Medium

```tsx
{filterDrawerOpen && (
  <FocusableBox panel="filters" ...>
    <FilterDrawer />
  </FocusableBox>
)}
```

When `filterDrawerOpen` is `false`, the entire `FilterDrawer` component tree is unmounted from React. When it becomes `true`, React must:
1. Create all component instances from scratch
2. Run all `useState` initializers
3. Run the `filterReducer` initialization
4. Mount the `ScrollList` component
5. Run all `useEffect` hooks

While the `useFilterDraft` hook correctly resets the draft state on open, the cost of unmounting and remounting the entire subtree is unnecessary.

**Recommended fix:** Use `display="none"` instead of conditional rendering:

```tsx
<FocusableBox
  panel="filters"
  display={filterDrawerOpen ? 'flex' : 'none'}
  ...
>
  <FilterDrawer />
</FocusableBox>
```

This keeps the component mounted but hidden. Ink's `display="none"` is handled by Yoga and prevents the element from participating in layout calculation, similar to CSS `display: none`. The component retains its state without re-initialization.

**Trade-off:** The component remains in memory when hidden. For a filter drawer, this is negligible.

### 4.4 Missing `React.memo` on Leaf Components

**Severity:** Low-Medium

Several leaf components that receive stable or primitive props are not wrapped in `React.memo`. In Ink's full-tree rendering model, every component re-renders when its parent re-renders. Since Ink traverses the entire component tree on every state change, memoizing leaf components provides meaningful savings.

**Already memoized (done):**
- `FilterSection` — layout wrapper for filter sections
- `FilterCheckboxInput` — checkbox option list
- `FilterRadioInput` — radio option list
- `FilterTextInput` — text input field

**Components that would still benefit from `React.memo`:**

| Component | Reason |
|---|---|
| `JobCard` | Rendered inside VirtualList; props only change when job data or focus changes |
| `StatusBar` | Only needs to update when `focusedPanel` or filter count changes |
| `WelcomeScreen` | Static content, never needs to re-render |
| `SearchingSpinner` | Only renders a spinner, no props |
| `SearchError` | Only needs `message` prop |
| `NoSearchResults` | Static content |
| `ResultsHeader` | Only needs viewport + metadata |
| `ResultsFooter` | Only needs status + position info |

**Example:**
```typescript
// BEFORE
export function JobCard({ job, focused }: JobCardProps) { ... }

// AFTER
export const JobCard = React.memo(function JobCard({ job, focused }: JobCardProps) { ... });
```

---

## 5. React Anti-Patterns

### 5.1 Stale `draftRef` in SearchBar

**File:** `src/ui/components/SearchBar.tsx`
**Severity:** Low (currently no bug, but fragile)

```typescript
const draftRef = useRef(searchKeyword);
```

The `draftRef` is initialized from the global `searchKeyword` at mount time but is never updated if `searchKeyword` changes externally. For example, after `CLEAR_RESULTS` dispatches and resets `searchKeyword` to `''`, the `draftRef` still holds the old keyword.

Currently this doesn't cause a visible bug because:
1. `SearchBar` never unmounts (it's always in the layout)
2. `CLEAR_RESULTS` is only triggered by pressing Escape in results, which changes focus away from search

However, if any future action resets `searchKeyword` while the search bar is focused, the `TextInput` would show the stale value from the ref.

**Recommended fix:** Sync the ref when the global state changes:

```typescript
const draftRef = useRef(searchKeyword);

// Keep ref in sync with global state
useEffect(() => {
  draftRef.current = searchKeyword;
}, [searchKeyword]);
```

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

### 7.2 Dispatch Identity Stability

**File:** `src/ui/App.tsx`
**Severity:** Informational (currently correct)

The `dispatch` function from `useReducer` is guaranteed by React to have a stable identity across renders. The current code passes it via context alongside `state`, which means the context value object changes on every state update (because `state` changes).

If the context is split (as recommended in 4.1), `dispatch` should go in its own context:

```typescript
const AppDispatchContext = createContext<Dispatch<AppAction>>(noopDispatch);
```

This ensures components that only need `dispatch` (like event handlers) never re-render due to state changes.

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

### 10.4 Markdown Processing on Every Render

**File:** `src/ui/components/JobDetailsPanel.tsx`

The markdown-to-ANSI conversion:
```typescript
const rendered = md.parse(description) as string;
const descLines = rendered.split('\n');
```

This runs during render. If the component re-renders but `description` hasn't changed, the markdown is re-parsed unnecessarily.

**Recommendation:** Wrap in `useMemo`:
```typescript
const descLines = useMemo(() => {
  if (!description) return [];
  const normalized = description.replace(/<br\s*\/?>/gi, '\n');
  const rendered = md.parse(normalized) as string;
  return rendered.split('\n');
}, [description]);
```

### 10.5 `buildSummaryLines` and `buildDetailsMetadataLines` Called Every Render

**File:** `src/ui/components/JobDetailsPanel.tsx`

These helper functions build JSX element arrays from `jobDetails` data on every render. If the details haven't changed, this is wasted work.

**Recommendation:** Memoize:
```typescript
const metadataLines = useMemo(
  () => [...buildSummaryLines(selectedJob), ...buildDetailsMetadataLines(jobDetails)],
  [selectedJob, jobDetails]
);
```

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

| # | Issue | Severity | Category | Effort |
|---|---|---|---|---|
| 3.1 | JobDetailsPanel renders all off-screen lines | Critical | Performance | Low |
| 4.1 | Single context causes unnecessary re-renders | Medium | Performance | Medium-High |
| 4.2 | useContainerHeight measures on every render | Low-Medium | Performance | Low |
| 4.3 | FilterDrawer unmounts/remounts on toggle | Low-Medium | Performance | Low |
| 4.4 | Missing React.memo on leaf components (filter inputs done) | Low-Medium | Performance | Low |
| 5.1 | Stale draftRef in SearchBar | Low | Anti-pattern | Low |
| 6.2 | No stopPropagation — fragile text input check | Medium | Ink-specific | Low |
| 6.4 | Custom filter input components vs @inkjs/ui (kept custom) | Low | Ink-specific | Done |
| 7.1 | 21-field flat state object | Medium | Maintainability | Medium |
| 8.1 | Keyboard shortcut conflicts with TextInput | Low | Input | Low |
| 9.1 | useSlideAnimation dead code | Low | Cleanup | Trivial |
| 9.2 | Modal dead code | Low | Cleanup | Trivial |
| 10.1 | Fixed filter drawer width | Low | UX | Low |
| 10.2 | Manual scroll reset vs key prop pattern | Low | React pattern | Low |
| 10.4 | Markdown re-parsed on every render | Low | Performance | Low |
| 10.5 | Metadata lines rebuilt on every render | Low | Performance | Low |
| 10.6 | Process signal handlers don't clean up | Low | Robustness | Trivial |

### Priority Recommendations

**Quick wins (do first):**
1. Fix `JobDetailsPanel` windowing (3.1) — single line change, biggest impact
2. Memoize markdown parsing and metadata lines (10.4, 10.5)
3. Add `React.memo` to remaining leaf components (4.4) — filter inputs already done
4. Remove dead code (9.1, 9.2)
5. Sync `draftRef` in SearchBar (5.1)

**Medium-term improvements:**
6. Use `display="none"` for FilterDrawer instead of unmounting (4.3)
7. Add dependency array to `useContainerHeight` (4.2)
8. Make text input focus tracking explicit (6.2, 8.1)

**Larger refactors (consider for future):**
9. Split AppContext by update frequency (4.1)
10. Restructure AppState into sub-objects (7.1)

---

*Report generated from analysis of React documentation, Ink library source code (v5.x), @inkjs/ui component library, and community Ink component ecosystem.*

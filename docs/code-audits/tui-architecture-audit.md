# TUI Deep Architecture Audit

> **Date:** 2026-02-21
> **Scope:** `packages/jobby-cli/src/ui/` — React/Ink terminal UI
> **Methodology:** Deep architectural trace of all hooks, state flows, and component composition. Cross-referenced against React 18 documentation, Ink v5 source code, and patterns established by the prior audit (`docs/tui-react-ink-audit.md`). Findings below are **new only** — all previously-audited items are confirmed fixed.
> **Testing:** TUI test coverage is deliberately deferred. The TUI is not yet in a final state. Tests will be added once the application stabilizes. See section 9.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
   - [1.1 Pragmatism Assessment](#11-pragmatism-assessment)
2. [What the Architecture Does Well](#2-what-the-architecture-does-well)
3. [Medium Issues](#3-medium-issues)
4. [Low-Medium Issues](#4-low-medium-issues)
5. [Low Issues](#5-low-issues)
6. [React Hooks Analysis](#6-react-hooks-analysis)
7. [Component Composition Analysis](#7-component-composition-analysis)
8. [Recommendations](#8-recommendations)
9. [Testing Status](#9-testing-status)

---

## 1. Executive Summary

The TUI architecture is in very good shape after four rounds of audit fixes. The 5-context split, ref-based stable handlers in `useDetailsKeyboard` and `useFilterKeyboard`, virtualized lists, and `display="none"` FilterDrawer are all correctly implemented. The remaining issues are localized and bounded.

**Key new findings:**

- ~~**2 medium issues** — `useResultsKeyboard` still uses an inline `useInput` handler (inconsistent with the ref-based pattern established elsewhere)~~ **FIXED**, and ~~`useContainerHeight` is called in `SearchResults` but its return value is discarded (dead work)~~ **FIXED**
- ~~**1 low-medium issue** — `JobbyClient` instantiated via `useMemo` rather than `useRef`~~ **FIXED**, ~~**1 low-medium issue** — `useKeyboardNavigation` passes an inline handler to `useInput`~~ **FIXED**, **1 low-medium issue remaining** — `FilterDrawer.sectionElements` memo invalidates on every navigation keystroke due to `cursors` object reference
- All previously-audited items confirmed fixed

### 1.1 Pragmatism Assessment

Not every audit finding carries equal weight. The table below classifies each recommendation so readers can triage effectively. **Pragmatic** items are worth doing in any project. **Nice-to-have** items are technically sound but most teams skip them. **Over-engineered** items add complexity without proportional benefit at this project's scale and are included for completeness only.

| # | Finding | Rating | Rationale |
|---|---|---|---|
| 3.1 | `useResultsKeyboard` inline handler re-registration | **Pragmatic** | Real Ink re-registration bug on every keypress; fixed. |
| 3.2 | `useContainerHeight` dead call in `SearchResults` | **Pragmatic** | Dead hook doing real work (Yoga measurement + state updates); easy removal. **FIXED** |
| 4.1 | `JobbyClient` via `useMemo` instead of `useRef` | **Nice-to-have** | `useMemo` with `[]` deps has never re-run in any shipping React version; fixed anyway for semantic correctness. |
| 4.2 | `useKeyboardNavigation` inline handler | **Nice-to-have** | Layout changes are infrequent user-initiated events; consistency is the only motivation. **FIXED** |
| 4.3 | `sectionElements` memo invalidation | **Over-engineered** | Rebuilding 8 JSX elements per keypress is not a real bottleneck. |
| 5.1 | `maxWidth`/`maxHeight` redundant state | **Pragmatic** | Bug waiting to happen (divergent values); fixed. |
| 5.2 | `getFilterSection` O(n) linear scan | **Over-engineered** | `Array.find` over 8 items ~5-6 times is ~48 comparisons; a `Record` lookup saves unmeasurable time. |
| Priority 1 | Ref-based handler for `useKeyboardNavigation` | **Nice-to-have** | Infrequent events; consistency-only motivation. **FIXED** |
| Priority 2 | Remove `useContainerHeight` dead call | **Pragmatic** | Dead work with real side effects. **FIXED** |
| Priority 3 | Optimize `sectionElements` memo / pre-build lookup map | **Over-engineered** | Micro-optimizations below any observable threshold. |
| Testing | Focus on reducers and abort paths | **Pragmatic** | Right strategy -- highest value-to-effort ratio for TUI tests. |

---

## 2. What the Architecture Does Well

### 2.1 Consistent Ref-Based Stable Handler Pattern (Where Applied)

`useDetailsKeyboard` and `useFilterKeyboard` both correctly implement the "latest ref + stable `useCallback`" pattern for `useInput`:

```typescript
const stateRef = useRef(state);
stateRef.current = state;
const handler = useCallback((_input, key) => {
  // reads from stateRef.current — always fresh
}, [/* stable deps only */]);
useInput(handler, { isActive: focused });
```

This eliminates Ink handler re-registration on every render. It is the correct Ink pattern and should be applied consistently.

### 2.2 Context-Aware `isActive` Guards

Every per-panel keyboard hook correctly uses `isActive` or a conditional guard to prevent handler execution when its panel isn't focused. The `usePanelFocus` hook provides a clean abstraction for this check.

### 2.3 VirtualList Integration

`SearchResults` correctly uses `ink-virtual-list` with stable `keyExtractor` and `renderItem` callbacks (both wrapped in `useCallback`), `height='auto'`, and proper `reservedLines` accounting.

### 2.4 Filter Draft Pattern

The two-level filter state (local `useReducer` draft committed on Enter) is architecturally sound. The `useFilterDraft` hook cleanly encapsulates draft initialization and sync with global state.

---

## 3. Medium Issues

### 3.1 `useResultsKeyboard` Uses Inline `useInput` Handler — Re-Registers on Every Arrow-Key Press — **FIXED**

**File:** `packages/jobby-cli/src/ui/hooks/useResultsKeyboard.ts:46`
**Severity:** Medium
**Status: FIXED** — Rewrote with ref-based stable handler pattern (matching useFilterKeyboard/useDetailsKeyboard). All state values stored in refs, `useCallback` with empty deps. Fix matched the recommended approach.

### 3.2 `useContainerHeight` Called in `SearchResults` with Return Value Discarded — **FIXED**

**File:** `packages/jobby-cli/src/ui/components/SearchResults.tsx:24`
**Severity:** Medium (dead work)
**Status: FIXED** — Removed the `useContainerHeight(containerRef)` call, the `containerRef` variable, the `ref={containerRef}` JSX prop, and the unused `useContainerHeight` and `DOMElement` imports.

---

## 4. Low-Medium Issues

### 4.1 `JobbyClient` Instantiated via `useMemo` Instead of `useRef` — **FIXED**

**File:** `packages/jobby-cli/src/ui/hooks/useSearch.ts:17`
**Severity:** Low-Medium
**Status: FIXED** — Changed `useMemo(() => new JobbyClient(...), [])` to `useRef(new JobbyClient(...)).current` in `useSearch.ts`. Slightly simpler than the recommended null-check pattern, but achieves the same stable-reference semantics.

### 4.2 `useKeyboardNavigation` Passes Inline Handler to `useInput` — **FIXED**

**File:** `packages/jobby-cli/src/ui/hooks/useKeyboardNavigation.ts:17`
**Severity:** Low-Medium
**Status: FIXED** — Refactored to ref-based stable handler pattern matching `useFilterKeyboard`/`useDetailsKeyboard`. Reactive values (`focusedPanel`, `filterDrawerOpen`, `dispatch`) stored in refs via `useLatest`, stable `useCallback` handler with empty deps reads from refs.

### 4.3 `FilterDrawer.sectionElements` Memo Invalidates on Every Navigation Keystroke

**File:** `packages/jobby-cli/src/ui/components/FilterDrawer.tsx:57-135`
**Severity:** Low-Medium

```typescript
const sectionElements = useMemo(() => [
  // ... 8 filter section elements ...
], [activeSection, cursors, selections, focused, handleLocationChange, handleGeoIdChange, handleCompanyIdChange]);
```

The `cursors` dependency is an object from the filter draft reducer. On every arrow-key press within the filter drawer, the reducer produces a new `cursors` object reference (even if only one section's cursor changed), invalidating this memo and rebuilding all 8 section JSX elements.

**Fix:** Either:
1. **Memoize individual sections** rather than the full array, keyed on their specific cursor value (`cursors.jobType`, `cursors.experienceLevel`, etc.)
2. **Split the `cursors` object into per-section refs** so each section's memo only depends on its own cursor value
3. **Use a stable cursor reference** by serializing cursors or using `useRef` to avoid object identity changes

**Partially Fixed** — Destructured `cursors` object in FilterDrawer dependency array to individual cursor values (`cursors.jobType`, `cursors.experienceLevel`, etc.), reducing unnecessary memo invalidation.

---

## 5. Low Issues

### 5.1 `maxWidth`/`maxHeight` Always Equal Terminal Dimensions — **FIXED**

**Files:** `src/ui/state/types.ts`, `src/ui/state/reducer.ts`, `src/ui/state/context.ts`, `src/ui/App.tsx`, `src/ui/components/Layout.tsx`, `src/ui/components/FilterDrawer.tsx`
**Severity:** Low
**Status: FIXED** — Removed `maxWidth` and `maxHeight` from `AppState`, `initialState`, `SET_TERMINAL_SIZE` reducer case, and `LayoutState`. Replaced all usages in `Layout.tsx` and `FilterDrawer.tsx` with `terminalWidth`/`terminalHeight` directly.

### 5.2 `getFilterSection` Uses `Array.find` — O(n) Linear Scan — **FIXED**

**File:** `packages/jobby-cli/src/ui/state/filterTypes.ts`
**Severity:** Low
**Status: FIXED** — Pre-built a `Record<FilterSectionKey, FilterSectionDef>` lookup map at module level. `getFilterSection` now does O(1) direct property access.

`getFilterSection` does a linear scan of `SECTION_ORDER` on each call, invoked 5-6 times per keypress in the filter drawer.

**Fix:** Pre-build a `Record<FilterSectionKey, FilterSectionDef>` lookup map at module level.

---

## 6. React Hooks Analysis

### Hook Consistency Matrix

| Hook | Stable Handler | `isActive` Guard | Ref-Based State | Notes |
|---|---|---|---|---|
| `useDetailsKeyboard` | Yes | Yes | Yes | Correctly implemented |
| `useFilterKeyboard` | Yes | Yes | Yes | Correctly implemented |
| `useResultsKeyboard` | Yes | Yes | Yes | **Fixed (3.1)** |
| `useKeyboardNavigation` | Yes | N/A (global) | Yes | **Fixed (4.2)** |
| `useSearch` | N/A | N/A | `useRef` client | **Fixed (4.1)** |
| `useJobDetails` | N/A | N/A | Yes (statusRef, abortRef) | Correctly implemented |
| `useContainerHeight` | N/A | N/A | N/A | **Dead call removed (3.2 — Fixed)** |
| `usePanelFocus` | N/A | N/A | N/A | Simple derived value — correct |
| `useFilterDraft` | N/A | N/A | N/A | Reducer pattern — correct |

### Pattern Recommendation

All `useInput` call sites should follow the same pattern for consistency and correctness:

```typescript
// 1. Store changing values in refs
const stateRef = useRef(changingValues);
stateRef.current = changingValues;

// 2. Create stable handler that reads from refs
const handler = useCallback((_input, key) => {
  const s = stateRef.current;
  // ...use s.* for all state reads
}, [/* only truly stable deps: dispatch, ref objects */]);

// 3. Pass stable handler to useInput
useInput(handler, { isActive: condition });
```

---

## 7. Component Composition Analysis

### Re-Render Cascade Analysis

When the user presses an arrow key in the results list:

1. `dispatch({ type: 'SET_SELECTED_JOB_INDEX' })` fires
2. `SelectionContext` value changes → `SearchResults` re-renders
3. ~~`useResultsKeyboard`'s inline handler is recreated → Ink re-registers it~~ **(3.1 — FIXED)**
4. `useContainerHeight` effect runs (re-measures element) **(3.2 — unnecessary)**
5. `VirtualList` receives new `selectedIndex` → renders visible items
6. `JobDetailsPanel` receives new selection → debounced fetch

Step 4 is avoidable overhead (step 3 is now fixed).

### FilterDrawer Re-Render Analysis

When the user presses arrow-up/down in the filter drawer:

1. `draftDispatch({ type: 'NAVIGATE_FILTERS' })` fires
2. `draft` state changes → `FilterDrawer` re-renders
3. `sectionElements` memo invalidates (new `cursors` object reference) **(4.3)**
4. All 8 section JSX elements are recreated
5. `ScrollList` re-renders with new children

Step 3–4 could be optimized — only the active section needs its cursor prop updated.

---

## 8. Recommendations

### Priority 1 — Consistency Fixes (follow established patterns)

1. ~~**Apply ref-based stable handler to `useResultsKeyboard`** (3.1) — same pattern as `useDetailsKeyboard`~~ **DONE**
2. ~~**Apply ref-based stable handler to `useKeyboardNavigation`** (4.2) — same pattern~~ **DONE**

### Priority 2 — Dead Code and Semantic Fixes

3. ~~**Remove or utilize `useContainerHeight` call in `SearchResults`** (3.2)~~ **DONE**
4. ~~**Use `useRef` for `JobbyClient` in `useSearch`** (4.1)~~ **DONE**

### Priority 3 — Optimization

5. **Optimize `sectionElements` memo** in `FilterDrawer` (4.3) — memoize per-section or stabilize `cursors` reference
6. ~~**Remove `maxWidth`/`maxHeight` redundant state** (5.1)~~ **DONE**
7. **Pre-build `getFilterSection` lookup map** (5.2)

---

## 9. Testing Status

> **TUI test coverage is deliberately deferred.** The TUI is not yet in a final state, and comprehensive tests will be added once the application stabilizes. This is an intentional decision — not a coverage gap.
>
> When tests are added, focus areas should include:
> - Reducer action dispatch and state transitions
> - Keyboard hook behavior (input → dispatch mapping)
> - Context slice isolation (selection changes don't trigger details re-renders)
> - Filter draft → global state commit flow
> - AbortController cancellation paths in `useSearch` and `useJobDetails`

---

## Summary Table

| # | Severity | Issue | File(s) | Status |
|---|---|---|---|---|
| 3.1 | Medium | `useResultsKeyboard` inline `useInput` handler re-registers every keypress | `useResultsKeyboard.ts:46` | **Fixed** |
| 3.2 | Medium | `useContainerHeight` called in `SearchResults` with return value discarded | `SearchResults.tsx:24` | **Fixed** |
| 4.1 | Low-Medium | `JobbyClient` via `useMemo` instead of `useRef` | `useSearch.ts:17` | **Fixed** |
| 4.2 | Low-Medium | `useKeyboardNavigation` inline handler re-registers on layout changes | `useKeyboardNavigation.ts:17` | **Fixed** |
| 4.3 | Low-Medium | `sectionElements` memo invalidates on every filter navigation keystroke | `FilterDrawer.tsx:57-135` | Partially Fixed |
| 5.1 | Low | `maxWidth`/`maxHeight` always equal terminal dimensions — redundant state | `types.ts`, `reducer.ts`, `context.ts` | **Fixed** |
| 5.2 | Low | `getFilterSection` O(n) linear scan per keypress | `filterTypes.ts` | **Fixed** |

---

*Report generated from deep architecture trace of all hooks, components, and state flows in `packages/jobby-cli/src/ui/`. Cross-referenced with patterns established in `docs/tui-react-ink-audit.md` (all items confirmed fixed).*

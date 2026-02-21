# TUI Code Review Notes

> **Reviewed:** 2026-02-21
> **Scope:** `packages/jobby-cli/src/ui/` — React/Ink terminal UI
> **Reviewer:** TUI Code Review Agent
> **Note:** All Round 1-4 items from `docs/tui-react-ink-audit.md` are confirmed fixed. Below are NEW findings only.

---

## Critical

### C1. `useSearch` Called at Three Independent Sites — Each Gets Its Own `JobbyClient` and `abortRef` — **FIXED**

**Confidence: 95**
**Status: FIXED** — Called `useSearch()` once in `AppInner`. Created `SearchActionsContext` in `state/searchActions.ts`. Updated `SearchBar.tsx`, `useFilterKeyboard.ts`, `useResultsKeyboard.ts` to consume `useSearchActions()` from context instead of calling `useSearch()` directly. Fix matched the recommended approach.

---

## Important

### I1. `useResultsKeyboard` Uses an Inline `useInput` Handler — Re-Registers on Every Arrow-Key Press — **FIXED**

**Confidence: 90**
**Status: FIXED** — Rewrote with ref-based stable handler pattern (matching useFilterKeyboard/useDetailsKeyboard). All state values stored in refs, `useCallback` with empty deps. Fix matched the recommended approach.

### I2. `useContainerHeight` Has a Stale Closure on `measuredHeight` Inside the Effect Body

**Confidence: 85**

**File:** `packages/jobby-cli/src/ui/hooks/useContainerHeight.ts` lines 15-26

```typescript
// Note: measuredHeight is intentionally excluded from the dependency array.
useEffect(() => {
  if (ref.current) {
    const { height } = measureElement(ref.current);
    if (height !== measuredHeight) {   // reads stale closure value
      setMeasuredHeight(height);
    }
  }
}, [terminalWidth, terminalHeight, filterDrawerOpen]);
```

`measuredHeight` inside the effect closure is the value captured at effect registration time. If two resize events fire before the first `setMeasuredHeight` triggers a re-render, the second closure compares against the old pre-resize height.

**Fix:** Use a ref to hold the last-measured value:

```typescript
const measuredHeightRef = useRef(0);

useEffect(() => {
  if (ref.current) {
    const { height } = measureElement(ref.current);
    if (height !== measuredHeightRef.current) {
      measuredHeightRef.current = height;
      setMeasuredHeight(height);
    }
  }
}, [terminalWidth, terminalHeight, filterDrawerOpen, ref]);
```

---

## Minor

### M1. `maxWidth`/`maxHeight` Are Always Identical to `terminalWidth`/`terminalHeight` — Redundant State

**Confidence: 82**

**Files:** `types.ts` (lines 22-23), `reducer.ts` (lines 7-8, 31), `context.ts` (lines 11-12, 49-50), `App.tsx` (lines 30-31, 34)

The `SET_TERMINAL_SIZE` case always sets `maxWidth = action.width, maxHeight = action.height`. No code path ever sets them differently. These 4 fields add bulk to `AppState`, `LayoutState`, and the `useMemo` dependency array with no behavioral difference.

**Fix:** Either implement the capping logic they were intended to support or remove them and use `terminalWidth`/`terminalHeight` directly.

### M2. `getFilterSection` Uses `Array.find` — O(n) Linear Scan Called 5-6 Times Per Keypress

**Confidence: 80**

**File:** `packages/jobby-cli/src/ui/state/filterTypes.ts` lines 95-101

**Fix:** Pre-build a `Record<FilterSectionKey, FilterSectionDef>` at module level and a `Record<FilterSectionKey, number>` index map.

---

## Informational

### N1. `SearchBar` Dual `useInput` Registration

`SearchBar` registers its own `useInput` (for `Escape`) and simultaneously renders `@inkjs/ui`'s `TextInput`, which has its own internal `useInput`. These coexist correctly today, but if a future developer adds `key.return` handling to the `SearchBar` handler, it will fire simultaneously with `TextInput`'s `onSubmit`. A comment noting this constraint would help.

---

## Summary Table

| # | Confidence | Severity | Issue | File(s) | Status |
|---|---|---|---|---|---|
| C1 | 95 | Critical | Three independent `useSearch()` call sites with siloed abort/client | `useSearch.ts`, `useResultsKeyboard.ts`, `useFilterKeyboard.ts`, `SearchBar.tsx` | **Fixed** |
| I1 | 90 | Important | `useResultsKeyboard` inline `useInput` handler re-registers every keypress | `useResultsKeyboard.ts` | **Fixed** |
| I2 | 85 | Important | `useContainerHeight` stale closure on `measuredHeight` in effect | `useContainerHeight.ts` | Open |
| M1 | 82 | Minor | `maxWidth`/`maxHeight` always equal terminal dimensions — redundant state | `types.ts`, `reducer.ts`, `context.ts`, `App.tsx` | Open |
| M2 | 80 | Minor | `getFilterSection` O(n) linear scan 5-6x per keypress | `filterTypes.ts` | Open |
| N1 | 60 | Informational | `SearchBar` dual `useInput` registration — fragile if extended | `SearchBar.tsx` | Open |

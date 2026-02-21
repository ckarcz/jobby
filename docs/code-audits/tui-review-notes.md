# TUI Code Review Notes

> **Reviewed:** 2026-02-21
> **Scope:** `packages/jobby-cli/src/ui/` — React/Ink terminal UI
> **Reviewer:** TUI Code Review Agent
> **Note:** All Round 1-4 items from `docs/tui-react-ink-audit.md` are confirmed fixed. Below are NEW findings only.

---

## Critical

### C1. `useSearch` Called at Three Independent Sites — Each Gets Its Own `JobbyClient` and `abortRef`

**Confidence: 95**

**Files affected:**
- `packages/jobby-cli/src/ui/hooks/useSearch.ts` lines 16-17
- `packages/jobby-cli/src/ui/hooks/useResultsKeyboard.ts` line 17
- `packages/jobby-cli/src/ui/hooks/useFilterKeyboard.ts` line 125
- `packages/jobby-cli/src/ui/components/SearchBar.tsx` line 13

`useSearch()` is consumed in three separate component trees simultaneously. Each call executes the full hook body, creating an isolated `abortRef` and a `useMemo`-owned `JobbyClient`:

```typescript
// useSearch.ts — runs independently at each call site
const abortRef = useRef<AbortController | null>(null);
const client = useMemo(() => new JobbyClient({ logging: { level: 'silent' } }), []);
```

Three concrete problems:

1. **Abort does not cross call sites.** `SearchBar` calls `search()` using its own instance's `abortRef`. When `useFilterKeyboard` subsequently calls `search()`, it only aborts its own prior requests — not `SearchBar`'s in-flight request. Both requests can be alive and racing to dispatch `SEARCH_SUCCESS`.

2. **Three `JobbyClient` instances exist simultaneously** (`SearchBar` is mounted, `FilterDrawer` hosts `useFilterKeyboard`, and `SearchResults` hosts `useResultsKeyboard`).

3. **`loadMore`'s in-flight request cannot be aborted by a concurrent `search()` call** if they originate from different call sites.

**Fix:** Call `useSearch()` once in `AppInner` alongside the other orchestrating hooks (`useJobDetails`, `useKeyboardNavigation`, etc.), then expose `search` and `loadMore` via a `SearchActionsContext` or thread them as props.

---

## Important

### I1. `useResultsKeyboard` Uses an Inline `useInput` Handler — Re-Registers on Every Arrow-Key Press

**Confidence: 90**

**File:** `packages/jobby-cli/src/ui/hooks/useResultsKeyboard.ts` line 46

The prior audit fixed this exact pattern in `useDetailsKeyboard` (audit 4.7) and `useFilterKeyboard` — but `useResultsKeyboard` still passes an inline function to `useInput`. `SearchResults` re-renders on every arrow-key press (because `selectedJobIndex` changes), so Ink re-registers the handler on every keypress.

**Fix:** Apply the same "latest ref + stable `useCallback`" pattern used in `useDetailsKeyboard` and `useFilterKeyboard`.

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

| # | Confidence | Severity | Issue | File(s) |
|---|---|---|---|---|
| C1 | 95 | Critical | Three independent `useSearch()` call sites with siloed abort/client | `useSearch.ts`, `useResultsKeyboard.ts`, `useFilterKeyboard.ts`, `SearchBar.tsx` |
| I1 | 90 | Important | `useResultsKeyboard` inline `useInput` handler re-registers every keypress | `useResultsKeyboard.ts` |
| I2 | 85 | Important | `useContainerHeight` stale closure on `measuredHeight` in effect | `useContainerHeight.ts` |
| M1 | 82 | Minor | `maxWidth`/`maxHeight` always equal terminal dimensions — redundant state | `types.ts`, `reducer.ts`, `context.ts`, `App.tsx` |
| M2 | 80 | Minor | `getFilterSection` O(n) linear scan 5-6x per keypress | `filterTypes.ts` |
| N1 | 60 | Informational | `SearchBar` dual `useInput` registration — fragile if extended | `SearchBar.tsx` |

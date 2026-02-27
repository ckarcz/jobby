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

### I2. `useContainerHeight` Has a Stale Closure on `measuredHeight` Inside the Effect Body — **FIXED**

**Confidence: 85**
**Status: FIXED** — Already uses `measuredHeightRef` pattern. The ref holds the last-measured value and the effect compares against `measuredHeightRef.current`, avoiding the stale closure.

---

## Minor

### M1. `maxWidth`/`maxHeight` Are Always Identical to `terminalWidth`/`terminalHeight` — Redundant State — **FIXED**

**Confidence: 82**
**Status: FIXED** — Removed `maxWidth` and `maxHeight` from `AppState`, `initialState`, `SET_TERMINAL_SIZE` reducer case, and `LayoutState`. All usages replaced with `terminalWidth`/`terminalHeight` directly. (Fixed in tui-architecture-audit round.)

### M2. `getFilterSection` Uses `Array.find` — O(n) Linear Scan Called 5-6 Times Per Keypress

**Confidence: 80**

**File:** `packages/jobby-cli/src/ui/state/filterTypes.ts` lines 95-101

**Fix:** Pre-build a `Record<FilterSectionKey, FilterSectionDef>` at module level and a `Record<FilterSectionKey, number>` index map.
**Status: FIXED** — Pre-built a `Map<FilterSectionKey, FilterSectionDef>` lookup at module level. `getFilterSection` now does O(1) direct access.

---

## Informational

### N1. `SearchBar` Dual `useInput` Registration — **FIXED**

**Status: FIXED** — Added a JSDoc comment above SearchBar's `useInput` call documenting the constraint: TextInput has its own internal `useInput` that handles Enter and printable characters, so those keys must not be duplicated in SearchBar's handler.

---

## Summary Table

| # | Confidence | Severity | Issue | File(s) | Status |
|---|---|---|---|---|---|
| C1 | 95 | Critical | Three independent `useSearch()` call sites with siloed abort/client | `useSearch.ts`, `useResultsKeyboard.ts`, `useFilterKeyboard.ts`, `SearchBar.tsx` | **Fixed** |
| I1 | 90 | Important | `useResultsKeyboard` inline `useInput` handler re-registers every keypress | `useResultsKeyboard.ts` | **Fixed** |
| I2 | 85 | Important | `useContainerHeight` stale closure on `measuredHeight` in effect | `useContainerHeight.ts` | **Fixed** |
| M1 | 82 | Minor | `maxWidth`/`maxHeight` always equal terminal dimensions — redundant state | `types.ts`, `reducer.ts`, `context.ts`, `App.tsx` | **Fixed** |
| M2 | 80 | Minor | `getFilterSection` O(n) linear scan 5-6x per keypress | `filterTypes.ts` | **Fixed** |
| N1 | 60 | Informational | `SearchBar` dual `useInput` registration — fragile if extended | `SearchBar.tsx` | **Fixed** |

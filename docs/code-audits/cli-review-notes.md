# jobby-cli Code Review Notes

> **Reviewed:** 2026-02-21
> **Scope:** `packages/jobby-cli/` non-UI source and test files
> **Reviewer:** Code Review Agent

---

## Critical Issues

### 1. Signal handler tests spy on `process.on` but production code uses `process.once` — false negatives — **FIXED**

**Confidence: 95**
**Status: FIXED** — Changed `vi.spyOn(process, 'on')` to `vi.spyOn(process, 'once')` in `main.test.ts`. Also added `process.once` mock in beforeEach to prevent `main()` from registering real process handlers that crash the vitest worker. Fix matched the recommended approach.

### 2. Integration tests assert `--easy-apply-only` and `--under-10-applicants` flags that are not implemented — **FIXED**

**Confidence: 95**
**Status: FIXED** — Removed `--easy-apply-only` and `--under-10-applicants` assertions from integration tests. Updated `docs/commands.md`.

---

## Important Issues

### 3. `details` command calls `process.exit(1)` directly, bypassing centralized error handler — **FIXED**

**Confidence: 85**
**Status: FIXED** — Replaced `console.error + process.exit(1)` with `throw new ValidationError(...)` in `details.ts`. Fix matched the recommended approach.

### 4. Integration test helper `runCli` builds shell command by naive string quoting — **Partially Fixed**

**Confidence: 88**
**Status: Partially Fixed** — Escaped double quotes in integration test helpers. The fundamental architecture (string-based `exec`) was not changed to `execFile`/`spawn`, but the immediate quoting issue was addressed.

### 5. `search.test.ts` uses `'mid-senior'` as an experience level — not a valid value — **FIXED**

**Confidence: 90**
**Status: FIXED** — Changed invalid `'mid-senior'` to `'director'` in search.test.ts. Used a different valid value than recommended (`'director'` instead of `'associate'`).

### 6. Circular import: `program.ts` ↔ command files via `helpConfig` — **FIXED**

**Confidence: 80**
**Status: FIXED** — Created `src/help-config.ts` extracting `helpConfig` from `program.ts`. Updated imports in all command files and `index.ts`. Fix matched the recommended approach.

---

## Test Quality Notes

### 7. `formatter.test.ts` mutates the global formatter registry without `afterEach` cleanup

**Confidence: 80**
**File:** `packages/jobby-cli/src/formatters/formatter.test.ts`, lines 36-62

If an assertion throws before the restoration call, the global registry is left mutated.

**Fix:** Use `afterEach` to ensure restoration always runs.

### 8. `details.test.ts` — "should output empty string when html response is empty" has a weak assertion

**Confidence: 82**
**File:** `packages/jobby-cli/src/commands/details.test.ts`, lines 224-228

The assertion only verifies that `console.log` was called, not what it was called with.

**Fix:** `expect(consoleSpy).toHaveBeenCalledWith('');`

---

## Behavioral Inconsistency

### `search` command silently drops empty `rawHtml` responses; `details` does not

**Confidence: 82**

In `search.ts`, empty/falsy rawHtml is silently swallowed. In `details.ts`, `outputResult` is called unconditionally. This inconsistency could confuse users piping output.

---

## Summary Table

| # | Severity | File | Description | Status |
|---|----------|------|-------------|--------|
| 1 | Critical | `main.test.ts:237,260` | Signal handler tests spy on `.on` instead of `.once` — false negatives | **Fixed** |
| 2 | Critical | `cli-help.test.ts:83-84`, `cli-output.test.ts:68-69` | Tests assert flags that don't exist in the CLI | **Fixed** |
| 3 | Important | `details.ts:83-85` | `process.exit(1)` called directly, bypassing centralized error handler | **Fixed** |
| 4 | Important | `helpers.ts:25-26` | Naive shell string quoting is fragile | **Partially Fixed** |
| 5 | Important | `search.test.ts:97,103` | `'mid-senior'` is not a valid `ExperienceLevel` value | **Fixed** |
| 6 | Important | `program.ts` / command files | Circular import of `helpConfig` | **Fixed** |
| 7 | Quality | `formatter.test.ts:36-62` | Global registry mutated without guaranteed cleanup | Open |
| 8 | Quality | `details.test.ts:224-228` | Weak assertion on empty rawHtml output | Open |

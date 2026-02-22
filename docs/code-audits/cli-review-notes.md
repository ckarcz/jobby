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

---

## Post-Audit Commit Review (078d85b, 18c6114, fe732a3)

### Issues Introduced by Audit Fixes

1. **`useResultsKeyboard` ref boilerplate — Missing `useLatest()` abstraction** (078d85b) — **FIXED**
   - **Status: FIXED** — Extracted `useLatest<T>` hook to `useLatest.ts`. Replaced 6 ref-sync pairs in `useResultsKeyboard` and 5 in `useFilterKeyboard` with single `useLatest()` calls.

2. **`SearchActionsContext` no-op default** (078d85b)
   - Default value provides `() => undefined` for `search` and `loadMore`
   - If a component renders outside the provider, it will silently do nothing instead of crashing
   - **Recommendation:** Throw an error in the default: `throw new Error('useSearchActions must be used within SearchActionsContext.Provider')`

3. **`main.test.ts` vitest 4 mock repetition** (fe732a3)
   - 11 instances of `MockedJobbyClient.mockImplementation(function () { return { ... } as any; })` — all structurally identical with only the mock return values varying
   - The arrow-to-function conversion was mandatory (vitest 4 breaking change), but 11 repetitions should have been extracted into a helper like `mockClient({ queryForJobs: vi.fn().mockResolvedValue(...) })`
   - Formatting is inconsistent: `test-helpers.ts` uses proper multi-line formatting, `main.test.ts` crams everything onto single lines
   - **Recommendation:** Extract a `createMockClient(overrides)` helper in `main.test.ts` or reuse the one in `test-helpers.ts`

### Changes That Were Good

- `bin.ts` / `main.ts` split — standard Node.js pattern, fixes real test side-effect issue
- `noColor → color` rename — genuine Commander.js bug fix
- `process.exit → throw ValidationError` — better error handling
- `helpConfig` extraction — necessary to break circular import
- `SearchActionsContext` (the idea itself) — solves real race condition cleanly, 19 lines
- `useMemo → useRef` for JobbyClient — correct per React docs
- `isUrl` narrowing to HTTP/HTTPS — real input validation fix
- `maxWidth/maxHeight` removal — dead state cleanup
- `useContainerHeight` stale closure fix — real bug fix
- `nodemon → tsx watch` — excellent KISS improvement, removes a dependency
- Removal of phantom flag assertions — tests were wrong

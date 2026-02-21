# jobby-cli Code Review Notes

> **Reviewed:** 2026-02-21
> **Scope:** `packages/jobby-cli/` non-UI source and test files
> **Reviewer:** Code Review Agent

---

## Critical Issues

### 1. Signal handler tests spy on `process.on` but production code uses `process.once` — false negatives

**Confidence: 95**
**Files:**
- `packages/jobby-cli/src/main.test.ts`, lines 237, 260
- `packages/jobby-cli/src/main.ts`, lines 17-36

The two signal-handler registration tests both spy on `process.on`, but `main.ts` registers every handler with `process.once`. `process.once` and `process.on` are separate EventEmitter methods. A spy on `.on` does not intercept calls to `.once`. The tests pass vacuously because the vitest/Node infrastructure itself calls `process.on` during test execution.

**Fix:** Change both spies to `process.once`:

```typescript
const onceSpy = vi.spyOn(process, 'once');
expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
```

### 2. Integration tests assert `--easy-apply-only` and `--under-10-applicants` flags that are not implemented

**Confidence: 95**
**Files:**
- `packages/jobby-cli/tests/integration/cli-help.test.ts`, lines 83-84
- `packages/jobby-cli/tests/integration/cli-output.test.ts`, lines 68-69

Neither `--easy-apply-only` nor `--under-10-applicants` is defined anywhere in `src/commands/search.ts`. These tests will fail against the real CLI. Either the flags need to be implemented or the tests/docs need to be removed.

---

## Important Issues

### 3. `details` command calls `process.exit(1)` directly, bypassing centralized error handler

**Confidence: 85**
**File:** `packages/jobby-cli/src/commands/details.ts`, lines 82-85

When neither a URL/ID argument nor piped stdin is provided, the `details` action handler calls `process.exit(1)` directly. Every other error path throws an exception that bubbles up to `main()`'s `catch` block.

**Fix:** Throw `ValidationError` instead.

### 4. Integration test helper `runCli` builds shell command by naive string quoting

**Confidence: 88**
**File:** `packages/jobby-cli/tests/integration/helpers.ts`, lines 25-26

```typescript
const quotedArgs = args.map(a => `"${a}"`).join(' ');
const cmd = `npx tsx "${entrypoint}" ${quotedArgs}`;
```

Any argument containing a double-quote character will break the shell command string. On Windows, `exec` uses `cmd.exe` where double-quoting rules differ from POSIX shells.

**Fix:** Use `execFile` or `spawn` with an array of arguments.

### 5. `search.test.ts` uses `'mid-senior'` as an experience level — not a valid value

**Confidence: 90**
**File:** `packages/jobby-cli/src/commands/search.test.ts`, lines 94-107

`EXPERIENCE_LEVEL_CHOICES` does not contain `mid-senior`. The tests pass because TypeScript type enforcement is bypassed.

**Fix:** Replace `'mid-senior'` with a valid value such as `'associate'`.

### 6. Circular import: `program.ts` ↔ command files via `helpConfig`

**Confidence: 80**
**Files:**
- `packages/jobby-cli/src/program.ts` (imports command factories)
- `packages/jobby-cli/src/commands/search.ts`, line 19 (imports `helpConfig` from `../program.js`)
- `packages/jobby-cli/src/commands/details.ts`, line 9 (same)
- `packages/jobby-cli/src/commands/ui.ts`, line 5 (same)

Currently works because `helpConfig` is a `const` defined before imports resolve, but fragile.

**Fix:** Extract `helpConfig` into its own module (e.g., `src/help-config.ts`).

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

| # | Severity | File | Description |
|---|----------|------|-------------|
| 1 | Critical | `main.test.ts:237,260` | Signal handler tests spy on `.on` instead of `.once` — false negatives |
| 2 | Critical | `cli-help.test.ts:83-84`, `cli-output.test.ts:68-69` | Tests assert flags that don't exist in the CLI |
| 3 | Important | `details.ts:83-85` | `process.exit(1)` called directly, bypassing centralized error handler |
| 4 | Important | `helpers.ts:25-26` | Naive shell string quoting is fragile |
| 5 | Important | `search.test.ts:97,103` | `'mid-senior'` is not a valid `ExperienceLevel` value |
| 6 | Important | `program.ts` / command files | Circular import of `helpConfig` |
| 7 | Quality | `formatter.test.ts:36-62` | Global registry mutated without guaranteed cleanup |
| 8 | Quality | `details.test.ts:224-228` | Weak assertion on empty rawHtml output |

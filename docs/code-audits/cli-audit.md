# `jobby-cli` Architecture Audit

> **Date:** 2026-02-21
> **Scope:** All non-TUI source files in `packages/jobby-cli/src/` and all test files outside `src/ui/`
> **TUI Note:** The `src/ui/` directory is explicitly excluded from this audit. TUI test coverage is deliberately deferred — the TUI is not yet in a final state, and tests will be added once the application stabilizes.

---

## 1. Executive Summary

The `jobby-cli` package is a well-organized Commander.js CLI that wraps `jobby-client`. The overall architecture is clean, the formatter registry pattern is sound, and the test coverage is extensive and well-structured. However, the audit found **one confirmed bug** that causes the `--no-color` flag to silently fail to suppress syntax highlighting on data output, a circular dependency between `program.ts` and the command modules, stale integration test assertions that test for options that do not exist in the current implementation, and several medium and low severity code quality issues.

The codebase does significantly more right than wrong. The issues identified are actionable and bounded.

---

## 2. What the Codebase Does Well

**Formatter registry pattern.** `src/formatters/formatter.ts` implements a clean registry with an explicit `registerDefaultFormatters()` call at startup. Formatters are testable in isolation, the default registry is module-level state that is separate from the `createFormatterRegistry()` factory, and the `OutputFormatter` interface is minimal and correctly async. This is a good OCP implementation.

**Signal and error handling in `main.ts`.** The entry point uses `process.once` (not `process.on`) for SIGINT, SIGTERM, `unhandledRejection`, and `uncaughtException`, preventing repeated handler registration on each `main()` call. The try/catch in `main()` correctly distinguishes Commander errors, `JobbyError` subclasses, and unexpected errors, routing each to the appropriate exit code. The `formatErrorMessage` error hierarchy dispatch in `src/utils/errors.ts` is clean and well-typed.

**Stdin piping support.** `src/utils/stream.ts` handles the timeout-with-cleanup pattern correctly, removes all listeners in every resolution path (timeout, end, error), and the 100ms default timeout is appropriate for the use case.

**`parseNumber` validation.** The utility correctly rejects floats, negative numbers, non-numeric strings, and empty strings with distinct error messages. This is tested thoroughly.

**Commander option configuration.** The use of `new Option(...)` with `.choices([...])` and `.default(...)` rather than raw `.option()` strings for constrained choices is correct and idiomatic. The help colorization system using `configureHelp(helpConfig)` and `configureOutput` for `--no-color` suppression on Commander output is well-designed.

**`fetchDetailsInBatches`.** The batch+delay approach with `Promise.allSettled` correctly handles partial failures, avoids crashing on missing IDs, and is fully controlled through dependency injection (`fetchFn`, `onWarn`, `batchSize`, `delayMs`), making it genuinely testable.

**Test quality (unit tests).** Unit tests across formatters, utilities, and command handlers are behavioral rather than structural. They test real outputs, not internal implementation details. The `createJobbyMock()` helper is reused consistently and keeps mocking patterns DRY. JSDoc test-intent comments on each describe block are excellent.

**Documentation.** `docs/commands.md` and `docs/output-formats.md` are detailed and accurate (with exceptions noted below).

---

## 3. Architecture Issues

### 3.1 Critical

#### BUG: `--no-color` Flag Does Not Suppress Syntax Highlighting on Data Output

**Severity:** Critical — Functional regression visible to all users.

**Files:** `src/commands/search.ts:120-123`, `src/commands/details.ts:79-86`, `src/utils/output.ts:45`, `src/types.ts:27`

Commander's `--no-color` negatable option resolves to `opts.color = false` (Commander internally names negatable booleans by their positive form). The command action handlers spread `opts` directly into `queryForJobs` / `queryForJobDetails`, which then pass the object to `outputResult`. The `outputResult` function checks `opts.noColor`, not `opts.color`.

Because `noColor` is never set by Commander, `opts.noColor` is always `undefined` in real CLI execution, meaning syntax highlighting is **never suppressed** by `--no-color` on data output.

The `configureOutput` path does work (ANSI is suppressed on Commander's own help/error text), but actual job results output via `cli-highlight` is always highlighted regardless of `--no-color`.

**Why tests do not catch this:** Unit tests pass `noColor: true` directly, bypassing Commander's option translation. Integration tests only check help output and Commander error messages, not data output.

**Fix:** Map `opts.color` to `noColor` in the action handler before forwarding:

```typescript
// src/commands/search.ts, inside action handler
await queryForJobs({ ...opts, keyword, noColor: opts.noColor ?? (opts.color === false) });
```

Apply the same fix in `src/commands/details.ts`.

---

### 3.2 Medium

#### Circular Import: `program.ts` and Command Modules

**Files:** `src/program.ts:5-7`, `src/commands/search.ts:19`, `src/commands/details.ts:9`, `src/commands/ui.ts:5`

`program.ts` imports from all three command modules. Each command module imports `helpConfig` back from `program.ts`. This creates a circular dependency graph that currently works due to ESM live bindings but is fragile.

**Fix:** Extract `helpConfig` to `src/utils/help-config.ts`. Both `program.ts` and command modules import from there.

#### `details` Command Has Direct `process.exit(1)` That Bypasses Main Error Handler

**File:** `src/commands/details.ts:82-85`

The details command action handler has a raw `console.error` + `process.exit(1)` for the missing-URL case. This bypasses the unified error handling in `main.ts`.

**Fix:** Throw a `ValidationError` instead and let `main.ts` catch it.

#### `outputResult` Uses Synchronous `writeFileSync` in an Async Function

**File:** `src/utils/output.ts:38-40`

The function is declared `async` but uses synchronous `writeFileSync` for the file output path. For large formatted outputs, this blocks the event loop.

**Fix:** Replace with `fs.promises.writeFile`.

#### `package.json` `exports` Field Points to CLI Entry Point Instead of Library Barrel

**File:** `packages/jobby-cli/package.json:11-16`

The `exports` field points to `dist/main.js` which immediately executes `void main()` on import. It should point to `dist/index.js`.

**Fix:** Change exports to `dist/index.js` / `dist/index.d.ts`.

---

### 3.3 Low

#### `JobDetailsQueryCliArgs` — Double Resolution of URL/ID

**File:** `src/types.ts:49-53`, `src/commands/details.ts:80`

The action handler resolves `value` from opts/args/stdin, then passes both `value` and the full `opts` to `queryForJobDetails`, which re-reads `args.url` and `args.id`. This double-resolution is unnecessary.

**Fix:** Simplify `queryForJobDetails` to receive only the resolved value.

#### `program.ts` Uses `createRequire` for `package.json`

**File:** `src/program.ts:4,18-19`

Node 22 supports JSON import assertions natively. `createRequire` is a workaround from an older ESM era.

#### `swapScreenBuffer` / `restoreScreenBuffer` Are Exported

**File:** `src/commands/ui.ts:9-12`

These are implementation details that should not be exported.

#### `yamlFormatter` Ignores `pretty` Option Silently

**File:** `src/formatters/yaml-formatter.ts:6`

A user passing `--format yaml --pretty` gets the same output as without `--pretty`. Should be documented.

---

## 4. Code Quality Issues

- **`search.test.ts` uses invalid `'mid-senior'` ExperienceLevel value** (`src/commands/search.test.ts:97,103`). Replace with a valid value like `'associate'`.
- **Redundant duplicate test cases in `parse.test.ts`** — identical assertions across describe blocks for zero parsing, negative numbers, and empty strings.
- **`formatter.test.ts` mutates shared default registry** without guaranteed cleanup via `afterEach`.
- **`details.ts` `isUrl` helper is overly permissive** — accepts `ftp://`, `data:`, etc. Should narrow to `http:` and `https:`.
- **`helpConfig` is exported from `index.ts`** without documented reason for external consumers to use it.

---

## 5. Test Analysis

### 5.1 Tests That Are False Positives or Stale

| Test | File | Issue |
|------|------|-------|
| `--easy-apply-only` / `--under-10-applicants` assertions | `cli-help.test.ts:83-84`, `cli-output.test.ts:68-69` | Options not implemented in CLI |
| `[url]` argument assertion | `cli-help.test.ts:135` | Passes incidentally (`[url]` is substring of `[id-or-url]`) |
| Signal handler spies on `process.on` | `main.test.ts:237,260` | Code uses `process.once`, spy should target `.once` |
| `details.test.ts` empty rawHtml assertion | `details.test.ts:224-228` | Only checks `consoleSpy` was called, not what with |

### 5.2 Important Untested Code Paths

- `--no-color` on actual data output (search/details results)
- `--file` path errors (permission denied, directory not found) end-to-end
- `details` command with piped stdin end-to-end
- `queryForJobs` when response is `null` and `--detailed` is set (potential runtime exception at `response.results.length`)
- `createUiCommand` TTY guard (non-TUI logic, should be covered)
- `fetchDetailsInBatches` with `delayMs > 0` (rate-limiting behavior untested)

### 5.3 TUI Testing — Deferred

TUI (`src/ui/`) test coverage is deliberately deferred. The TUI is not yet in a final state, and comprehensive tests will be added once the application stabilizes. This is tracked separately.

---

## 6. SOLID Principle Violations

**Single Responsibility — `queryForJobDetails` does too much.** Resolves URL vs. ID, constructs a client, calls the appropriate method, handles `rawHtml` branching, and calls `outputResult`. Five concerns in one function.

**Dependency Inversion — Commands directly instantiate `JobbyClient`.** Both `queryForJobs` and `queryForJobDetails` call `new JobbyClient(...)` directly. Compare with `fetchDetailsInBatches` which correctly uses dependency injection via `fetchFn`.

---

## 7. Recommendations with Priority

### Priority 1 — Fix Immediately (Bugs)

1. **Fix `--no-color` flag** not suppressing data output highlighting
2. **Remove or implement** `--easy-apply-only` and `--under-10-applicants` (update tests and docs)
3. **Fix `[url]` vs `[id-or-url]`** integration test assertion

### Priority 2 — Address Before Next Release

4. **Eliminate circular import** — extract `helpConfig` to `src/utils/help-config.ts`
5. **Replace `process.exit(1)`** in details handler with thrown `ValidationError`
6. **Fix `process.on` spy** in signal handler tests to spy on `process.once`
7. **Fix `exports` field** in `package.json` to point to `dist/index.js`

### Priority 3 — Code Quality

8. Replace `writeFileSync` with `fs.promises.writeFile` in `outputResult`
9. Narrow `isUrl` to `http:` and `https:` schemes only
10. Remove `export` from `swapScreenBuffer`/`restoreScreenBuffer`
11. Remove `helpConfig` from `index.ts` exports
12. Fix invalid `'mid-senior'` value in `search.test.ts`
13. Deduplicate redundant test cases in `parse.test.ts`
14. Improve `formatter.test.ts` test isolation

### Priority 4 — Documentation

15. Update `docs/commands.md` to match actual implementation
16. Add JSDoc note to `yamlFormatter` about `--pretty` having no effect
17. Add integration test coverage for `--no-color` on data output

---

*End of audit. TUI (`src/ui/`) testing is deliberately deferred.*

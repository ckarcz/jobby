# Client Package Code Review Notes

> **Date:** 2026-02-21
> **Scope:** `packages/jobby-client/` — Core TypeScript client library
> **Reviewer:** Code Review Agent

---

## Critical Issues

### 1. `NetworkError` marks all HTTP errors as retryable, including permanent failures — **FIXED**

**Confidence: 95**
**File:** `packages/jobby-client/src/types/errors.ts`, line 68
**Status: FIXED** — Added optional `status` param to `NetworkError` constructor. `retryable` is now `status === undefined || status >= 500` (transient failures and unknown errors are retryable, 4xx permanent failures are not). Updated `http.ts` to pass status. Added tests. Fix matched the recommended approach.

---

## Important Issues

### 2. `extractJobIdFromUrl` regex is fragile — matches any trailing number, not specifically a LinkedIn job ID — **FIXED**

**Confidence: 85**
**File:** `packages/jobby-client/src/utils/url.ts`, line 37
**Status: FIXED** — Regex anchored to the expected `/view/` path structure: `/\/view\/.*?(\d+)\/?$/`. This ensures only LinkedIn job view URLs are matched.

### 3. `resolveConfig` is called per-query, re-reads env vars each time — **FIXED**

**Confidence: 82**
**File:** `packages/jobby-client/src/queries/jobs-query.ts`, line 56; `packages/jobby-client/src/queries/job-details-query.ts`, line 39
**Status: FIXED** — Config is now resolved once at `JobbyClient` construction time and passed as `ResolvedClientConfig` through the entire call chain. Redundant `resolveConfig()` calls in all query functions have been removed.

### 4. `parseSalaryText` extracts all numbers without validating count — **MOOT**

**Confidence: 83**
**Status: MOOT** — The `parseSalaryText` function has been removed from the codebase. Salary parsing is no longer done via this approach.

### 5. `mergeJobDetailsData` uses `any` cast — fragile with nullable fields — **FIXED**

**Confidence: 80**
**File:** `packages/jobby-client/src/queries/job-details-query.ts`, lines 210-219
**Status: FIXED** — Added `value !== null` check alongside the existing `value !== undefined` check. Updated JSDoc to document that both `undefined` and `null` fall through to fallback.

The `value !== undefined` check means `null` primary values will be overwritten by fallback values. Currently safe but fragile for future changes.

**Fix:** Document this limitation in JSDoc.

---

## Test Issues

### 6. `logging.test.ts` asserts on `logger.http` and `logger.silly` — methods not in the `Logger` interface

**Confidence: 95**
**File:** `packages/jobby-client/src/logging.test.ts`, lines 52-55

The public `Logger` interface only declares: `error`, `warn`, `info`, `verbose`, `debug`. The test verifies Winston internals rather than the library's own contract.

**Fix:** Remove the `logger.http` and `logger.silly` assertions.

### 7. `logging.test.ts` — `onLog` callback tests use flaky 200ms `setTimeout` wait

**Confidence: 88**
**File:** `packages/jobby-client/src/logging.test.ts`, lines 100-106

**Fix:** Use `vi.waitFor()` with a polling loop instead of a fixed timeout.

### 8. Integration search tests bypass the client — only validate the fixture server

**Confidence: 90**
**File:** `packages/jobby-client/tests/integration/client.test.ts`, lines 129-150

Both search integration tests call `axios.get` directly and assert on raw HTML content. They do not invoke any parsing logic.

**Fix:** Add a direct unit test for `executeJobsQuery` using the fixture HTML.

### 9. `test.log` artifact file present in source tree — **FIXED**

**Confidence: 92**
**File:** `packages/jobby-client/test.log`
**Status: FIXED** — Deleted `test.log` artifact from the source tree.

---

## Minor Issues

### 10. `zodEnumFromMap` has no guard against empty maps — **FIXED**

**Confidence: 80**
**File:** `packages/jobby-client/src/types/params-schemas.ts`, lines 16-19
**Status: FIXED** — Added a guard that throws a descriptive error if the map has zero keys. Added unit tests in `params-schemas.test.ts`.

### 11. `validatePagination` accepts `take: 0` — wastes a network request — **FIXED**

**Confidence: 80**
**File:** `packages/jobby-client/src/queries/jobs-query.ts`, lines 172-177
**Status: FIXED** — Validation now checks `take < 1` instead of `take < 0`, rejecting `take: 0`.

---

## Summary Table

| # | Severity | File | Issue | Confidence | Status |
|---|----------|------|-------|------------|--------|
| 1 | Critical | `types/errors.ts:68` | `NetworkError.retryable=true` causes 404/401/403 to be retried | 95 | **Fixed** |
| 2 | Important | `utils/url.ts:37` | `extractJobIdFromUrl` regex fragile — no path anchor | 85 | **Fixed** |
| 3 | Important | `queries/jobs-query.ts:56` | `resolveConfig` called per-query, re-reads env vars each time | 82 | **Fixed** |
| 4 | Important | `queries/job-details-query.ts:453` | `parseSalaryText` silently ignores 3rd+ numbers | 83 | **Moot** (removed) |
| 5 | Important | `queries/job-details-query.ts:210` | `mergeJobDetailsData` skips `null` primary values | 80 | **Fixed** (JSDoc) |
| 6 | Test | `logging.test.ts:52` | Tests assert `logger.http`/`logger.silly` not in `Logger` interface | 95 | **Fixed** (prior round) |
| 7 | Test | `logging.test.ts:100` | `onLog` tests use fixed 200ms wait — flaky pattern | 88 | **Fixed** (prior round) |
| 8 | Test | `tests/integration/client.test.ts:129` | Search integration tests bypass client, only validate fixture server | 90 | Open |
| 9 | Artifact | `test.log` | Log file committed to source — should be gitignored | 92 | **Fixed** |
| 10 | Minor | `types/params-schemas.ts:16` | `zodEnumFromMap` has no guard for empty maps | 80 | **Fixed** |
| 11 | Minor | `queries/jobs-query.ts:172` | `take: 0` allowed; wastes a network request | 80 | **Fixed** |

---

## Post-Audit Commit Review (078d85b, 18c6114, fe732a3)

> **Date:** 2026-02-22
> **Scope:** Review of audit fix commits applied to `packages/jobby-client/`

### Issues Introduced by Audit Fixes

#### 1. `axiosInstance` on `ResolvedClientConfig` — Premature (18c6114) — **FIXED**

- **Status: FIXED** — Removed `axiosInstance` from `ResolvedClientConfig` and `resolveConfig()`. Query functions now call `axios.get()` directly. Test mocks simplified from 12-line factory to 5-line pattern.

#### 2. `job-search-builder.ts` unsafe double cast (18c6114) — **FIXED**

- **Status: FIXED** — Constructor now only accepts `ClientConfig | undefined` (public API). Added `static _fromResolved(config, retryConfig)` factory for internal use by `JobbyClient`. Eliminates the `as unknown as` cast.

#### 3. `config: resolvedConfig` confusing alias (18c6114) — **FIXED**

- **Status: FIXED** — Removed the `config: resolvedConfig` destructuring alias in both query files. Functions now use the `config` parameter directly since the returned config is the same object.

#### 4. `jobs-query.test.ts` misleading test name (078d85b) — **FIXED**

- **Status: FIXED** — Renamed `"0"` test to `'should include geoId "0" as a valid string param'`. Added edge-case tests for empty string and whitespace-only geoId values (both correctly dropped by `appendStringParam` since it trims before checking).

### Changes That Were Good

- Config consolidation (resolve once at construction, pass through) — eliminates redundant `resolveConfig` calls
- `NetworkError` retryability by status code — clean and well-tested
- `extractJobIdFromUrl` regex hardening — correct and simple
- Logging test `vi.waitFor` — replaces flaky `setTimeout(200)` waits
- `appendStringParam` `undefined` check — fixes empty string dropping

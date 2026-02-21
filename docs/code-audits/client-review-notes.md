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

### 2. `extractJobIdFromUrl` regex is fragile — matches any trailing number, not specifically a LinkedIn job ID

**Confidence: 85**
**File:** `packages/jobby-client/src/utils/url.ts`, line 37

The regex `/(\d+)\/?$/` matches the last numeric sequence at the end of the URL path. If a URL ends with a numeric suffix that is not the job ID, the wrong ID is extracted.

**Fix:** Anchor the regex to the expected path structure.

### 3. `resolveConfig` is called per-query, re-reads env vars each time

**Confidence: 82**
**File:** `packages/jobby-client/src/queries/jobs-query.ts`, line 56; `packages/jobby-client/src/queries/job-details-query.ts`, line 39

Both query entry points call `resolveConfig` on every invocation. This means each individual HTTP request gets a different random User-Agent string and re-reads environment variables.

**Fix:** Document this behavior clearly. Consider calling `resolveConfig` once at `JobbyClient` construction time.

### 4. `parseSalaryText` extracts all numbers without validating count

**Confidence: 83**
**File:** `packages/jobby-client/src/queries/job-details-query.ts`, lines 453-463

If the salary string contains more than 2 numbers (e.g., `"$50,000 - $80,000 (as of Q3 2024)"`), the third number (2024) is silently ignored. If the string only contains a year, the function returns a salary object with that number.

**Fix:** Add a basic plausibility check (e.g., numbers must be > 1000 to be considered a salary).

### 5. `mergeJobDetailsData` uses `any` cast — fragile with nullable fields

**Confidence: 80**
**File:** `packages/jobby-client/src/queries/job-details-query.ts`, lines 210-219

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

### 10. `zodEnumFromMap` has no guard against empty maps

**Confidence: 80**
**File:** `packages/jobby-client/src/types/params-schemas.ts`, lines 16-19

### 11. `validatePagination` accepts `take: 0` — wastes a network request

**Confidence: 80**
**File:** `packages/jobby-client/src/queries/jobs-query.ts`, lines 172-177

---

## Summary Table

| # | Severity | File | Issue | Confidence | Status |
|---|----------|------|-------|------------|--------|
| 1 | Critical | `types/errors.ts:68` | `NetworkError.retryable=true` causes 404/401/403 to be retried | 95 | **Fixed** |
| 2 | Important | `utils/url.ts:37` | `extractJobIdFromUrl` regex fragile — no path anchor | 85 | Open |
| 3 | Important | `queries/jobs-query.ts:56` | `resolveConfig` called per-query, re-reads env vars each time | 82 | Open |
| 4 | Important | `queries/job-details-query.ts:453` | `parseSalaryText` silently ignores 3rd+ numbers | 83 | Open |
| 5 | Important | `queries/job-details-query.ts:210` | `mergeJobDetailsData` skips `null` primary values | 80 | Open |
| 6 | Test | `logging.test.ts:52` | Tests assert `logger.http`/`logger.silly` not in `Logger` interface | 95 | Open |
| 7 | Test | `logging.test.ts:100` | `onLog` tests use fixed 200ms wait — flaky pattern | 88 | Open |
| 8 | Test | `tests/integration/client.test.ts:129` | Search integration tests bypass client, only validate fixture server | 90 | Open |
| 9 | Artifact | `test.log` | Log file committed to source — should be gitignored | 92 | **Fixed** |
| 10 | Minor | `types/params-schemas.ts:16` | `zodEnumFromMap` has no guard for empty maps | 80 | Open |
| 11 | Minor | `queries/jobs-query.ts:172` | `take: 0` allowed; wastes a network request | 80 | Open |

# jobby-mcp Code Review Notes

> **Reviewed:** 2026-02-21
> **Scope:** All source and test files under `packages/jobby-mcp/src/`, `package.json`, and docs.
> **Reviewer:** Code Review Agent

---

## Critical Issues

### C1 - Binary entry point never calls `main()` - server never starts (Confidence: 100) — **FIXED**

**Status: FIXED** — Used the alternative approach: created a dedicated `src/bin.ts` that calls `main()`. Updated `package.json` bin to `./dist/bin.js` and start script to `tsx src/bin.ts`. Removed shebang from `server.ts`.

---

### C2 - Unhandled `ZodError` escapes the `get_job_details` tool handler (Confidence: 90) — **FIXED**

**Status: FIXED** — Replaced `parse()` with `safeParse()` in both tool handlers in `server.ts`. Returns `{ isError: true }` on validation failure. Used `safeParse` approach rather than try/catch, which is cleaner. Also updated `get_job_details` description to state the required-identifier constraint.

---

## Important Issues

### I1 - Dead code in `handleGetJobDetails` — the "neither field provided" branch is unreachable (Confidence: 88) — **FIXED**

**Status: FIXED** — Removed the unreachable "neither field" branch in `handlers.ts`. Fix matched the recommended approach.

### I2 - `setup.md` documents the wrong timeout value (Confidence: 95) — **FIXED**

**Status: FIXED** — Changed docs timeout from "10 seconds" to "30 seconds". Fix matched the recommended approach.

### I3 - `jobUrl` accepts any string — no URL format validation (Confidence: 85) — **FIXED**

**Status: FIXED** — Used `z.url()` for `jobUrl`. Updated `schemas.test.ts`.

### I4 - Pagination fields accept negative numbers (Confidence: 82) — **FIXED**

**Status: FIXED** — Added `.int().nonnegative()` to `start`, `skip`, `take`. Updated `schemas.test.ts`.

---

## Test Issues

### T1 - `server.test.ts` mock `JobbyError` has swapped constructor argument order (Confidence: 85) — **FIXED**

**Status: FIXED** — Fixed mock `JobbyError` constructor order from `(message, code)` to `(code, message)`. Fix matched the recommended approach.

### T2 - Test enshrines the broken exception-propagation behavior as expected (Confidence: 85) — **FIXED**

**Status: FIXED** — Changed throw tests to expect `isError` responses, consistent with the `safeParse` fix. Fix matched the recommended approach.

### T3 - `handlers.test.ts` tests the dead code path in `handleGetJobDetails` (Confidence: 85) — **FIXED**

**Status: FIXED** — The dead code branch was removed (see I1), so the test for it is no longer needed. The handler now uses explicit `if`/`else if` guards for `jobUrl` and `jobId`.

### T4 - Version test hardcodes `"1.0.0"` instead of reading from `package.json` (Confidence: 80) — **FIXED**

**Status: FIXED** — Read version dynamically from `package.json` in the test. Fix matched the recommended approach.

---

## Summary Table

| ID | Severity | Confidence | File | Description | Status |
|----|----------|------------|------|-------------|--------|
| C1 | Critical | 100 | `server.ts`, `package.json` | `main()` is never called — server never starts as a binary | **Fixed** |
| C2 | Critical | 90 | `server.ts:50-53` | `ZodError` from refine check propagates unhandled from `get_job_details` handler | **Fixed** |
| I1 | Important | 88 | `handlers.ts:90-95` | Dead code branch — "neither field" path is unreachable at runtime | **Fixed** |
| I2 | Important | 95 | `docs/setup.md:89` | Timeout documented as 10s but code uses 30s | **Fixed** |
| I3 | Important | 85 | `schemas.ts:50` | `jobUrl` accepts any string — no URL format validation | **Fixed** |
| I4 | Important | 82 | `schemas.ts:36-38` | Pagination fields accept negative numbers | **Fixed** |
| T1 | Test | 85 | `server.test.ts:49-55` | Mock `JobbyError` has swapped constructor arg order vs. real class | **Fixed** |
| T2 | Test | 85 | `server.test.ts:264-268` | Test enshrines unhandled-exception behavior as expected | **Fixed** |
| T3 | Test | 85 | `handlers.test.ts:278-287` | Tests for dead code path give false assurance of error handling | **Fixed** |
| T4 | Test | 80 | `server.test.ts:107` | Version test hardcodes `"1.0.0"` instead of reading dynamically | **Fixed** |

---

## Post-Audit Commit Review (078d85b, 18c6114)

### All Changes Were Pragmatic

The MCP package changes across both audit fix commits were clean and well-executed:

- **`bin.ts` entry point** — Standard pattern, mirrors CLI split
- **`safeParse` for MCP protocol compliance** — Critical fix; tools must return `{ isError: true }` not throw
- **`zod` moved from peer to direct dependency** — Real deployment bug fix for standalone binaries
- **Schema validation tightening** (`.min(1)`, `.int().nonnegative()`, `.url()`) — Correct boundary validation
- **DI seam via `createServer(client?)` parameter** — Clean, enables testing, preserves default behavior
- **Handler parameter injection** — Handlers became pure functions of inputs; test mocking simplified
- **Enum values in tool descriptions** — Practical improvement for LLM tool call accuracy
- **Mock constructor order fix** — Real test bug (`code, message` was swapped)
- **Version in startup log** — Minor but standard server practice

### No Issues Found

The MCP package was the cleanest of the three packages across these commits. Every change was pragmatic and improved the code without adding unnecessary complexity.

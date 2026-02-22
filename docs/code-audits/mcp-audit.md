# MCP Server Audit: jobby-mcp

> **Date:** 2026-02-21
> **Scope:** `packages/jobby-mcp/` — MCP server exposing LinkedIn job search as tools for AI assistants
> **Methodology:** Full source code review of all source and test files, cross-referenced against the MCP TypeScript SDK (v1.26.0), Zod 3.x documentation, and existing project conventions.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What the Codebase Does Well](#2-what-the-codebase-does-well)
3. [Critical Issues](#3-critical-issues)
4. [Medium Issues](#4-medium-issues)
5. [Code Quality Issues](#5-code-quality-issues)
6. [Test Analysis](#6-test-analysis)
7. [SOLID Principle Violations](#7-solid-principle-violations)
8. [MCP-Specific Recommendations](#8-mcp-specific-recommendations)
9. [Summary Table](#9-summary-table)

---

## 1. Executive Summary

The `jobby-mcp` package is a compact, well-structured MCP server. At four source files and roughly 170 lines of non-test code it is appropriately minimal for its scope. The package correctly uses the MCP TypeScript SDK's `McpServer` high-level API, applies Zod for input schema declaration, cleanly separates handlers from server wiring, and documents its tools thoroughly.

However, a critical runtime bug means **the server never actually starts** when invoked via `npm start` or `npx jobby-mcp`. Beyond that, there are medium-severity issues around schema integrity, dependency classification, and a test mock that silently deviates from the real class signature. All issues are fixable with small, targeted changes.

**Key findings:**

- **1 critical issue** — `main()` is never called; the server silently exits without connecting
- **1 critical issue** — `get_job_details` schema split: the MCP SDK is given the permissive base schema; the handler validates with the refined schema; the AI model sees an inaccurate tool description and uncaught `ZodError` can be thrown
- **3 medium issues** — module-level singleton client blocks testability and retry config; `zod` classified as `peerDependency` rather than `dependency`; documented timeout is wrong
- **3 low issues** — no pagination boundary validation; empty strings accepted for keyword/location; `jobUrl` not URL-validated
- **2 test issues** — inverted constructor args in `server.test.ts` mock; no integration tests

---

## 2. What the Codebase Does Well

### 2.1 Clean Three-Layer Separation

The package is organized into three distinct responsibilities with no coupling between them:

- `schemas.ts` — Zod schema definitions only; no handler logic
- `handlers.ts` — Business logic only; no MCP SDK imports
- `server.ts` — MCP wiring only; delegates entirely to handlers

This layering means schemas can be tested without a server, handlers can be tested without MCP SDK mocks, and the server wiring can be tested without real network calls. Each test file maps cleanly onto one layer.

### 2.2 Correct High-Level MCP SDK API Usage

The server uses `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` rather than the lower-level `Server` class. `McpServer` handles protocol-level concerns (capability negotiation, tool call dispatching, error serialization) automatically. `registerTool()` is the correct API for declaring tools with schemas and handlers in a single call.

### 2.3 Double-Parse Validation Pattern

`server.ts:38-40` and `server.ts:50-52` follow the correct MCP pattern of re-validating input inside the tool handler. Even if the MCP SDK's runtime coerces values, the handler always receives properly typed, schema-validated arguments.

### 2.4 Zod Enums Sourced from Client's Canonical Constants

`schemas.ts:3-9` imports `JOB_TYPE_CHOICES`, `EXPERIENCE_LEVEL_CHOICES`, and the other choices arrays directly from `jobby-client` rather than duplicating the values. This is the correct Single Source of Truth pattern.

### 2.5 `handleError` Covers the Full Error Hierarchy

`handlers.ts:26-34` handles all three error categories in the correct priority order:
1. `JobbyError` (and all subclasses via `instanceof`) — formats with `[code] message`
2. Standard `Error` — uses `.message`
3. Everything else — coerces with `String()`

### 2.6 `JobDetailsInputSchema` Refine Makes Constraint Visible at Schema Level

`schemas.ts:62-65` uses Zod's `.refine()` to express the "at least one identifier required" constraint at the schema layer rather than in handler logic. This keeps the handler clean and generates a meaningful validation error message.

### 2.7 JSDoc Coverage on All Exports

All exported functions and schema exports carry JSDoc comments explaining their purpose, cross-references to related symbols via `@link`, and notes on precedence behavior.

### 2.8 Version Read Dynamically from `package.json`

`server.ts:9-10` reads the package version using `createRequire` rather than hardcoding it.

---

## 3. Critical Issues

### 3.1 `main()` Is Never Called — Server Silently Exits — **FIXED**

**Files:** `src/index.ts:1`, `package.json:10-12`, `package.json:41`
**Severity:** Critical (Runtime — server never starts)
**Status: FIXED** — Created `src/bin.ts` as a dedicated entry point that calls `main()`. Updated `package.json` bin to `./dist/bin.js` and start script to `tsx src/bin.ts`. Removed shebang from `server.ts`. Fix matched the recommended approach.

---

### 3.2 `get_job_details` Registered with Permissive Schema, Validated with Refined Schema — **FIXED**

**File:** `src/server.ts:44-53`
**Severity:** Critical (MCP Protocol Correctness)
**Status: FIXED** — Both parts addressed. Replaced `parse()` with `safeParse()` in both tool handlers in `server.ts`. Returns `{ isError: true }` on validation failure instead of throwing `ZodError`. Updated `get_job_details` description to state the required-identifier constraint. Fix matched the recommended approach.

---

## 4. Medium Issues

### 4.1 Module-Level Singleton Client Blocks Testability and Configuration — **FIXED**

**File:** `src/handlers.ts:11`
**Severity:** Medium
**Status: FIXED** — Removed the module-level singleton client from `handlers.ts`. Added optional `client?: JobbyClient` parameter to `createServer()`, defaulting to `new JobbyClient({ timeout: 30_000 })`. Client is passed to both handler functions as a parameter. Tests now inject mock clients directly instead of mocking the module-level import.

### 4.2 `zod` Classified as `peerDependency` for a Binary Server — **FIXED**

**File:** `package.json:47-49`
**Severity:** Medium (Deployment)
**Status: FIXED** — Moved zod from peerDependencies to dependencies in `package.json`. Fix matched the recommended approach.

### 4.3 Documentation States the Wrong Default Timeout — **FIXED**

**Files:** `src/handlers.ts:11`, `docs/setup.md:89`
**Severity:** Medium
**Status: FIXED** — Changed docs timeout from "10 seconds" to "30 seconds". Fix matched the recommended approach.

---

## 5. Code Quality Issues

### 5.1 `ToolResponse` Type Is Unexported and Duplicated — **FIXED**

**Files:** `src/handlers.ts:14-17`, `src/server.test.ts:5-8`
**Severity:** Low
**Status: FIXED** — Exported `ToolResponse` type from `handlers.ts`. Fix matched the recommended approach.

### 5.2 No Pagination Boundary Validation — **FIXED**

**File:** `src/schemas.ts:36-38`
**Severity:** Low
**Status: FIXED** — Added `.int().nonnegative()` to `start`, `skip`, `take`. Updated `schemas.test.ts`. Slightly different from recommendation (used `.nonnegative()` instead of `.min(0)`, did not add `.max(100)` to `take`).

### 5.3 Empty Strings Accepted for `keyword` and `location` — **FIXED**

**File:** `src/schemas.ts:18-19`
**Severity:** Low
**Status: FIXED** — Added `.min(1)` to `keyword` and `location`. Fix matched the recommended approach.

### 5.4 `jobUrl` Not Validated as a URL — **FIXED**

**File:** `src/schemas.ts:50`
**Severity:** Low
**Status: FIXED** — Used `z.url()` for `jobUrl`. Slightly different from recommendation (used `z.url()` instead of `z.string().url()`).

### 5.5 No Retry Configuration on the Client

**File:** `src/handlers.ts:11`
**Severity:** Low

No `retry` option is passed, defaulting to `maxRetries: 0`. LinkedIn rate limiting is common.

**Fix:** Add retry config (alongside 4.1).

---

## 6. Test Analysis

### 6.1 Overall Coverage Assessment

The test suite is comprehensive for a package of this size. Three test files cover 113 test cases:
- `schemas.test.ts` — 59 cases (all enum validations, pagination, refine constraint)
- `handlers.test.ts` — 38 cases (parameter forwarding, error formatting, all branches)
- `server.test.ts` — 16 cases (registration, dispatch, schema validation, startup)

### 6.2 False Positive: `server.test.ts` Mock Has Inverted `JobbyError` Constructor — **FIXED**

**File:** `src/server.test.ts:49-55, 272-273`
**Severity:** Medium
**Status: FIXED** — Fixed mock `JobbyError` constructor order from `(message, code)` to `(code, message)`. Fix corrected the argument order rather than switching to `importOriginal` pattern.

### 6.3 `ZodError` Thrown Rather Than Returned as `isError` Response — **FIXED**

**File:** `src/server.test.ts:264-268`
**Severity:** Low
**Status: FIXED** — Changed throw tests to expect `isError` responses, consistent with the `safeParse` fix in 3.2. Fix matched the recommended approach.

### 6.4 Version Test Hardcodes `"1.0.0"` — **FIXED**

**File:** `src/server.test.ts:107`
**Severity:** Low
**Status: FIXED** — Read version dynamically from `package.json` in the test. Fix matched the recommended approach.

### 6.5 No Integration Tests

**File:** `vitest.config.ts:5-12`
**Severity:** Low

The config declares an integration project but no integration test files exist. An integration test starting the server over stdio would have caught 3.1 immediately.

---

## 7. SOLID Principle Violations

### 7.1 Dependency Inversion — Handlers Depend on Concrete Client Class — **FIXED**

**File:** `src/handlers.ts:1, 11`
**Severity:** Medium
**Status: FIXED** — Resolved by 4.1. Handlers now receive `JobbyClient` as a parameter via dependency injection from `createServer()`.

### 7.2 Single Responsibility — `server.ts` Reads Package Metadata

**File:** `src/server.ts:9-10`
**Severity:** Informational

Minor SRP concern — could extract version reading to a utility.

---

## 8. MCP-Specific Recommendations

### 8.1 Tool Descriptions Should Enumerate Valid Enum Values

The current `search_jobs` description is generic. The AI benefits from seeing available filters and valid values inline in the description.

### 8.2 `get_job_details` Description Should State the Required-Identifier Constraint — **FIXED**

Must state that at least one of `jobUrl` or `jobId` is required, and that `jobUrl` takes precedence. Directly related to 3.2.
**Status: FIXED** — Updated `get_job_details` description to state the constraint.

### 8.3 Add a Root-Level `start:mcp` Orchestration Script

For parity with CLI convenience scripts in root `package.json`.

### 8.4 Include Version in Startup Log Message

`server.ts:69` should log `Jobby MCP server v${version} started.` for diagnostics.

---

## 9. Summary Table

| # | Issue | Severity | Category | Status |
|---|---|---|---|---|
| 3.1 | `main()` is never called — server silently exits | Critical | Runtime | **Fixed** |
| 3.2 | `get_job_details` schema/handler mismatch; ZodError escapes | Critical | MCP Protocol | **Fixed** |
| 4.1 | Module-level singleton client; no DI, no retry | Medium | Architecture | **Fixed** |
| 4.2 | `zod` as `peerDependency` — fails on global install | Medium | Deployment | **Fixed** |
| 4.3 | `setup.md` timeout wrong (says 10s, actual 30s) | Medium | Documentation | **Fixed** |
| 5.1 | `ToolResponse` unexported; duplicated with weaker types | Low | Code Quality | **Fixed** |
| 5.2 | Pagination accepts negatives and non-integers | Low | Validation | **Fixed** |
| 5.3 | Empty string accepted for keyword/location | Low | Validation | **Fixed** |
| 5.4 | `jobUrl` not validated as a URL | Low | Validation | **Fixed** |
| 5.5 | No retry configuration | Low | Resilience | Open |
| 6.2 | Mock `JobbyError` has inverted constructor args | Medium | Test Fidelity | **Fixed** |
| 6.3 | Test enshrines ZodError escape as expected behavior | Low | MCP Protocol | **Fixed** |
| 6.4 | Version test hardcodes `"1.0.0"` | Low | Test Quality | **Fixed** |
| 6.5 | No integration tests | Low | Testing | Open |
| 7.1 | Handlers depend on concrete `JobbyClient` | Medium | SOLID | **Fixed** |
| 8.1 | Tool descriptions should enumerate enum values | Recommendation | MCP UX | **Fixed** |
| 8.2 | `get_job_details` description needs constraint note | Recommendation | MCP UX | **Fixed** |
| 8.3 | Missing `start:mcp` root script | Recommendation | DX | Open |
| 8.4 | Startup log should include version | Recommendation | Observability | **Fixed** |

### Priority Recommendations

**P0 — Fix before any use (server non-functional):**
1. ~~Create `src/bin.ts` calling `main()`, update `package.json` (3.1)~~ **DONE**

**P1 — Fix before first real-world use (protocol correctness):**
2. ~~Update `get_job_details` description; use `safeParse` in handler (3.2)~~ **DONE**
3. ~~Move `zod` to `dependencies` (4.2)~~ **DONE**

**P2 — Fix for robustness:**
4. ~~Fix `server.test.ts` mock constructor arg order (6.2)~~ **DONE**
5. ~~Inject client as dependency (4.1, 7.1)~~ **DONE** — Add retry config (5.5) still open
6. ~~Add `.int().nonnegative()` to pagination fields (5.2)~~ **DONE**
7. ~~Add `.min(1)` to keyword/location (5.3)~~ **DONE**
8. ~~Add `.url()` to jobUrl (5.4)~~ **DONE**
9. ~~Update ZodError test to assert graceful response (6.3)~~ **DONE**
10. ~~Fix version test to read dynamically (6.4)~~ **DONE**

**P3 — Polish:**
11. ~~Correct `setup.md` timeout documentation (4.3)~~ **DONE**
12. ~~Export `ToolResponse`; remove duplicate (5.1)~~ **DONE**
13. ~~Improve `get_job_details` description (8.2)~~ **DONE** — ~~Improve tool descriptions for enum values (8.1)~~ **DONE**
14. Add `start:mcp` to root `package.json` (8.3)
15. ~~Add version to startup log (8.4)~~ **DONE**

---

## Additional Fixes (Not Specifically Audited)

The following fixes were made during the remediation pass but were not called out as standalone audit items:

- **Removed unreachable "neither field" branch** in `handlers.ts` — dead code that was guarded by the schema refine (related to I1 in review notes).
- **Used destructuring in `handleSearchJobs`** to avoid index-signature issues in TypeScript.
- **Added explicit `else if` guard for `jobId`** in `handleGetJobDetails` to avoid non-null assertion.

---

*Report generated from analysis of all source files in `packages/jobby-mcp/src/`, the MCP TypeScript SDK (v1.26.0), Zod 3.x documentation, and `packages/jobby-client/` type and error definitions.*

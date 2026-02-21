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

### 3.1 `main()` Is Never Called — Server Silently Exits

**Files:** `src/index.ts:1`, `package.json:10-12`, `package.json:41`
**Severity:** Critical (Runtime — server never starts)

`index.ts` re-exports `createServer` and `main` but never invokes either:

```typescript
// src/index.ts — current state
export { createServer, main } from './server.js';
```

The `start` script (`tsx src/index.ts`) loads this module, re-exports two functions, and exits. The MCP server never connects to stdio transport. The `bin` entry in `package.json` points to `dist/server.js` which also only exports functions. Running `npx jobby-mcp` also silently starts and exits.

**Fix:** Create a dedicated bin entry file:

```typescript
// src/bin.ts (new file)
#!/usr/bin/env node
import { main } from './server.js';

await main();
```

Update `package.json`:

```json
{
  "bin": { "jobby-mcp": "./dist/bin.js" },
  "scripts": { "start": "tsx src/bin.ts" }
}
```

---

### 3.2 `get_job_details` Registered with Permissive Schema, Validated with Refined Schema

**File:** `src/server.ts:44-53`
**Severity:** Critical (MCP Protocol Correctness)

The tool is registered with `JobDetailsBaseSchema.shape` (which accepts an empty object) but the handler validates with `JobDetailsInputSchema.parse()` (which rejects an empty object via `.refine()`):

```typescript
server.registerTool(
  'get_job_details',
  {
    description: '...',
    inputSchema: JobDetailsBaseSchema.shape,  // accepts {} — no constraint visible to AI
  },
  async (rawArgs) => {
    const args = JobDetailsInputSchema.parse(rawArgs); // throws ZodError for {}
    return handleGetJobDetails(args);
  }
);
```

**Problem 1:** The AI sees a schema where both fields are optional, with no indication that at least one must be supplied.

**Problem 2:** When the AI passes neither field, `ZodError` escapes the handler rather than returning a graceful `{ isError: true }` response — a protocol violation.

**Fix (both parts):**

Part A: Update the description to state the constraint.

Part B: Use `safeParse` in the handler:

```typescript
async (rawArgs) => {
  const parseResult = JobDetailsInputSchema.safeParse(rawArgs);
  if (!parseResult.success) {
    const message = parseResult.error.issues[0]?.message ?? 'Invalid input';
    return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
  }
  return handleGetJobDetails(parseResult.data);
}
```

---

## 4. Medium Issues

### 4.1 Module-Level Singleton Client Blocks Testability and Configuration

**File:** `src/handlers.ts:11`
**Severity:** Medium

```typescript
const client = new JobbyClient({ timeout: 30000 });
```

The client is instantiated at module load time with a hardcoded 30s timeout, no retry configuration, and no injection seam. Tests must mock the entire `jobby-client` module.

**Fix:** Accept a client factory or instance in `createServer`, defaulting to standard construction with retry enabled:

```typescript
export function createHandlers(client: JobbyClient = new JobbyClient({
  timeout: 30_000,
  retry: { maxRetries: 2, initialDelayMs: 1_000, maxDelayMs: 10_000 },
})) { ... }
```

### 4.2 `zod` Classified as `peerDependency` for a Binary Server

**File:** `package.json:47-49`
**Severity:** Medium (Deployment)

`peerDependencies` are for libraries that share instances with consumers. `jobby-mcp` is a server binary with no consumers. Global install or `npx` will not install Zod automatically.

**Fix:** Move `zod` to `dependencies`. Remove the `peerDependencies` section.

### 4.3 Documentation States the Wrong Default Timeout

**Files:** `src/handlers.ts:11`, `docs/setup.md:89`
**Severity:** Medium

`setup.md:89` states "The default timeout is 10 seconds" but the actual configured timeout is 30 seconds.

**Fix:** Update `setup.md:89` to "The default timeout is 30 seconds."

---

## 5. Code Quality Issues

### 5.1 `ToolResponse` Type Is Unexported and Duplicated

**Files:** `src/handlers.ts:14-17`, `src/server.test.ts:5-8`
**Severity:** Low

The handler defines a `ToolResponse` type that is never exported. The test file redeclares it with weaker types (`type: string` instead of `type: 'text'`, `isError?: boolean` instead of `isError?: true`).

**Fix:** Export `ToolResponse` from `handlers.ts` and import it in tests.

### 5.2 No Pagination Boundary Validation

**File:** `src/schemas.ts:36-38`
**Severity:** Low

`start`, `skip`, and `take` accept any number including negatives and non-integers.

**Fix:** Add `.int().min(0)` to `start`/`skip`, `.int().min(1).max(100)` to `take`.

### 5.3 Empty Strings Accepted for `keyword` and `location`

**File:** `src/schemas.ts:18-19`
**Severity:** Low

**Fix:** Add `.min(1)` to both.

### 5.4 `jobUrl` Not Validated as a URL

**File:** `src/schemas.ts:50`
**Severity:** Low

**Fix:** Use `z.string().url()`.

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

### 6.2 False Positive: `server.test.ts` Mock Has Inverted `JobbyError` Constructor

**File:** `src/server.test.ts:49-55, 272-273`
**Severity:** Medium

Mock defines `constructor(message, code)` but real class is `constructor(code, message, options)`. Tests pass coincidentally. `handlers.test.ts` correctly uses `importOriginal`.

**Fix:** Use the `importOriginal` pattern in `server.test.ts`.

### 6.3 `ZodError` Thrown Rather Than Returned as `isError` Response

**File:** `src/server.test.ts:264-268`
**Severity:** Low

Test documents a protocol violation (thrown exception) as expected behavior. After fixing 3.2, update to assert graceful error response.

### 6.4 Version Test Hardcodes `"1.0.0"`

**File:** `src/server.test.ts:107`
**Severity:** Low

The test name says "from package.json" but asserts a literal. When the version is bumped, the test fails misleadingly.

**Fix:** Dynamically read version from `package.json`.

### 6.5 No Integration Tests

**File:** `vitest.config.ts:5-12`
**Severity:** Low

The config declares an integration project but no integration test files exist. An integration test starting the server over stdio would have caught 3.1 immediately.

---

## 7. SOLID Principle Violations

### 7.1 Dependency Inversion — Handlers Depend on Concrete Client Class

**File:** `src/handlers.ts:1, 11`
**Severity:** Medium

Handlers import and instantiate `JobbyClient` directly. No DI seam exists. The fix in 4.1 resolves this.

### 7.2 Single Responsibility — `server.ts` Reads Package Metadata

**File:** `src/server.ts:9-10`
**Severity:** Informational

Minor SRP concern — could extract version reading to a utility.

---

## 8. MCP-Specific Recommendations

### 8.1 Tool Descriptions Should Enumerate Valid Enum Values

The current `search_jobs` description is generic. The AI benefits from seeing available filters and valid values inline in the description.

### 8.2 `get_job_details` Description Should State the Required-Identifier Constraint

Must state that at least one of `jobUrl` or `jobId` is required, and that `jobUrl` takes precedence. Directly related to 3.2.

### 8.3 Add a Root-Level `start:mcp` Orchestration Script

For parity with CLI convenience scripts in root `package.json`.

### 8.4 Include Version in Startup Log Message

`server.ts:69` should log `Jobby MCP server v${version} started.` for diagnostics.

---

## 9. Summary Table

| # | Issue | Severity | Category | Status |
|---|---|---|---|---|
| 3.1 | `main()` is never called — server silently exits | Critical | Runtime | Open |
| 3.2 | `get_job_details` schema/handler mismatch; ZodError escapes | Critical | MCP Protocol | Open |
| 4.1 | Module-level singleton client; no DI, no retry | Medium | Architecture | Open |
| 4.2 | `zod` as `peerDependency` — fails on global install | Medium | Deployment | Open |
| 4.3 | `setup.md` timeout wrong (says 10s, actual 30s) | Medium | Documentation | Open |
| 5.1 | `ToolResponse` unexported; duplicated with weaker types | Low | Code Quality | Open |
| 5.2 | Pagination accepts negatives and non-integers | Low | Validation | Open |
| 5.3 | Empty string accepted for keyword/location | Low | Validation | Open |
| 5.4 | `jobUrl` not validated as a URL | Low | Validation | Open |
| 5.5 | No retry configuration | Low | Resilience | Open |
| 6.2 | Mock `JobbyError` has inverted constructor args | Medium | Test Fidelity | Open |
| 6.3 | Test enshrines ZodError escape as expected behavior | Low | MCP Protocol | Open |
| 6.4 | Version test hardcodes `"1.0.0"` | Low | Test Quality | Open |
| 6.5 | No integration tests | Low | Testing | Open |
| 7.1 | Handlers depend on concrete `JobbyClient` | Medium | SOLID | Open |
| 8.1 | Tool descriptions should enumerate enum values | Recommendation | MCP UX | Open |
| 8.2 | `get_job_details` description needs constraint note | Recommendation | MCP UX | Open |
| 8.3 | Missing `start:mcp` root script | Recommendation | DX | Open |
| 8.4 | Startup log should include version | Recommendation | Observability | Open |

### Priority Recommendations

**P0 — Fix before any use (server non-functional):**
1. Create `src/bin.ts` calling `main()`, update `package.json` (3.1)

**P1 — Fix before first real-world use (protocol correctness):**
2. Update `get_job_details` description; use `safeParse` in handler (3.2)
3. Move `zod` to `dependencies` (4.2)

**P2 — Fix for robustness:**
4. Fix `server.test.ts` mock to use `importOriginal` pattern (6.2)
5. Add retry config; inject client as dependency (4.1, 5.5, 7.1)
6. Add `.int().min(0)` to pagination fields (5.2)
7. Add `.min(1)` to keyword/location (5.3)
8. Add `.url()` to jobUrl (5.4)
9. Update ZodError test to assert graceful response (6.3)
10. Fix version test to read dynamically (6.4)

**P3 — Polish:**
11. Correct `setup.md` timeout documentation (4.3)
12. Export `ToolResponse`; remove duplicate (5.1)
13. Improve tool descriptions (8.1, 8.2)
14. Add `start:mcp` to root `package.json` (8.3)
15. Add version to startup log (8.4)

---

*Report generated from analysis of all source files in `packages/jobby-mcp/src/`, the MCP TypeScript SDK (v1.26.0), Zod 3.x documentation, and `packages/jobby-client/` type and error definitions.*

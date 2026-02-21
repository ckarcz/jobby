# jobby-mcp Code Review Notes

> **Reviewed:** 2026-02-21
> **Scope:** All source and test files under `packages/jobby-mcp/src/`, `package.json`, and docs.
> **Reviewer:** Code Review Agent

---

## Critical Issues

### C1 - Binary entry point never calls `main()` - server never starts (Confidence: 100)

**Files:**
- `packages/jobby-mcp/package.json` line 11
- `packages/jobby-mcp/src/server.ts` lines 65-70

`package.json` declares:

```json
"bin": {
  "jobby-mcp": "./dist/server.js"
}
```

`dist/server.js` (compiled from `src/server.ts`) only _exports_ `createServer` and `main`. It never _invokes_ `main()`. When a user runs `npx jobby-mcp` or `jobby-mcp` (after global install), the process starts and exits immediately. The MCP server never connects to stdio transport. All Claude Desktop/Code configurations described in `docs/setup.md` are silently broken.

The same problem affects the `start` npm script: `tsx src/index.ts` re-exports from `server.js` but never calls `main()`.

**Fix:** Add a self-invocation guard at the bottom of `src/server.ts`:

```typescript
import { fileURLToPath } from 'node:url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    console.error('Fatal error starting jobby-mcp:', err);
    process.exit(1);
  });
}
```

Alternatively, move the invocation to a dedicated `src/bin.ts` that only calls `main()`, and point the `bin` field at `dist/bin.js`.

---

### C2 - Unhandled `ZodError` escapes the `get_job_details` tool handler (Confidence: 90)

**File:** `packages/jobby-mcp/src/server.ts` lines 50-53

```typescript
async (rawArgs) => {
  const args = JobDetailsInputSchema.parse(rawArgs);  // throws ZodError — not caught
  return handleGetJobDetails(args);
}
```

`JobDetailsInputSchema` has a `.refine()` constraint requiring at least one of `jobUrl` or `jobId`. When an AI calls `get_job_details` with neither field, `parse()` throws a `ZodError`. Nothing catches it. The MCP SDK receives an unhandled exception rather than a structured `{ isError: true }` tool response.

**Fix:** Wrap the `parse()` call inside the tool handler:

```typescript
async (rawArgs) => {
  try {
    const args = JobDetailsInputSchema.parse(rawArgs);
    return handleGetJobDetails(args);
  } catch (error: unknown) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${handleError(error)}` }],
      isError: true as const,
    };
  }
}
```

---

## Important Issues

### I1 - Dead code in `handleGetJobDetails` — the "neither field provided" branch is unreachable (Confidence: 88)

**File:** `packages/jobby-mcp/src/handlers.ts` lines 90-95

This branch is unreachable because `JobDetailsInputSchema.parse()` in `server.ts` throws before `handleGetJobDetails` is ever called with missing identifiers.

**Fix:** After fixing C2, remove the dead `else` branch. The missing-identifier error handling should live in the server tool handler's catch block.

### I2 - `setup.md` documents the wrong timeout value (Confidence: 95)

**Files:** `packages/jobby-mcp/docs/setup.md` line 89 vs `packages/jobby-mcp/src/handlers.ts` line 11

`setup.md` states: "The default timeout is 10 seconds." But `handlers.ts` creates the client with `timeout: 30000` (30 seconds).

**Fix:** Update `setup.md` to say "The default timeout is 30 seconds."

### I3 - `jobUrl` accepts any string — no URL format validation (Confidence: 85)

**File:** `packages/jobby-mcp/src/schemas.ts` line 50

Any string value passes validation and is forwarded directly to `client.jobs.queryForJobDetailsByUrl()`. The schema test comments say "validation happens in handler" — but no such validation exists.

**Fix:** Add `z.string().url().optional()` or a LinkedIn-specific regex.

### I4 - Pagination fields accept negative numbers (Confidence: 82)

**File:** `packages/jobby-mcp/src/schemas.ts` lines 36-38

Negative values pass schema validation and are forwarded to the client.

**Fix:** Add `.int().min(0)` constraints.

---

## Test Issues

### T1 - `server.test.ts` mock `JobbyError` has swapped constructor argument order (Confidence: 85)

**File:** `packages/jobby-mcp/src/server.test.ts` lines 49-55

The mock takes `(message, code)` but the real `JobbyError` takes `(code, message, options)`. Works coincidentally but is fragile.

**Fix:** Align the mock constructor with the real class.

### T2 - Test enshrines the broken exception-propagation behavior as expected (Confidence: 85)

**File:** `packages/jobby-mcp/src/server.test.ts` lines 264-268

The test verifies that an unhandled exception escapes the MCP tool handler — which is incorrect protocol behavior. Tool handlers should return `{ isError: true }` responses.

**Fix:** After fixing C2, update this test to assert a structured error response.

### T3 - `handlers.test.ts` tests the dead code path in `handleGetJobDetails` (Confidence: 85)

**File:** `packages/jobby-mcp/src/handlers.test.ts` lines 278-287

Tests call `handleGetJobDetails` directly (bypassing schema guard) to reach unreachable code. Gives false confidence.

**Fix:** Replace with tests that call through the full server handler.

### T4 - Version test hardcodes `"1.0.0"` instead of reading from `package.json` (Confidence: 80)

**File:** `packages/jobby-mcp/src/server.test.ts` line 107

**Fix:** Dynamically read the version from `package.json`.

---

## Summary Table

| ID | Severity | Confidence | File | Description |
|----|----------|------------|------|-------------|
| C1 | Critical | 100 | `server.ts`, `package.json` | `main()` is never called — server never starts as a binary |
| C2 | Critical | 90 | `server.ts:50-53` | `ZodError` from refine check propagates unhandled from `get_job_details` handler |
| I1 | Important | 88 | `handlers.ts:90-95` | Dead code branch — "neither field" path is unreachable at runtime |
| I2 | Important | 95 | `docs/setup.md:89` | Timeout documented as 10s but code uses 30s |
| I3 | Important | 85 | `schemas.ts:50` | `jobUrl` accepts any string — no URL format validation |
| I4 | Important | 82 | `schemas.ts:36-38` | Pagination fields accept negative numbers |
| T1 | Test | 85 | `server.test.ts:49-55` | Mock `JobbyError` has swapped constructor arg order vs. real class |
| T2 | Test | 85 | `server.test.ts:264-268` | Test enshrines unhandled-exception behavior as expected |
| T3 | Test | 85 | `handlers.test.ts:278-287` | Tests for dead code path give false assurance of error handling |
| T4 | Test | 80 | `server.test.ts:107` | Version test hardcodes `"1.0.0"` instead of reading dynamically |

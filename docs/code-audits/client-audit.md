# jobby-client Architecture Audit

> **Date:** 2026-02-21
> **Scope:** `packages/jobby-client/src/` — the core TypeScript client library for LinkedIn job search
> **Methodology:** Full source read of all 37 source and test files, cross-referenced against TypeScript, Zod, Axios, Cheerio, Winston, and Turndown documentation and best practices.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
   1. [Pragmatism Assessment](#11-pragmatism-assessment)
2. [What the Codebase Does Well](#2-what-the-codebase-does-well)
3. [Architecture Issues](#3-architecture-issues)
4. [Code Quality Issues](#4-code-quality-issues)
5. [Test Analysis](#5-test-analysis)
6. [SOLID Principle Violations](#6-solid-principle-violations)
7. [Dependency Analysis](#7-dependency-analysis)
8. [Recommendations Summary](#8-recommendations-summary)

---

## 1. Executive Summary

`jobby-client` is a well-architected TypeScript library for scraping LinkedIn's undocumented guest job search API. The overall code quality is high: there is strong separation of concerns, thorough JSDoc coverage, a clean error hierarchy, Zod-powered validation, proper retry logic with exponential backoff, and an excellent test suite. The library is genuinely production-ready for its use case.

The issues identified are real but mostly in the medium-to-low severity range. There is no critical flaw that makes the library incorrect or dangerous. The most actionable improvements are in the **HTTP layer** (axios is invoked on the global instance rather than a shared `AxiosInstance` with pre-configured defaults), **config resolution** (`resolveConfig` is called twice on the same logical request path for the `byId` query variants, creating redundant Winston logger instantiation), and **type precision** (many response fields typed as `string | undefined` even when structurally guaranteed by the parser, and a subtle inconsistency between `Job` and `JobDetails` field widening).

**Key findings:**
- **No critical issues** — no correctness bugs, security vulnerabilities, or data corruption paths found
- **4 medium issues** — double `resolveConfig` on `byId` paths, no shared `AxiosInstance`, overly wide `Job.id`/`Job.url` types, private non-exported `JobsResource` with duplicate retry wrapping
- **Several low issues** — raw config retained after resolution, dead barrel export, 602-line god file, abandoned `random-useragent` dependency
- **Test suite is strong** — genuine behaviour tests with real HTML fixtures, no false positives found; one timing-dependent test is a flake risk; `mergeJobDetailsData` merge contract only implicitly covered

---

## 1.1 Pragmatism Assessment

Not every recommendation deserves equal effort. The table below classifies every open item in this audit so you can triage accordingly.

| Rating | Meaning |
|---|---|
| **Pragmatic** | Worth doing. Common practice in real projects. |
| **Nice-to-have** | Technically sound but most projects skip this. Do it if you're already in the file. |
| **Over-engineered** | Adds complexity without proportional benefit at this project scale. Included for completeness. |

### Recommendations (Section 8 — open items only)

| # | Item | Rating | Notes |
|---|---|---|---|
| 3 | Simplify verbose null guards | **Pragmatic** | Straightforward cleanup, fewer lines. |
| 6 | Direct test for `mergeJobDetailsData` | **Pragmatic** | Closes an implicit-only coverage gap. **FIXED** — exported with `@internal` JSDoc and direct tests added. |
| 9 | Replace `random-useragent` | **Won't fix** | Accepted risk — no CVEs, trivially simple dep, not worth replacing. |
| 11 | Slim `Logger` interface | **Over-engineered** | YAGNI — one logging impl, not worth abstracting further. |
| 12 | Split `job-details-query.ts` | **Nice-to-have** | 600 lines of cohesive code; split when naturally adding features. |
| 13 | Make `createTurndownService` injectable | **Over-engineered** | One consumer, no test benefit. |
| 15 | Export `JobsResource` / `IJobsResource` | **Nice-to-have** | Only matters if external consumers need to mock it. |
| 16 | Narrow `Job.id` / `Job.url` types | **Nice-to-have** | Correct observation, marginal practical impact. |

### SOLID observations (Section 6)

| Section | Observation | Rating | Notes |
|---|---|---|---|
| 6.2 | OCP — 5-6 files to add a param | **Over-engineered** | This is the natural shape of a type-safe API client, not an OCP violation. Making it "open for extension" would add abstraction for zero practical benefit. |
| 6.3 | ISP — Logger interface | **Over-engineered** | Same rationale as item 11. |

### Test coverage gaps (Section 5.3 — open items only)

| # | Gap | Rating | Notes |
|---|---|---|---|
| 2 | `parseSalaryText` European formats | **Nice-to-have** | LinkedIn returns US-locale data; speculative unless going international. |
| 4 | `validatePagination` all-three-invalid | **Over-engineered** | Combinatorial test completionism; individual field validation already tested. |
| 6 | Integration tests bypass client | **Nice-to-have** | Narrow gap already covered by unit tests. |

---

## 2. What the Codebase Does Well

### 2.1 Clean Error Hierarchy with Retryability Metadata

`src/types/errors.ts` defines a four-class hierarchy (`JobbyError` -> `RateLimitError`, `NetworkError`, `ParsingError`, `ValidationError`) where each subclass carries `retryable: boolean` and `isOperational: boolean`. `RateLimitError` additionally carries `retryAfter: number | undefined`. The `withRetry` function uses `instanceof JobbyError && error.retryable` as its gate, meaning new retryable errors can be added without changing retry logic. The `JobbyError.from(unknown)` static factory wraps non-Jobby errors into non-operational, non-retryable instances, giving callers a uniform catch type.

### 2.2 Zod Schema Strategy Derived from Mapping Constants

The `params-schemas.ts` / `normalize.ts` split is clean. Schemas are derived from the same `as const` mapping objects that drive the actual API URL building (`JOB_TYPE_MAPPING`, etc.), so there is a single source of truth. The `zodEnumFromMap` helper is a clever piece of generic typing that produces properly-inferred `ZodEnum` from a `ParamMap` without manually duplicating key lists.

### 2.3 Dual-Source Parsing with Principled Merge

`job-details-query.ts` implements a principled "JSON-LD first, DOM scraping as fallback and supplement" strategy. Both parsers return the same `ParsedJobDetailsData` flat intermediate type, then `mergeJobDetailsData` performs a field-by-field primary-wins merge. New fields added to `ParsedJobDetailsData` get merged automatically without a manual merge line.

### 2.4 Fluent Builder with Proper Defensive Copies

`JobSearchBuilder` returns `this` from each `with*` method for chaining and returns shallow copies from `getSearchParams()` / `getPaginationParams()` so callers cannot mutate the builder's internal state.

### 2.5 Retry Logic with Exponential Backoff and Rate Limit Header Awareness

`src/utils/retry.ts:withRetry` correctly implements `min(initialDelayMs * 2^attempt, maxDelayMs)` and overrides the computed delay with `retryAfter * 1000` when a `RateLimitError` carries a `retryAfter` header value. The `maxRetries: 0` default means retries are opt-in.

### 2.6 Integration Test Infrastructure Using a Real Local HTTP Server

The integration test setup creates a real Node.js `http.Server` on a random port and serves real fixture HTML files, exercising the complete pipeline without touching LinkedIn's servers.

### 2.7 Config Resolution with Environment Variable Precedence

`src/config.ts:resolveConfig` implements a clean three-tier precedence: `explicit config > env vars > defaults`.

### 2.8 JSDoc Coverage

Nearly every public function, interface, and class has JSDoc with `@param`, `@returns`, and `@throws` documentation. The `@example` blocks on `JobbyClient` and `JobsResource` methods are useful for discoverability.

### 2.9 Header Separation by Request Type

`createRequestHeaders` and `createDetailsRequestHeaders` correctly produce different `Accept` headers for the XHR-style job search endpoint vs. the full-page job details endpoint.

---

## 3. Architecture Issues

### 3.1 Critical Issues

None. No correctness bugs, security vulnerabilities, or data corruption paths were found.

---

### 3.2 Medium Issues

#### 3.2.1 `resolveConfig` Called Twice on `byId` Variants — **FIXED**

**File:** `src/queries/job-details-query.ts:118` and `src/queries/job-details-query.ts:139`
**Status: FIXED** — All query functions now accept `ResolvedClientConfig` instead of raw `ClientConfig`. Config is resolved once at `JobbyClient` construction time and passed through the entire call chain. The redundant `resolveConfig()` calls in all query functions have been removed.

#### 3.2.2 No Shared `AxiosInstance`; Global Module State Used Per Request — **FIXED**

**Files:** `src/queries/jobs-query.ts:91`, `src/queries/job-details-query.ts:73`
**Status: FIXED** — Added `axiosInstance: AxiosInstance` to `ResolvedClientConfig`. `resolveConfig()` now creates a shared `axios.create({ timeout })` instance. All query functions use `config.axiosInstance.get(...)` instead of the global `axios.get(...)`. This enables interceptor injection and simplifies test mocking.

#### 3.2.3 `Job.id` and `Job.url` Typed `string | undefined` Despite Parser Guarantees

**File:** `src/types/responses.ts:44-54`

`parseJobs` only returns records where `position && company` are non-null. Every consumer must defensively null-check `job.id` and `job.url` even though they are always present on valid parsed records.

**Fix:** Define a `ValidJob` type with narrowed `id: string` and `url: string`, or use a branded type pattern.

#### 3.2.4 `JobsResource` is Private, Non-Exported, and Duplicates Retry Wrapping

**File:** `src/client.ts:10-102`

`JobsResource` is instantiated only once per `JobbyClient` but is not exported, so consumers cannot type-check against `client.jobs`. Its retry wrapping pattern is identical to `JobSearchBuilder.execute`, creating two maintenance sites.

**Fix:** Export `JobsResource` (or an `IJobsResource` interface). Consider consolidating retry wrapping.

---

### 3.3 Low Issues

#### 3.3.1 Raw `ClientConfig` Retained After Resolution — **FIXED**

**File:** `src/client.ts:141-152`
**Status: FIXED** — Removed the raw `this.config` field from `JobbyClient`. `JobsResource` now stores `ResolvedClientConfig` directly. Config is resolved once at construction and passed through the internal call chain. `ResolvedClientConfig` removed from public exports (it's an internal type).

#### 3.3.2 `queries/index.ts` Dead Barrel — **FIXED**

**File:** `src/queries/index.ts`
**Status: FIXED** — Deleted dead `queries/index.ts` barrel file.

#### 3.3.3 `job-details-query.ts` is a 602-Line God File

**File:** `src/queries/job-details-query.ts`

Combines HTTP transport, JSON-LD extraction, 25 DOM scraping functions, salary parsing, and response assembly. Natural split boundaries exist:

```
src/queries/job-details-query.ts     (HTTP, validation, orchestration)
src/parsers/job-details-jsonld.ts    (extractJsonLd, parseJsonLdToJobDetailsData)
src/parsers/job-details-scraper.ts   (all scrape* DOM functions)
src/parsers/salary.ts               (parseSalaryText, formatSalaryDisplay, extractSalary)
```

#### 3.3.4 `html.ts` Exports `createTurndownService` While Using Module-Level Singleton

The export suggests a reusable factory but `htmlToMarkdown` uses the singleton. Misleading duality.

#### 3.3.5 Winston Logger Properties Leaked Through `Logger` Interface

`level: string` and `silent: boolean` are Winston-specific properties in the `Logger` interface.

#### 3.3.6 `extractCriteriaValue` Does Not Short-Circuit on Match — **FIXED**

**Status: FIXED** — Added `return false;` after match in `.each()` loop to short-circuit, plus explicit `return;` on non-match path for TypeScript compliance.

#### 3.3.7 `parseJobs` Uses Overly Broad `$('li')` Selector

Should use `$('li.base-card')` or `$('li[data-entity-urn]')` for precision.

#### 3.3.8 `appendStringParam` Truthy Check Drops `'0'` — **FIXED**

**File:** `src/queries/jobs-query.ts:251-255`
**Status: FIXED** — Changed `if (value)` to `if (value !== undefined)` in `jobs-query.ts:252`. Slightly different from recommendation (uses `!== undefined` rather than also checking `!== ''`), which is appropriate since empty strings may be valid in some contexts.

---

## 4. Code Quality Issues

### 4.1 `mergeJobDetailsData` Uses `any` Cast

**File:** `src/queries/job-details-query.ts:215`

Well-documented with eslint-disable comment. A narrower `as never` cast is possible but not critical.

### 4.2 Verbose Null Guards in `scrapeShortDescription` / `scrapeSharingImageUrl`

**File:** `src/queries/job-details-query.ts:501-516`

6 unnecessary lines — could be single-line `return ... || undefined`.

### 4.3 `DEFAULT_CLIENT_CONFIG` Export is Incomplete

**File:** `src/config.ts:55-58`

Only covers `baseUrl` and `timeout`. Retry defaults live in `DEFAULT_RETRY_CONFIG` (not exported from public barrel). Consumers see an incomplete picture.

---

## 5. Test Analysis

### 5.1 Overall Assessment

The test suite is genuinely strong with no false positives. Tests verify real behaviour using inline HTML fixtures.

| File | Tests | Quality |
|---|---|---|
| `errors.test.ts` | 28 | Excellent |
| `params.test.ts` | 18 | Good |
| `config.test.ts` | 15 | Excellent |
| `logging.test.ts` | 12 | Good |
| `client.test.ts` | 15 | Good |
| `job-search-builder.test.ts` | 28 | Excellent |
| `jobs-query.test.ts` | 65+ | Excellent |
| `job-details-query.test.ts` | 110+ | Excellent |
| `http.test.ts` | 18 | Good |
| `url.test.ts` | 30 | Good |
| `retry.test.ts` | 12 | Excellent |
| `html.test.ts` | 25 | Good |
| `delay.test.ts` | 2 | Adequate |
| `normalize.test.ts` | 28 | Excellent |
| **Integration** | 12 | Excellent |

### 5.2 False Positives

None found.

### 5.3 Coverage Gaps

1. ~~**`mergeJobDetailsData` merge contract not directly tested** — only implicitly covered via higher-level tests~~ **FIXED** — Exported with `@internal` JSDoc, direct unit tests added (primary wins, fallback used, both undefined)
2. **`parseSalaryText` not tested with European numeric formats** (comma as decimal separator)
3. ~~**Timing-dependent test** in `logging.test.ts` uses fixed 200ms `setTimeout` — flake risk~~ **FIXED** — Replaced `setTimeout(resolve, 200)` with `vi.waitFor()` for reliable async assertions
4. **`validatePagination`** not tested with all three fields invalid simultaneously (trivial gap)
5. ~~**`logging.test.ts:52-55`** tests assert `logger.http`/`logger.silly` — methods not in the `Logger` interface (tests Winston internals)~~ **FIXED** — Removed assertions on Winston-internal `logger.http` and `logger.silly` methods
6. **Integration search tests** bypass the client, only validate fixture server (per code review agent)

---

## 6. SOLID Principle Violations

### 6.1 Single Responsibility

`job-details-query.ts` has five responsibilities (HTTP, validation, JSON-LD, DOM scraping, salary parsing, response assembly).

### 6.2 Open/Closed

Adding a new search parameter requires changes in 5-6 files. Mostly unavoidable given the LinkedIn API mapping nature.

### 6.3 Interface Segregation

`Logger` interface includes Winston-specific `level` and `silent` properties.

### 6.4 Dependency Inversion

Query functions accept `ClientConfig` and resolve internally. The resolution concern belongs at the client boundary.

---

## 7. Dependency Analysis

| Package | Version | Assessment |
|---|---|---|
| `axios` | `^1.7.0` | Current. See 3.2.2 for `AxiosInstance` concern. |
| `cheerio` | `^1.0.0` | Current. Correct tool. |
| `random-useragent` | `^0.5.0` | Abandoned since 2019. No CVEs. **Won't fix** — accepted risk; trivially simple dependency. |
| `turndown` | `^7.2.2` | Current. Maintained. |
| `winston` | `^3.19.0` | Current. Heavy for a library. Consider if `onLog` callback suffices. |
| `zod` | `^3.25 \|\| ^4.0` | Excellent — dual version range. Future-proof. |

---

## 8. Recommendations Summary

### Phase 1 — Quick Wins (no API changes)

1. ~~Fix `extractCriteriaValue` early-exit and `toLowerCase()` caching~~ **DONE** (early-exit added; `toLowerCase()` caching not addressed)
2. ~~Fix `appendStringParam` truthy check~~ **DONE**
3. Simplify `scrapeShortDescription` / `scrapeSharingImageUrl` verbose guards
4. ~~Delete `queries/index.ts` dead barrel~~ **DONE**
5. ~~Fix timing-dependent test in `logging.test.ts` (use `vi.waitFor`)~~ **DONE**
6. ~~Add direct unit test for `mergeJobDetailsData` merge contract~~ **DONE**
7. ~~Remove `logger.http`/`logger.silly` assertions from `logging.test.ts`~~ **DONE**

### Phase 2 — Architecture Improvements (internal)

8. ~~Fix double `resolveConfig` on `byId` variants~~ **DONE**
9. ~~Replace `random-useragent` with inline curated User-Agent list~~ **Won't fix** — accepted risk (no CVEs, trivially simple)
10. ~~Introduce shared `AxiosInstance` in query functions~~ **DONE**
11. Slim `Logger` interface to remove Winston-specific properties

### Phase 3 — Refactoring (internal)

12. Split `job-details-query.ts` into parser modules
13. Make `createTurndownService` injectable into `htmlToMarkdown`
14. ~~Resolve config once at construction, pass `ResolvedClientConfig` to query functions~~ **DONE**

### Phase 4 — Public API Changes (semver minor or major)

15. Export `JobsResource` or an `IJobsResource` interface
16. Narrow `Job.id` and `Job.url` to `string` on valid parsed records

---

*Report generated from full source read of `packages/jobby-client/src/` (37 files, ~3,200 lines) and `packages/jobby-client/tests/integration/` (3 files).*

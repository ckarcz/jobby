# TypeScript Expert Audit

> **Date:** 2026-02-22
> **Scope:** Full monorepo — `packages/jobby-client/`, `packages/jobby-cli/`, `packages/jobby-mcp/`
> **Methodology:** Comprehensive analysis of every TypeScript feature used (or missing) across all source files, cross-referenced against the TypeScript 5.x handbook, utility type reference, and modern TypeScript best practices (TS 5.0–5.9). tsconfig, ESLint TypeScript rules, Zod integration, and module system configuration are all in scope.

### Pragmatism Note

Every recommendation in this audit is tagged with a pragmatism rating:
- **Pragmatic** — Common practice in real Node.js/TS projects. Worth doing.
- **Nice-to-have** — Technically sound, but most projects skip it. Do it opportunistically.
- **Uncommon in practice** — Textbook-correct but rarely done in real-world projects of this size. Included for completeness, not as an action item.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Config Resolution: `Partial<T>` + Defaults Pattern](#2-config-resolution-partialt--defaults-pattern)
3. [Utility Type Opportunities](#3-utility-type-opportunities)
4. [Type Safety Improvements](#4-type-safety-improvements)
5. [Modern TypeScript Features Not Yet Leveraged](#5-modern-typescript-features-not-yet-leveraged)
6. [Zod–TypeScript Integration](#6-zodtypescript-integration)
7. [Enum & Const Patterns](#7-enum--const-patterns)
8. [Module & Export Hygiene](#8-module--export-hygiene)
9. [Class & OOP Patterns](#9-class--oop-patterns)
10. [State Management Typing (CLI)](#10-state-management-typing-cli)
11. [Compiler & Tooling Configuration](#11-compiler--tooling-configuration)
12. [Summary Matrix](#12-summary-matrix)

---

## 1. Executive Summary

This is an exceptionally well-typed TypeScript monorepo. The codebase demonstrates strong adherence to modern TypeScript practices: `as const` objects over enums, `import type` everywhere, `unknown` in catch clauses, discriminated unions for state actions, Zod-inferred types, and strict compiler settings. The ESLint configuration is aggressive and appropriate.

The most impactful improvement is **replacing the hand-rolled `Config` / `ResolvedConfig` dual-interface pattern with `Partial<T>` + a const default + a generic merge helper** — this is a common TypeScript pattern that eliminates real interface duplication. Beyond that, `satisfies` and the `asNonEmpty` helper are small wins that reduce casting.

**Key findings:**
- **1 high-impact structural improvement** — Config/ResolvedConfig can be unified with `Partial<T>` + defaults (Pragmatic)
- **2 medium improvements** — `satisfies` for const validation, `asNonEmpty` helper for Zod enum casts (Pragmatic)
- **1 medium fix** — Eliminate `as unknown as` unsafe cast in builder constructor (Pragmatic)
- **Several nice-to-haves** — Exhaustive `never` in reducer, `ErrorCode` enum consistency, minor cleanup
- **No TypeScript anti-patterns** — the codebase avoids `any`, uses type guards over casting, and maintains strict mode throughout
- **Intentionally excluded** — Advanced type gymnastics (`Extract`, `Exclude`, branded types, `NoInfer`, template literal types) that add complexity without improving readability. KISS over cleverness.

---

## 2. Config Resolution: `Partial<T>` + Defaults Pattern

### 2.1 Current Pattern

The codebase defines parallel interface pairs where the "input" version has all-optional fields and the "resolved" version has all-required fields:

```
ClientConfig (all optional)  →  resolveConfig()  →  ResolvedClientConfig (all required)
RetryConfig  (all optional)  →  resolveRetryConfig()  →  ResolvedRetryConfig  (all required)
LoggingConfig (all optional) →  createLogger()  →  Logger (different shape entirely)
```

**Files affected:**
- `jobby-client/src/config.ts:7-54` — `ClientConfig` + `ResolvedClientConfig`
- `jobby-client/src/utils/retry.ts:5-19` — `RetryConfig` + `ResolvedRetryConfig`
- `jobby-client/src/logging.ts:18-66` — `LoggingConfig` + `Logger`

### 2.2 The Problem — **Pragmatic**

For `RetryConfig` / `ResolvedRetryConfig`, the two interfaces are **structurally identical** except that the resolved version has no `?` modifiers. This is exactly what `Required<T>` does — the `ResolvedRetryConfig` interface is redundant. This pattern (`Partial<Config>` for inputs, full type for resolved) is widely used in the Node.js ecosystem (e.g., webpack config, ESLint config, Vite config).

For `ClientConfig` / `ResolvedClientConfig`, the resolved version differs structurally (it adds `axiosInstance` and `logger`, and resolves `userAgent` from `string | (() => string)` to `string`). This means `Required<ClientConfig>` alone won't work — keeping the separate resolved interface is justified here.

### 2.3 Recommended Pattern — **Pragmatic**

#### For simple cases (RetryConfig):

```typescript
// Single interface — the resolved/complete shape
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

// Default values as a const satisfying the full type
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 0,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
} as const satisfies RetryConfig;

// Input type derived automatically
export type RetryConfigInput = Partial<RetryConfig>;

// Resolution is now a spread
export function resolveRetryConfig(config?: RetryConfigInput): RetryConfig {
  return { ...DEFAULT_RETRY_CONFIG, ...config };
}
```

**Benefits:**
- Single source of truth for the config shape
- `Partial<T>` auto-generates the optional version — no manual `?` annotations
- Adding a new field requires changing only the interface and the default — the input type updates automatically
- This is the standard pattern used by most TS config libraries

#### For complex cases (ClientConfig):

When the resolved type differs structurally from the input (e.g., factory functions resolved to strings, derived objects like `Logger`), the separate `ResolvedClientConfig` interface is justified. No change needed there.

### 2.4 Generic Config Merge Utility — **Nice-to-have**

A reusable utility that handles `undefined` override values correctly:

```typescript
export function resolveWithDefaults<T extends Record<string, unknown>>(
  defaults: T,
  overrides?: Partial<T>,
): T {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    if (overrides[key] !== undefined) {
      result[key] = overrides[key] as T[keyof T];
    }
  }
  return result;
}
```

This is more correct than a simple spread `{ ...defaults, ...overrides }` because it preserves defaults when the override is `undefined` (respecting `exactOptionalPropertyTypes`). However, a plain spread works fine if callers only pass defined values — which is the case today. The utility becomes worthwhile if you have 3+ config types using this pattern.

---

## 3. Utility Type Opportunities

### 3.1 `Required<T>` — Eliminate ResolvedRetryConfig — **Pragmatic**

| Location | Current | Recommended |
|---|---|---|
| `retry.ts:15-19` | `interface ResolvedRetryConfig { ... }` | Eliminate entirely — make `RetryConfig` the complete type, use `Partial<RetryConfig>` for input |

The remaining utility types (`Readonly<T>`, `Pick<T, K>`, `Extract<T, U>`, `Exclude<T, U>`, etc.) are available but not needed here. Using them would add type-level complexity without improving readability or catching real bugs at this project scale.

---

## 4. Type Safety Improvements

### 4.1 Non-Null Assertion Elimination — **Nice-to-have**

Two `!` assertions exist:

| Location | Code | Fix |
|---|---|---|
| `params.ts:7` | `config[key]!` | Return type is already `string` for `ParamMap` — the `!` is needed because `noUncheckedIndexedAccess` makes the lookup `string | undefined`, but the key is guaranteed valid. An eslint-disable comment already documents this. |
| `filterTypes.ts:96-101` | Syntax issue | The function body has a dangling `return {` before the real `const section = ...` — needs a code fix regardless. |

The `params.ts:7` assertion is justified and documented. Not worth over-engineering a workaround.

### 4.2 Type Casting Reduction — **Mixed**

| Location | Current | Assessment |
|---|---|---|
| `job-search-builder.ts:42` | `config as unknown as ResolvedClientConfig` | **Pragmatic** to fix — this is an unsafe cast that bypasses all type checking. See Section 9.2. |
| `filterTypes.ts:84-88` | `JOB_TYPE_CHOICES as string[]` (x5) | **Nice-to-have** — the cast is needed because `readonly JobType[]` is not assignable to `string[]`. The current cast is localized and harmless. |
| `schemas.ts:21-33` | `JOB_TYPE_CHOICES as [JobType, ...JobType[]]` (x5) | **Pragmatic** — This is repetitive. A small helper eliminates all five casts: |

```typescript
function asNonEmpty<T>(arr: readonly T[]): [T, ...T[]] {
  if (arr.length === 0) throw new Error('Expected non-empty array');
  return arr as [T, ...T[]];
}

// Usage — all five casts become clean calls
z.enum(asNonEmpty(JOB_TYPE_CHOICES))
```

This is a common pattern in Zod codebases. The non-empty tuple cast is a known Zod ergonomic issue and helpers like this are standard.

### 4.3 Exhaustive Switch with `never` — **Nice-to-have**

The reducer at `cli/src/ui/state/reducer.ts:26-112` handles all `AppAction` cases but has no `default: never` exhaustiveness check:

```typescript
default: {
  const _exhaustive: never = action;
  return _exhaustive;
}
```

The ESLint rule `@typescript-eslint/switch-exhaustiveness-check` is already enabled and should catch this. If the rule is configured to only warn on missing cases (not require a default), adding the `never` guard is a belt-and-suspenders safety net. Worth doing when you're in the file, but the ESLint rule is the real protection.

---

## 5. Modern TypeScript Features Not Yet Leveraged

### 5.1 `satisfies` Operator (TS 4.9+) — **Pragmatic**

The `satisfies` operator validates that an expression conforms to a type without widening it. This is increasingly common in real projects:

| Location | Current | With `satisfies` |
|---|---|---|
| `retry.ts:21-25` | `DEFAULT_RETRY_CONFIG: ResolvedRetryConfig = { ... }` | `DEFAULT_RETRY_CONFIG = { ... } as const satisfies RetryConfig` |
| `config.ts:57-60` | `DEFAULT_CLIENT_CONFIG = { ... } as const` | `DEFAULT_CLIENT_CONFIG = { ... } as const satisfies Partial<...>` |

The main win is on `DEFAULT_RETRY_CONFIG` — currently typed with `: ResolvedRetryConfig` which widens literal values. With `satisfies`, you get validation AND preserved literal types.

For `emptyFilters` and `initialState`, the current `: Type` annotation is fine — `satisfies` adds no practical benefit there since you don't need the literal types preserved.

Other modern TS features (`NoInfer<T>`, `using`, const type parameters) are either not ready for mainstream Node.js adoption or solve problems this codebase doesn't have. Not recommended.

---

## 6. Zod–TypeScript Integration

### 6.1 Current State — Excellent

The Zod integration is well-done:
- `z.infer<typeof Schema>` used correctly in `handlers.ts:37,66`
- `z.output<typeof Schema>` used correctly for transformed types in `normalize.ts:48,51`
- `zodEnumFromMap` in `params-schemas.ts:16` is a clever generic that derives proper Zod enum types from const mapping objects
- `.safeParse()` used consistently (never `.parse()` which throws)
- `.describe()` on MCP schemas provides AI-readable documentation
- `.refine()` for cross-field validation on `JobDetailsInputSchema`

No changes needed. This is how Zod should be used.

### 6.2 Single-Source Schema Derivation — **Nice-to-have**

The MCP schemas in `schemas.ts` duplicate the structure of `JobSearchParams` and `PaginationParams`. Sharing schemas between packages would eliminate this duplication, but requires exporting internal Zod schemas from `jobby-client`'s public API — a reasonable trade-off to avoid. The current approach of separate schemas is fine for package isolation.

### 6.3 Type-Safe Error Formatting — **Nice-to-have**

The `toValidationError` function in `normalize.ts:36-45` accesses `issue.values` with a cast. Using `z.ZodIssueCode.invalid_enum_value` for narrowing would be cleaner, but the current code works and is a few lines in one file.

---

## 7. Enum & Const Patterns

### 7.1 Current State — Near-Perfect

The codebase uses `as const` objects + `keyof typeof` for all domain values — this is the modern TypeScript best practice. No changes needed for the mapping objects.

### 7.2 Convert ErrorCode Enum to Const Object — **Nice-to-have**

`ErrorCode` in `errors.ts:2-7` is the only TypeScript `enum` in the codebase. Converting it to `as const` + type derivation would be consistent with the rest of the codebase, but:
- It's a breaking change for consumers using `ErrorCode.RATE_LIMIT` (syntax changes from enum member access to object property access — actually identical at runtime for string enums)
- The tree-shaking argument is theoretical for a Node.js library (no bundler in the server path)
- The enum works correctly

Do it for consistency if you're doing a major version bump. Otherwise, leave it.

### 7.3 `readonly` on CHOICES Arrays — **Nice-to-have**

Making `JOB_TYPE_CHOICES` etc. `readonly` would prevent accidental mutation and could eliminate some downstream casts. Low effort, but also low urgency since nobody is mutating these arrays.

---

## 8. Module & Export Hygiene

### 8.1 `import type` — Consistent

All type-only imports use `import type` consistently. The `verbatimModuleSyntax: true` compiler option enforces this. No issues.

### 8.2 Internal Types Correctly Hidden

`ResolvedClientConfig` and `ResolvedRetryConfig` are not exported from the public API. Correct.

### 8.3 Barrel Export Consolidation — **Nice-to-have**

Two separate export lines from `./utils/index.js` could be merged into one. Purely cosmetic.

---

## 9. Class & OOP Patterns

### 9.1 Error Class Hierarchy — Well-Done

No changes needed. Proper `public readonly`, `Error.captureStackTrace`, static factory, per-subclass `this.name`.

### 9.2 Builder Constructor Unsafe Cast — **Pragmatic**

The `JobSearchBuilder` constructor has:

```typescript
this.resolvedConfig = retryConfig !== undefined
  ? (config as unknown as ResolvedClientConfig)  // bypasses all type checking
  : resolveConfig(config);
```

This exists because the builder is called externally with `ClientConfig` and internally with `ResolvedClientConfig`. The `as unknown as` cast is the worst kind of cast — it turns off the compiler completely for this path.

**Fix with overloads:**

```typescript
constructor(config?: ClientConfig);
constructor(config: ResolvedClientConfig, retryConfig: ResolvedRetryConfig);
constructor(config?: ClientConfig | ResolvedClientConfig, retryConfig?: ResolvedRetryConfig) {
  if (retryConfig !== undefined) {
    this.resolvedConfig = config as ResolvedClientConfig;
    this.retryConfig = retryConfig;
  } else {
    this.resolvedConfig = resolveConfig(config as ClientConfig | undefined);
    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }
}
```

Still has a cast in the implementation, but the overloads make the two calling conventions type-safe at all call sites. This is a standard TypeScript pattern for constructors with multiple valid signatures.

---

## 10. State Management Typing (CLI)

### 10.1 Discriminated Union Actions — Excellent

The `AppAction` type in `types.ts:44-63` is a textbook discriminated union. No changes needed.

### 10.2 Context Splitting — Good Architecture

The CLI splits state into domain-specific contexts. This prevents unnecessary re-renders. No changes needed.

The inline action definitions are clear and readable as-is. No changes needed.

---

## 11. Compiler & Tooling Configuration

### 11.1 tsconfig — Excellent

**TypeScript version:** 5.9.3 (latest stable)
**Target:** ES2022 (appropriate for Node.js 20+)
**Module:** NodeNext (correct for ESM-first with workspace packages)

All critical strict options are enabled. The redundant individual strict options alongside `strict: true` are harmless (explicit > implicit). No changes needed.

### 11.2 ESLint TypeScript Rules — Aggressive and Appropriate

Key rules like `no-explicit-any`, `explicit-function-return-type`, `consistent-type-imports`, and `switch-exhaustiveness-check` are all enabled. This is a well-tuned ruleset.

### 11.3 DOM Library Inclusion — **Nice-to-have**

The base `tsconfig` includes `"lib": ["ES2022", "DOM"]`. `DOM` is only needed by `jobby-cli` (React/Ink). Moving it to the CLI's local tsconfig would avoid DOM types in the client and MCP packages, but the practical impact is negligible — it just means `document` and `window` types exist in scope without being used.

---

## 12. Summary Matrix

| # | Finding | Pragmatism | Effort | Files |
|---|---|---|---|---|
| 2.3 | Replace `ResolvedRetryConfig` with `Partial<RetryConfig>` + defaults | **Pragmatic** | Low | `retry.ts` | **FIXED** |
| 5.1 | Use `satisfies` on `DEFAULT_RETRY_CONFIG` and `DEFAULT_CLIENT_CONFIG` | **Pragmatic** | Low | `retry.ts`, `config.ts` | **FIXED** |
| 4.2 | Create `asNonEmpty<T>` helper for Zod enum arrays | **Pragmatic** | Trivial | `schemas.ts` | **FIXED** |
| 9.2 | Eliminate `as unknown as` cast via constructor overloads | **Pragmatic** | Low | `job-search-builder.ts` |
| 4.3 | Add `default: never` exhaustiveness check to reducer | **Nice-to-have** | Trivial | `reducer.ts` |
| 7.2 | Convert `ErrorCode` enum to const object | **Nice-to-have** | Low | `errors.ts` |
| 7.3 | `readonly` on CHOICES arrays | **Nice-to-have** | Trivial | `params.ts` |
| 6.3 | Type-safe Zod error narrowing in `toValidationError` | **Nice-to-have** | Trivial | `normalize.ts` |
| 11.3 | Move DOM lib to CLI-only tsconfig | **Nice-to-have** | Trivial | tsconfig files |
| 8.3 | Consolidate duplicate barrel export lines | **Nice-to-have** | Trivial | `index.ts` |

---

## Appendix A: TypeScript Feature Checklist

| Feature | Used | Assessment |
|---|---|---|
| `interface` for object shapes | Yes | Consistent, correct |
| `type` for unions/aliases | Yes | Consistent, correct |
| Generics `<T>` | Yes | Appropriate where used |
| `Partial<T>` | Yes | **FIXED** — Used for `RetryConfigInput` and `DEFAULT_CLIENT_CONFIG` |
| `Required<T>` | No | Could use to eliminate ResolvedRetryConfig (**Pragmatic**) |
| `Readonly<T>` | Partial | `readonly` on class props is the standard level. Wrapping interfaces in `Readonly<T>` adds noise for little benefit. |
| `Pick/Omit/Extract/Exclude` | No | Not needed. Would add type-level complexity without improving readability. |
| `Record<K, V>` | Yes | Used correctly |
| `ReturnType<T>` / `Parameters<T>` | No | Not needed (explicit interfaces are more readable) |
| `NonNullable<T>` / `NoInfer<T>` | No | Not needed |
| Discriminated unions | Yes | Excellent usage |
| Type guards (`is`) | Yes | Correct usage |
| `as const` | Yes | Consistent on all mapping objects |
| `satisfies` | Yes | **FIXED** — Used on `DEFAULT_RETRY_CONFIG` and `DEFAULT_CLIENT_CONFIG` |
| Branded types | No | Not needed — method names (`ById`/`ByUrl`) are sufficient. Branded types add complexity for marginal safety. |
| `never` for exhaustiveness | Partial | Used as return type; ESLint rule covers reducer |
| `unknown` in catch | Yes | Consistent and correct |
| `import type` | Yes | Enforced by compiler and ESLint |
| `enum` | 1 instance | Works fine, convert for consistency if desired |
| `as` type casting | Minimal | One unsafe cast worth fixing (builder) |
| `!` non-null assertion | 2 instances | Justified and documented |
| `any` | 0 instances | Excellent |
| Function overloads | No | Would benefit builder constructor |
| `override` keyword | Yes | Used correctly |
| `using` / Decorators | No | Not needed |

## Appendix B: References

- [TypeScript Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- [TypeScript 5.4 — NoInfer](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html)
- [TypeScript 4.9 — satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- [Effective TypeScript — 2025 Year in Review](https://effectivetypescript.com/2025/12/19/ts-2025/)

# Architecture

## Monorepo Structure

This project uses npm workspaces to manage three packages:

```
jobby/
└── packages/
    ├── jobby-client/   # Core library
    ├── jobby-cli/      # CLI tool
    └── jobby-mcp/      # MCP server
```

## Package Dependencies

```
jobby-cli  ──► jobby-client
jobby-mcp  ──► jobby-client
```

Both `jobby-cli` and `jobby-mcp` depend on `jobby-client` as their core library. The client library has no internal dependencies on other packages.

## Client Library (`jobby-client`)

The core package that handles all LinkedIn job querying. It is structured into layers:

- **Client & builders** — Public API surface (`JobbyClient`, fluent `JobSearchBuilder`).
- **Queries** — Fetch, parse, and normalize raw HTML from LinkedIn's guest API into typed response objects.
- **Types** — Parameter maps, Zod validation schemas, response interfaces, and the error class hierarchy.
- **Utilities** — HTTP helpers, user-agent rotation, URL construction, HTML-to-text conversion, and request delay with jitter.

**Key design decisions:**

- **Parameter maps** translate user-friendly values (e.g., `'full-time'`) to LinkedIn API values (e.g., `'F'`). Zod validates the user-facing keys.
- **Dual extraction** from JSON-LD structured data (priority) and HTML DOM scraping (fallback) for job details. Search results use DOM scraping only.
- **Error hierarchy** with `JobbyError` base class. Errors carry an `ErrorCode`, `isOperational` flag, and `retryable` indicator.
- **User-agent rotation** via `random-useragent` to avoid blocking.

## CLI (`jobby-cli`)

A Commander.js-based CLI that wraps the client library:

- **Commands** — `search`, `details`, and `ui` (interactive TUI).
- **Formatter registry** — Pluggable output formatters (JSON, XML, YAML, CSV, raw HTML) registered at startup.
- **TUI** — An Ink/React-based interactive terminal UI with search, pagination, detail browsing, and a filter editor.
- **Utilities** — Output writing with syntax highlighting (via `cli-highlight`), stdin reading, argument parsing, and error formatting.

**Key design decisions:**

- **Formatter registry** allows dynamic output format selection. Formatters are registered explicitly at startup rather than as barrel import side effects.
- **Stdin support** for piped input (e.g., `echo "React" | jobby search`).
- **File output** via `--file` flag as an alternative to stdout.
- **Presentation dependencies** like `cli-highlight` and `chalk` live only in this package, not in the client library.

## MCP Server (`jobby-mcp`)

A minimal wrapper that exposes the client library as MCP tools.

Registers two tools (`search_jobs`, `get_job_details`) with Zod input schemas and connects via stdio transport.

## TypeScript Configuration

The base `tsconfig.base.json` enables strict settings:

- `strict: true`
- `exactOptionalPropertyTypes: true` — distinguishes `undefined` from missing
- `noUncheckedIndexedAccess: true` — index access returns `T | undefined`
- Target: ES2022, Module: NodeNext

Each package extends the base config and specifies its own `outDir` and `rootDir`.

## Testing

Vitest is configured at the root with two test projects:

- **Unit tests**: `packages/*/src/**/*.test.ts` (30s timeout)
- **Integration tests**: `packages/*/tests/integration/**/*.test.ts` (60s timeout)

Coverage uses the v8 provider and excludes test files and barrel exports.

# Development Guide

## Prerequisites

- Node.js >= 22.0.0
- npm

## Setup

```bash
git clone <repo-url>
cd jobby
npm install
```

npm workspaces will install dependencies for all packages and link internal dependencies automatically.

## Building

```bash
# Build all packages
npm run build

# Build a specific package
npm run build -w packages/jobby-client
npm run build -w packages/jobby-cli
npm run build -w packages/jobby-mcp
```

Build order matters: `jobby-client` must be built before `jobby-cli` or `jobby-mcp`.

## Cleaning

```bash
# Clean all packages (removes dist/ directories)
npm run clean
```

## Linting

```bash
# Lint all packages
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

ESLint is configured with TypeScript support and enforces:
- `consistent-type-definitions: interface` (prefer `interface` over `type` for object shapes)
- Standard TypeScript strict rules

## Testing

```bash
# Run all unit tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests with coverage UI
npm run test:coverage:ui
```

Integration tests make real HTTP requests to LinkedIn and may be slower or rate-limited.

## Project Structure

```
jobby/
├── packages/
│   ├── jobby-client/   # Core library (no deps on other packages)
│   ├── jobby-cli/      # CLI (depends on client)
│   └── jobby-mcp/      # MCP server (depends on client)
├── docs/                       # Root documentation
├── package.json                # Workspace root
├── tsconfig.base.json          # Shared TypeScript config
├── eslint.config.js            # Shared ESLint config
└── vitest.config.ts            # Shared test config
```

## Adding a New Package

1. Create a new directory under `packages/`
2. Add a `package.json` with `"type": "module"`
3. Create a `tsconfig.json` that extends `../../tsconfig.base.json`
4. The workspace root will automatically pick it up via the `packages/*` glob

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LINKEDIN_JOBS_BASE_URL` | Override the LinkedIn base URL |
| `LINKEDIN_JOBS_TIMEOUT` | Override the default HTTP timeout (ms) |
| `NO_COLOR` | Disable colored CLI output |
| `FORCE_COLOR` | Force colored CLI output |

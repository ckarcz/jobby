# LinkedIn Job Search Monorepo

## Background
- A TypeScript monorepo for programmatically searching LinkedIn job listings. Whether you're building your own application, searching from the terminal, or using an AI agent — this project provides a clean interface to LinkedIn's undocumented guest job search API.
- See README.md for more information on background and more links to other docs

## Architecture
- Monorepo: 3 packages under `packages/` using npm workspaces
- `jobby-client` - Core TypeScript client library (axios, cheerio, zod)
- `jobby-cli` - CLI tool (commander) that wraps the client
- `jobby-mcp` - MCP server for Claude integration
- See docs\architecture.md for more information on architecture

## Conventions
- Follow existing project conventions and standards. This project tries to follow common place NodeJS project configuration, convention, and standards and practices.
- ESM only (`"type": "module"`)
- You must follow the configured eslint and tsconfig rules.
- Unit tests `*.test.ts` are located next to source files. Unit tests have their own vitest project named `unit`. 
- Integration tests are located under /tests/ folder. Integration tests have their own vitest project named `integration`.
- Don't use unicode/ascii codes. Use emojis, glyphs, and characters directly.
- Check for obvious typos in strings, variables, and type and method names. If you find words that are clearly typos alert the user and ask if you should fix them. Suggest using a local dictionary file of allowed words if seemingly typos are confirmed not typos by the user.

## Development
- Always install packages and libraries that are compatible with each other. Never directly edit the lock files. Never force install packages, libraries, or dependencies. Packages that are only needed for development should be installed as development only packages. Always make sure packages installed work with the environment we are developing in (Node version, Typescript version, etc).
- If there are package vulnerability warnings. Try to see if updating packages is possible and if so, do it. Otherwise alert the user about the vulnerable package issue.
- Asynchronously check if installed packages are needed and being used. If not alert the user of the unncessary package and recommended removing it.
- Asynchronously check if installed packages are outdated. If so updated them if the updates are compatible, safe, and are LTS. Alert the user if you are unsure.
- After finishing development, always asynchronously run and check the build, unit tests, and the linter. Always run all three. In parallel.
- See docs\development.md on more important about development

## NPM Scripts

### How Scripts Are Structured
- The root `package.json` defines **orchestration scripts** that delegate to workspace packages.
- Each workspace package defines its own **local scripts** for building, linting, testing, etc.
- Root uses two delegation patterns:
  - `--workspaces` flag: Runs the same script name in **all** workspace packages (e.g., `npm run build --workspaces` runs `build` in client, cli, and mcp).
  - `-w <package-name>` flag: Runs a script in a **specific** workspace package (e.g., `npm run start -w jobby-cli` runs `start` only in the CLI package).
- Test scripts (`test:unit`, `test:integration`, `test:coverage`) run **vitest directly** from the root using vitest project filters (`--project unit` / `--project integration`), which discovers and runs tests across all packages in a single vitest process.

### Root Scripts

| Script | Command | Description |
|---|---|---|
| `clean` | `npm run clean --workspaces` | Runs `clean` in all packages (removes `dist/`, `coverage/`, `*.tsbuildinfo`) |
| `build` | `npm run build --workspaces` | Runs `build` (tsc) in all packages |
| `lint` | `npm run lint --workspaces` | Runs ESLint check in all packages |
| `lint:fix` | `npm run lint:fix --workspaces` | Runs ESLint with auto-fix in all packages |
| `test` | `npm run test:unit` | Alias for `test:unit` |
| `test:unit` | `vitest run --project unit` | Runs all unit tests across all packages |
| `test:integration` | `vitest run --project integration` | Runs all integration tests |
| `test:coverage` | `vitest run --project unit --coverage` | Runs unit tests with code coverage report |
| `test:coverage:ui` | `vitest --ui --project unit --coverage.enabled` | Opens vitest UI with coverage in the browser |
| `start:cli` | delegates to `jobby-cli` → `start` | Starts the CLI via tsx |
| `start:cli:ui` | delegates to `jobby-cli` → `start:ui` | Starts the interactive TUI mode |
| `start:cli:search` | delegates to `jobby-cli` → `start:search` | Runs a sample search (`"C#" --pretty`) |
| `start:cli:details` | delegates to `jobby-cli` → `start:details` | Fetches sample job details (`4368607271 --pretty`) |
| `watch:cli` | delegates to `jobby-cli` → `watch` | File-watch mode for CLI |
| `watch:cli:ui` | delegates to `jobby-cli` → `watch:ui` | File-watch mode for TUI |
| `watch:cli:search` | delegates to `jobby-cli` → `watch:search` | File-watch mode for sample search |
| `watch:cli:details` | delegates to `jobby-cli` → `watch:details` | File-watch mode for sample details |

### Common Package Scripts (all 3 packages share these)

| Script | Command | Description |
|---|---|---|
| `clean` | `rimraf dist coverage --glob *.tsbuildinfo` | Removes build artifacts, coverage output, and tsc incremental files |
| `build` | `tsc` | Compiles TypeScript to `dist/` |
| `lint` | `eslint src` | Runs ESLint on source files |
| `lint:fix` | `eslint src --fix` | Runs ESLint with auto-fix on source files |
| `test` | `npm run test:unit` | Alias for `test:unit` |
| `test:unit` | `vitest run --project unit` | Runs unit tests for this package |
| `test:integration` | `vitest run --project integration` | Runs integration tests for this package |
| `test:coverage` | `vitest run --project unit --coverage` | Runs unit tests with coverage for this package |
| `test:coverage:ui` | `vitest --project unit --ui --coverage.enabled` | Opens vitest UI with coverage for this package |

### Package-Specific Scripts

#### `jobby-client`
| Script | Command | Description |
|---|---|---|
| `start:example` | `tsx src/example.ts` | Runs an example usage script demonstrating the client API |

#### `jobby-cli`
| Script | Command | Description |
|---|---|---|
| `start` | `tsx src/bin.ts` | Starts the CLI (shows help) |
| `start:ui` | `tsx src/bin.ts ui` | Starts the interactive TUI (Ink-based terminal UI) |
| `start:search` | `tsx src/bin.ts search "C#" --pretty` | Runs a sample job search with pretty output |
| `start:details` | `tsx src/bin.ts details 4368607271 --pretty` | Fetches and displays a sample job's details |
| `start:example` | `tsx src/bin.ts search --keyword C# --take 1` | Runs a minimal example search (1 result) |
| `watch` | `tsx watch src/bin.ts` | File-watch mode: re-runs CLI on source changes |
| `watch:ui` | `tsx watch src/bin.ts ui` | File-watch mode: re-runs TUI on source changes |
| `watch:search` | `tsx watch src/bin.ts search C# --pretty` | File-watch mode: re-runs sample search on source changes |
| `watch:details` | `tsx watch src/bin.ts details 4368607271 --pretty` | File-watch mode: re-runs sample details on source changes |

#### `jobby-mcp`
| Script | Command | Description |
|---|---|---|
| `start` | `tsx src/index.ts` | Starts the MCP server (stdio transport for Claude integration) |

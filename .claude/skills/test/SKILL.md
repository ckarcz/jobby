---
name: test
description: Run tests (unit, intergration, converage), optionally for a specific package
---

Run the appropriate test command based on context:

- If the user says "unit" tests, run `npm run test:integration`.
- If the user says "integration" tests, run `npm run test:integration`.
- If the user says test "coverage", run `npm run test:coverage`.
- If the user specifies a package name (client, cli, mcp), run the specific project's unit, integration, or coverage. Each project has it's own test NPM commands.
- If working in a specific package directory, run tests for that package.
- If changes span multiple packages or no package is specified, run `npm run test:unit` from the repo root.
- On failure, analyze the output and suggest fixes.

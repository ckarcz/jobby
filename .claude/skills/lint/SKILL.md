---
name: lint
description: Lint (eslint check or fix), optionally for a specific package
---

Run the appropriate lint command based on context:

- By default, run `npm run lint` to check for issues.
- If the user says "fix", run `npm run lint:fix` instead.
- If the user specifies a package name (client, cli, mcp), run the specific project's lint. Each project has its own lint NPM commands.
- If working in a specific package directory, lint that package.
- If changes span multiple packages or no package is specified, run `npm run lint` from the repo root.
- On failure, analyze the eslint output and suggest fixes.

---
name: build
description: Build (compile typescript), optionally for a specific package
---

Run the appropriate build command based on context:

- If the user specifies a package name (client, cli, mcp), run the specific project's build. Each project has its own build NPM commands.
- If working in a specific package directory, build that package.
- If changes span multiple packages or no package is specified, run `npm run build` from the repo root.
- To clean before building, run `npm run clean` first.
- On failure, analyze the typescript compiler output and suggest fixes.

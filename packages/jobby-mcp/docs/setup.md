# Setup Guide

The MCP server communicates via stdio transport. Configure your MCP client to launch `jobby-mcp` as a subprocess.

## Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jobby": {
      "command": "npx",
      "args": ["jobby-mcp"]
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "jobby": {
      "command": "jobby-mcp"
    }
  }
}
```

## Claude Code

Add to your Claude Code MCP settings (`.claude/settings.json` or project settings):

```json
{
  "mcpServers": {
    "jobby": {
      "command": "npx",
      "args": ["jobby-mcp"]
    }
  }
}
```

## Running from the Monorepo

If you've cloned the monorepo and built the packages, point to the built file directly:

```json
{
  "mcpServers": {
    "jobby": {
      "command": "node",
      "args": ["path/to/jobby/packages/jobby-mcp/dist/bin.js"]
    }
  }
}
```

## Verifying the Setup

Once configured, your AI assistant should have access to two tools:

1. **`search_jobs`** - Search for LinkedIn job postings with filters
2. **`get_job_details`** - Get detailed information about a specific job

Try asking: "Search for remote software engineer jobs in New York"

## Troubleshooting

### Server not starting

- Ensure Node.js >= 22.0.0 is installed
- Run `npm run build` in the monorepo root if using a local build
- Check that `jobby-mcp` is accessible in your PATH (if installed globally)

### No results returned

- LinkedIn may rate-limit requests. Try again after a short wait.
- Verify your search parameters are valid (see [Tools Reference](./tools.md) for allowed values).

### Timeout errors

The default timeout is 30 seconds. If you're experiencing timeouts, the server inherits its timeout from the client library defaults.

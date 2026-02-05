# jobby-mcp

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes LinkedIn job search as tools for AI assistants like Claude.

## Installation

```bash
npm install -g jobby-mcp
```

Or run directly from the monorepo:

```bash
npm run build
npx jobby-mcp
```

Requires Node.js >= 22.0.0.

## Quick Start

### Claude Desktop / Claude Code

Add to your MCP configuration:

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

Once configured, you can ask your AI assistant:

> "Search for remote TypeScript developer jobs in San Francisco"

> "Get details for LinkedIn job 4195018826"

### Example Result

When the assistant calls `search_jobs`, it receives:

```json
{
  "results": [
    {
      "id": "4195018826",
      "url": "https://www.linkedin.com/jobs/view/4195018826",
      "summary": {
        "position": "Senior TypeScript Developer",
        "location": "San Francisco, CA (Remote)",
        "company": {
          "name": "Acme Corp",
          "slug": "acme-corp",
          "pageUrl": "https://www.linkedin.com/company/acme-corp",
          "logoUrl": "https://media.licdn.com/dms/image/..."
        },
        "salary": "$150,000 - $200,000/yr",
        "highlight": "Actively Hiring +3 benefits",
        "isNew": true,
        "easyApply": true
      },
      "posted": {
        "date": "2025-01-15",
        "ago": "2 days ago"
      }
    }
  ],
  "pagination": {
    "start": 0,
    "responseCount": 25,
    "resultsCount": 25
  }
}
```

## Documentation

- [Tools Reference](./docs/tools.md) - Available MCP tools and their parameters
- [Setup Guide](./docs/setup.md) - Configuration for different MCP clients

## Keeping Up with API Changes

The MCP server's tool parameters and response shapes depend on the underlying client library, which interfaces with LinkedIn's undocumented guest API. When the API changes, the client library is updated first, then MCP tool schemas and response formatting are updated to match. See the [API analysis process](../jobby-client/docs/analysis.md) for how changes are detected and propagated.

## License

[MIT](../../LICENSE)

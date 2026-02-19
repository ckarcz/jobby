#!/usr/bin/env node

import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SearchInputSchema, JobDetailsBaseSchema, JobDetailsInputSchema } from './schemas.js';
import { handleSearchJobs, handleGetJobDetails } from './handlers.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

/**
 * Create and configure the Jobby MCP server.
 *
 * Instantiates an {@link McpServer}, registers the `search_jobs` and
 * `get_job_details` tools with their schemas and handlers, and returns the
 * ready-to-connect server instance.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'jobby-mcp',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.registerTool(
    'search_jobs',
    {
      description: 'Search for jobs on LinkedIn with various filters. Returns a list of job postings matching the criteria.',
      inputSchema: SearchInputSchema.shape,
    },
    async (rawArgs) => {
      const args = SearchInputSchema.parse(rawArgs);
      return handleSearchJobs(args);
    }
  );

  server.registerTool(
    'get_job_details',
    {
      description: 'Get detailed information about a specific job posting by URL or job ID.',
      inputSchema: JobDetailsBaseSchema.shape,
    },
    async (rawArgs) => {
      const args = JobDetailsInputSchema.parse(rawArgs);
      return handleGetJobDetails(args);
    }
  );

  return server;
}

/**
 * Start the MCP server using stdio transport.
 *
 * Creates the server via {@link createServer}, connects it to a
 * {@link StdioServerTransport}, and logs a ready message to stderr.
 */
export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jobby MCP server started.');
}

// Guard against running main() when this file is imported as a module (e.g.
// in tests). Unlike main.ts, server.ts is designed to be importable, so we
// check whether this file is the Node.js entry point before auto-invoking.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  void main();
}

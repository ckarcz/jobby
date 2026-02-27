import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JobbyClient } from 'jobby-client';
import { SearchInputSchema, JobDetailsBaseSchema, JobDetailsInputSchema } from './schemas.js';
import { handleSearchJobs, handleGetJobDetails } from './handlers.js';
import packageJson from '../package.json' with { type: 'json' };

/**
 * Create and configure the Jobby MCP server.
 *
 * Instantiates an {@link McpServer}, registers the `search_jobs` and
 * `get_job_details` tools with their schemas and handlers, and returns the
 * ready-to-connect server instance.
 */
export function createServer(client?: JobbyClient): McpServer {
  const resolvedClient = client ?? new JobbyClient({
    timeout: 30_000,
    retry: {
      maxRetries: 2,
      initialDelayMs: 1_000,
      maxDelayMs: 10_000,
    },
  });

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
      const parsed = SearchInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return {
          content: [{ type: 'text' as const, text: `Error: Invalid input: ${parsed.error.issues.map(i => i.message).join(', ')}` }],
          isError: true,
        };
      }
      return handleSearchJobs(parsed.data, resolvedClient);
    }
  );

  server.registerTool(
    'get_job_details',
    {
      description: 'Get detailed information about a specific job posting. Requires at least one of jobUrl or jobId.',
      inputSchema: JobDetailsBaseSchema.shape,
    },
    async (rawArgs) => {
      const parsed = JobDetailsInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return {
          content: [{ type: 'text' as const, text: `Error: Invalid input: ${parsed.error.issues.map(i => i.message).join(', ')}` }],
          isError: true,
        };
      }
      return handleGetJobDetails(parsed.data, resolvedClient);
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
  console.error(`Jobby MCP server v${packageJson.version} started.`);
}
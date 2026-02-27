import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..', '..');

/**
 * Integration tests for the Jobby MCP server.
 *
 * Spawns the actual MCP server as a child process via stdio transport,
 * performs a full initialization handshake using the MCP SDK client,
 * and verifies that the server advertises the expected tools.
 *
 * This test would have caught the "server never starts" bug immediately
 * since a broken entry point would fail the initialization handshake.
 */

let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/bin.ts'],
    cwd: packageRoot,
    stderr: 'pipe',
  });

  client = new Client(
    { name: 'jobby-mcp-integration-test', version: '1.0.0' },
    { capabilities: {} },
  );

  // connect() automatically calls start() on the transport, spawns the
  // child process, sends the initialize request, waits for the server's
  // response, and sends the initialized notification.
  await client.connect(transport);
});

afterAll(async () => {
  await client?.close();
  await transport?.close();
});

describe('MCP server stdio integration', () => {
  it('should complete initialization and report server info', () => {
    const serverVersion = client.getServerVersion();

    expect(serverVersion).toBeDefined();
    expect(serverVersion!.name).toBe('jobby-mcp');
    expect(serverVersion!.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should advertise tools capability', () => {
    const capabilities = client.getServerCapabilities();

    expect(capabilities).toBeDefined();
    expect(capabilities!.tools).toBeDefined();
  });

  it('should list the search_jobs tool', async () => {
    const { tools } = await client.listTools();

    const searchTool = tools.find((t) => t.name === 'search_jobs');
    expect(searchTool).toBeDefined();
    expect(searchTool!.description).toContain('Search');
    expect(searchTool!.inputSchema).toBeDefined();
    expect(searchTool!.inputSchema.type).toBe('object');
  });

  it('should list the get_job_details tool', async () => {
    const { tools } = await client.listTools();

    const detailsTool = tools.find((t) => t.name === 'get_job_details');
    expect(detailsTool).toBeDefined();
    expect(detailsTool!.description).toContain('job');
    expect(detailsTool!.inputSchema).toBeDefined();
    expect(detailsTool!.inputSchema.type).toBe('object');
  });

  it('should list exactly 2 tools', async () => {
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(2);

    const toolNames = tools.map((t) => t.name).sort();
    expect(toolNames).toEqual(['get_job_details', 'search_jobs']);
  });

  it('should respond to ping', async () => {
    const result = await client.ping();

    expect(result).toBeDefined();
  });

  it('search_jobs tool should have expected input properties', async () => {
    const { tools } = await client.listTools();
    const searchTool = tools.find((t) => t.name === 'search_jobs');

    expect(searchTool).toBeDefined();
    const props = searchTool!.inputSchema.properties ?? {};

    // Verify key input parameters are declared in the schema
    expect(props).toHaveProperty('keyword');
    expect(props).toHaveProperty('location');
    expect(props).toHaveProperty('jobType');
    expect(props).toHaveProperty('experienceLevel');
    expect(props).toHaveProperty('take');
  });

  it('get_job_details tool should have expected input properties', async () => {
    const { tools } = await client.listTools();
    const detailsTool = tools.find((t) => t.name === 'get_job_details');

    expect(detailsTool).toBeDefined();
    const props = detailsTool!.inputSchema.properties ?? {};

    // Verify the two identifier properties are declared
    expect(props).toHaveProperty('jobUrl');
    expect(props).toHaveProperty('jobId');
  });
});
